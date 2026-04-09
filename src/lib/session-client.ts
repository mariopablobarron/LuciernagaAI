export type BrowserSessionUser = {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
  phone: string | null;
  role: string;
  plan: string;
  planLabel: string;
  subscriptionStatus: string;
  hasPlan: boolean;
  isAnonymous: boolean;
  emailVerified: boolean;
  messagesUsedToday: number;
  messagesRemainingToday: number | null;
  messageLimitPerDay: number | null;
};

export type BrowserSessionBootstrap = {
  ok: boolean;
  userId?: string;
  source?: string;
  error?: string;
  message?: string;
};

export type BrowserSessionSnapshot = {
  success: boolean;
  authenticated: boolean;
  userId?: string;
  source?: string;
  token?: string;
  user?: BrowserSessionUser;
  error?: string;
};

export type BrowserLoginResult = BrowserSessionSnapshot;
export type BrowserCaptureEmailResult = BrowserSessionSnapshot & {
  previousSessionId?: string;
  futureAuthReady?: boolean;
};

async function parseJson<T>(response: Response): Promise<Partial<T>> {
  return (await response.json().catch(() => ({}))) as Partial<T>;
}

export async function bootstrapBrowserSession(): Promise<BrowserSessionBootstrap> {
  const response = await fetch("/api/auth/bootstrap", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJson<BrowserSessionBootstrap>(response);
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || payload.message || "No se pudo iniciar la sesion.");
  }

  return {
    ok: true,
    userId: payload.userId,
    source: payload.source,
  };
}

export async function fetchBrowserSession(): Promise<BrowserSessionSnapshot> {
  const response = await fetch("/api/auth/token", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJson<BrowserSessionSnapshot>(response);
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "No se pudo validar la sesion.");
  }

  return {
    success: true,
    authenticated: Boolean(payload.authenticated),
    userId: payload.userId,
    source: payload.source,
    token: payload.token,
    user: payload.user,
  };
}

export async function loginBrowserSession(params: {
  email: string;
  name?: string;
}): Promise<BrowserLoginResult> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      name: params.name,
    }),
  });

  const payload = await parseJson<BrowserLoginResult>(response);
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "No se pudo guardar el progreso.");
  }

  return {
    success: true,
    authenticated: Boolean(payload.authenticated),
    userId: payload.userId,
    source: payload.source,
    token: payload.token,
    user: payload.user,
  };
}

export async function captureBrowserEmail(params: {
  email: string;
  sessionId?: string;
  name?: string;
}): Promise<BrowserCaptureEmailResult> {
  const response = await fetch("/api/auth/capture-email", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      sessionId: params.sessionId,
      name: params.name,
    }),
  });

  const payload = await parseJson<BrowserCaptureEmailResult>(response);
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "No se pudo guardar el progreso.");
  }

  return {
    success: true,
    authenticated: Boolean(payload.authenticated),
    userId: payload.userId,
    source: payload.source,
    token: payload.token,
    user: payload.user,
    previousSessionId: payload.previousSessionId,
    futureAuthReady: payload.futureAuthReady,
  };
}
