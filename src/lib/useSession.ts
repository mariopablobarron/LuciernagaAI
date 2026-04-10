"use client";

import { useEffect, useState } from "react";

export type SessionUser = {
  name: string | null;
  hasAvatar: boolean;
};

type SessionState = {
  user: SessionUser | null;
  loading: boolean;
};

/**
 * Lightweight session hook — checks if the user has a valid session cookie.
 * Returns { user, loading }. user is null if not authenticated.
 * Caches the result in sessionStorage for instant header rendering.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>(() => {
    if (typeof window === "undefined") return { user: null, loading: true };
    const cached = sessionStorage.getItem("_session_user");
    if (cached) {
      try {
        return { user: JSON.parse(cached), loading: false };
      } catch { /* ignore */ }
    }
    return { user: null, loading: true };
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/user/profile", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("not authenticated");
        return res.json();
      })
      .then((data: { profile: { name: string | null; hasAvatar: boolean } }) => {
        if (cancelled) return;
        const user = { name: data.profile.name, hasAvatar: data.profile.hasAvatar };
        setState({ user, loading: false });
        sessionStorage.setItem("_session_user", JSON.stringify(user));
      })
      .catch(() => {
        if (cancelled) return;
        setState({ user: null, loading: false });
        sessionStorage.removeItem("_session_user");
      });

    return () => { cancelled = true; };
  }, []);

  return state;
}
