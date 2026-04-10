"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, CheckCheck, ExternalLink } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  url: string | null;
  icon: string | null;
  channel: string;
  read: boolean;
  createdAt: string;
};

// ─── Push subscription helpers ───────────────────────────────────────────────

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as any,
  });

  // Send subscription to server
  const json = sub.toJSON();
  await fetch("/api/user/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
    }),
  });

  return sub;
}

async function unsubscribeFromPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  await fetch("/api/user/push", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });

  await sub.unsubscribe();
}

// ─── Channel labels ──────────────────────────────────────────────────────────

const CHANNEL_LABEL: Record<string, string> = {
  system: "Sistema",
  goal: "Objetivo",
  streak: "Racha",
  crisis: "Crisis",
  insight: "Insight",
  challenge: "Reto",
  admin: "Admin",
};

// ─── Time formatting ─────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Check push support & current subscription on mount
  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setPushSupported(supported);

    if (supported) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushEnabled(!!sub);
        });
      });
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/user/notifications?limit=20", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: NotificationItem[];
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch { /* offline — ignore */ }
  }, []);

  // Poll every 60s + on mount
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); buttonRef.current?.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Mark all as read
  const markAllRead = useCallback(async () => {
    await fetch("/api/user/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Toggle push
  const togglePush = useCallback(async () => {
    if (pushEnabled) {
      await unsubscribeFromPush();
      setPushEnabled(false);
    } else {
      const sub = await subscribeToPush();
      setPushEnabled(!!sub);
    }
  }, [pushEnabled]);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
        aria-expanded={open}
        aria-controls="notification-panel"
        className="relative p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/6 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          id="notification-panel"
          role="dialog"
          aria-label="Notificaciones"
          className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/40 z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-white">Notificaciones</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => void markAllRead()}
                  aria-label="Marcar todas como leidas"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {pushSupported && (
                <button
                  onClick={() => void togglePush()}
                  aria-label={pushEnabled ? "Desactivar notificaciones push" : "Activar notificaciones push"}
                  className={`p-1.5 rounded-lg transition-colors ${
                    pushEnabled
                      ? "text-violet-400 bg-violet-500/10"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {pushEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">Sin notificaciones</p>
              </div>
            ) : (
              <ul role="list">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`px-4 py-3 border-b border-zinc-800/50 transition-colors ${
                      n.read ? "opacity-60" : "bg-violet-500/5"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {n.icon && <span className="text-sm mt-0.5 shrink-0">{n.icon}</span>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                          <span className="text-[10px] text-zinc-600 shrink-0">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-snug mt-0.5 line-clamp-2">{n.body}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] text-zinc-600 uppercase tracking-wider">
                            {CHANNEL_LABEL[n.channel] ?? n.channel}
                          </span>
                          {n.url && (
                            <a
                              href={n.url}
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-0.5 text-[10px] text-violet-400 hover:text-violet-300"
                            >
                              Abrir <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 ml-auto shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {!pushEnabled && pushSupported && (
            <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/80">
              <button
                onClick={() => void togglePush()}
                className="w-full py-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-xs font-medium text-violet-300 hover:bg-violet-600/30 transition-colors"
              >
                Activar notificaciones push
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
