import type { BetterAuthClientPlugin } from "better-auth/client";

import type { usosAuth } from "./index";

export function usosAuthClient() {
  return {
    id: "usos-auth",
    $InferServerPlugin: {} as ReturnType<typeof usosAuth>,
    getActions: () => ({
      signIn: {
        usos: async (options?: { callbackURL?: string; newTab?: boolean }) => {
          const url = `/usos/login`;

          if (typeof window !== "undefined") {
            if (options?.newTab) {
              window.open(url, "_blank");
              return { url };
            }

            if (options?.callbackURL) {
              window.location.href = `${url}?callbackURL=${encodeURIComponent(options.callbackURL)}`;
            } else {
              window.location.href = url;
            }
          }

          return { url };
        },
      },
    }),
  } satisfies BetterAuthClientPlugin;
}
