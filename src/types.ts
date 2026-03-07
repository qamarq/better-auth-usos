export interface UsosAuthPluginOptions {
  usosBaseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  scopes?: string;
  redirectPath?: string;
  onSuccess?: (user: any) => Promise<string> | string;
}

export interface UsosUserProfile {
  id: string;
  first_name: string;
  last_name: string;
  student_number: string | null;
  email: string | null;
  photo_urls?: {
    "50x50"?: string;
    "100x100"?: string;
  };
}

export interface UsosOAuthState {
  token: string;
  secret: string;
}

export interface UsosAccessToken {
  token: string | null;
  secret: string | null;
}

export interface UsosRequestToken {
  token: string | null;
  secret: string | null;
  authorizeUrl: string | null;
}
