"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCircle2, AlertTriangle, Zap, FlaskConical, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AlertItem {
  id: string;
  event_type: string;
  entity_type: string;
  payload: Record<string, any>;
  created_at: string;
}

function getAlertIcon(event_type: string) {
  if (event_type.includes("recover") || event_type.includes("success")) {
    return <CheckCircle2 size={13} className="text-jade-400" />;
  }
  if (event_type.includes("leak") || event_type.includes("fail")) {
    return <AlertTriangle size={13} className="text-coral-400" />;
  }
  if (event_type.includes("experiment") || event_type.includes("test")) {
    return <FlaskConical size={13} className="text-violet-400" />;
  }
  if (event_type.includes("opportunit")) {
    return <TrendingUp size={13} className="text-amber-400" />;
  }
  return <Zap size={13} className="text-ink-400" />;
}

function getAlertColor(event_type: string) {
  if (event_type.includes("recover") || event_type.includes("success")) return "border-jade-500/20 bg-jade-500/5";
  if (event_type.includes("leak") || event_type.includes("fail")) return "border-coral-500/20 bg-coral-500/5";
  if (event_type.includes("experiment")) return "border-violet-500/20 bg-violet-500/5";
  return "border-base-border bg-base-50/50";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatEventLabel(event_type: string) {
  return event_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch real events from audit API
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/proxy?path=" + encodeURIComponent("/audit/events?limit=12&skip=0"));
      if (res.ok) {
        const data = await res.json();
        const items: AlertItem[] = data.items ?? [];
        setAlerts(items);
        if (lastSeen === null && items.length > 0) {
          setUnread(items.length);
        } else if (lastSeen !== null) {
          setUnread(items.filter((i) => new Date(i.created_at) > new Date(lastSeen!)).length);
        }
      }
    } catch (e) {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) {
      // Mark all as seen
      setLastSeen(new Date().toISOString());
      setUnread(0);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-base-border bg-base-100 text-ink-300 shadow-card transition hover:text-ink-0 hover:border-jade-500/30"
        aria-label="Notifications"
      >
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[9px] font-bold text-white shadow-[0_0_8px_rgba(240,85,76,0.6)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="absolute right-0 top-11 z-50 w-80 glass-modal rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Bell size={13} className="text-ink-400" />
                <span className="text-xs font-semibold text-ink-0">System Alerts</span>
                <span className="rounded-full bg-base-200 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
                  {alerts.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-ink-500 hover:text-ink-300 transition-colors"
              >
                <X size={13} />
              </button>
            </div>

            {/* Alert list */}
            <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
              {loading && alerts.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-ink-400">Loading alerts...</div>
              ) : alerts.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-ink-400">No recent system events.</div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="px-4 py-3 hover:bg-white/3 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${getAlertColor(alert.event_type)}`}>
                        {getAlertIcon(alert.event_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-ink-0 leading-snug">
                          {formatEventLabel(alert.event_type)}
                        </p>
                        <p className="text-[10px] text-ink-400 capitalize mt-0.5">
                          {alert.entity_type} · {timeAgo(alert.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-white/5">
              <a href="/audit" className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
                View full audit log →
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
