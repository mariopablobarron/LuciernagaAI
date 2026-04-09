// Google OAuth helpers — bridges into existing mw_session auth system

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

type GoogleProfile = {
  id: string;
  email: string;
  name: string;
  picture: string | null;
};

export function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ??
    `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/api/auth/google/callback`;

  return { clientId, clientSecret, redirectUri, enabled: Boolean(clientId && clientSecret) };
}

export function getGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleConfig();
  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<string> {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google token exchange failed: ${res.status} ${body}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function getGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Google userinfo failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture ?? null,
  };
}
