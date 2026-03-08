import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import CryptoJS, { HmacSHA1 } from "crypto-js";
import OAuth from "oauth-1.0a";
import { z } from "zod";

import type {
  UsosAccessToken,
  UsosAuthPluginOptions,
  UsosAuthUser,
  UsosOAuthState,
  UsosRequestToken,
  UsosUserProfile,
} from "./types";

export * from "./types";

function createHmacSha1Base64(baseString: string, key: string) {
  const hmac: CryptoJS.lib.WordArray = HmacSHA1(baseString, key);
  return CryptoJS.enc.Base64.stringify(hmac);
}

function removeMultipleSlashesFromUrl(url: string) {
  return url.replaceAll(/([^:]\/)\/+/g, "$1");
}

async function getUsosRequestToken(
  oauth: OAuth,
  usosBaseUrl: string,
  callbackUrl: string,
  scopes: string,
): Promise<UsosRequestToken> {
  const data = oauth.authorize({
    url: `${usosBaseUrl}/services/oauth/request_token`,
    method: "POST",
    data: {
      oauth_callback: removeMultipleSlashesFromUrl(callbackUrl),
      scopes,
    },
  });

  const response = await fetch(
    `${usosBaseUrl}/services/oauth/request_token?${new URLSearchParams(
      Object.entries(data),
    ).toString()}`,
    {
      method: "POST",
      headers: { Authorization: oauth.toHeader(data).Authorization },
    },
  );
  const parameters = new URLSearchParams(await response.text());

  const token = parameters.get("oauth_token");

  return {
    token,
    secret: parameters.get("oauth_token_secret"),
    authorizeUrl: token
      ? `${usosBaseUrl}/services/oauth/authorize?oauth_token=${token}`
      : null,
  };
}

async function getUsosAccessToken(
  oauth: OAuth,
  usosBaseUrl: string,
  oauthToken: string,
  oauthVerifier: string,
  secret: string,
): Promise<UsosAccessToken> {
  const data = oauth.authorize(
    {
      url: `${usosBaseUrl}/services/oauth/access_token`,
      method: "POST",
      data: { oauth_token: oauthToken, oauth_verifier: oauthVerifier },
    },
    { key: oauthToken, secret },
  );

  const response = await fetch(
    `${usosBaseUrl}/services/oauth/access_token?${new URLSearchParams(Object.entries(data)).toString()}`,
    {
      method: "POST",
      headers: { Authorization: oauth.toHeader(data).Authorization },
    },
  );
  const text = await response.text();
  const parameters = new URLSearchParams(text);

  return {
    token: parameters.get("oauth_token"),
    secret: parameters.get("oauth_token_secret"),
  };
}

async function getUsosUserProfile(
  oauth: OAuth,
  usosBaseUrl: string,
  accessToken: string,
  accessSecret: string,
): Promise<UsosUserProfile | null> {
  const url = `${usosBaseUrl}/services/users/user`;
  const requestData = {
    url,
    method: "GET" as const,
    data: { fields: "id|first_name|last_name|student_number|email|photo_urls" },
  };

  const token = { key: accessToken, secret: accessSecret };

  const authData = oauth.authorize(requestData, token);

  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(authData)) {
    parameters.append(key, String(value));
  }
  parameters.append(
    "fields",
    "id|first_name|last_name|student_number|email|photo_urls",
  );

  const response = await fetch(`${url}?${parameters.toString()}`, {
    method: "GET",
    headers: { Authorization: oauth.toHeader(authData).Authorization },
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<UsosUserProfile>;
}

export function usosAuth<T extends Record<string, any> = {}>(
  options: UsosAuthPluginOptions<T>,
) {
  const {
    usosBaseUrl,
    consumerKey,
    consumerSecret,
    scopes = "studies|offline_access",
    emailDomain,
    userFields,
    onSuccess,
  } = options;

  if (!usosBaseUrl || !consumerKey || !consumerSecret || !emailDomain) {
    throw new Error(
      "usosAuth plugin requires usosBaseUrl, consumerKey, consumerSecret, and emailDomain options",
    );
  }

  const redirectPath = "/usos/callback";

  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return createHmacSha1Base64(baseString, key);
    },
  });

  return {
    id: "usos-auth",
    endpoints: {
      usosLogin: createAuthEndpoint(
        "/usos/login",
        {
          method: "GET",
        },
        async (ctx) => {
          const callbackUrl = `${ctx.context.baseURL}${redirectPath}`;
          const { token, secret, authorizeUrl } = await getUsosRequestToken(
            oauth,
            usosBaseUrl,
            callbackUrl,
            scopes,
          );

          if (!token || !secret || !authorizeUrl) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Failed to get request token",
            });
          }

          await ctx.setSignedCookie(
            "usos_oauth_state",
            JSON.stringify({ token, secret }),
            ctx.context.secret,
            {
              maxAge: 60 * 10,
              path: "/",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            },
          );

          return ctx.redirect(authorizeUrl);
        },
      ),
      usosCallback: createAuthEndpoint(
        redirectPath,
        {
          method: "GET",
          query: z.object({
            oauth_token: z.string(),
            oauth_verifier: z.string(),
          }),
        },
        async (ctx) => {
          const { oauth_token, oauth_verifier } = ctx.query;

          const stateCookie = await ctx.getSignedCookie(
            "usos_oauth_state",
            ctx.context.secret,
          );

          if (!stateCookie) {
            throw new APIError("BAD_REQUEST", {
              message: "Missing OAuth state",
            });
          }

          const state = JSON.parse(stateCookie) as UsosOAuthState;

          if (state.token !== oauth_token) {
            throw new APIError("BAD_REQUEST", {
              message: "Invalid OAuth token",
            });
          }

          const { token: accessToken, secret: accessSecret } =
            await getUsosAccessToken(
              oauth,
              usosBaseUrl,
              oauth_token,
              oauth_verifier,
              state.secret,
            );

          if (!accessToken || !accessSecret) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Failed to get access token",
            });
          }

          const usosUser = await getUsosUserProfile(
            oauth,
            usosBaseUrl,
            accessToken,
            accessSecret,
          );

          if (!usosUser) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Failed to get user profile",
            });
          }

          const email =
            usosUser.email ?? `${usosUser.student_number}@${emailDomain}`;

          const customFields = userFields ? userFields(usosUser) : ({} as T);

          const existingUser =
            await ctx.context.internalAdapter.findUserByEmail(email);

          let user;
          if (!existingUser) {
            user = await ctx.context.internalAdapter.createUser({
              email,
              emailVerified: true,
              name: `${usosUser.first_name} ${usosUser.last_name}`,
              image: usosUser.photo_urls?.["50x50"] ?? null,
              ...customFields,
            });
          } else {
            user = await ctx.context.internalAdapter.updateUser(
              existingUser.user.id,
              {
                email,
                emailVerified: true,
                name: `${usosUser.first_name} ${usosUser.last_name}`,
                image: usosUser.photo_urls?.["50x50"] ?? null,
                ...customFields,
              },
            );
          }

          const session = await ctx.context.internalAdapter.createSession(
            user.id,
          );

          await setSessionCookie(ctx, {
            session,
            user,
          });

          const redirectUrl = onSuccess
            ? await Promise.resolve(onSuccess(user as UsosAuthUser & T))
            : "/";
          return ctx.redirect(redirectUrl);
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
