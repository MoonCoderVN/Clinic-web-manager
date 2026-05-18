// client/src/components/common/NotificationDropdown.jsx
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Bell, Calendar, Clock, CheckCircle, Info, Trash2, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notificationsApi } from "@/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useRealtimeEvent } from "@/hooks/useRealtimeEvent";

// ── Link resolver theo type + role ──────────────────────────────
function resolveLink(notification, role) {
  const type = notification.type;
  const content = `${notification.title || ""} ${notification.message || ""}`.toLowerCase();
  if (role === "admin") {
    if (type === "appointment") return "/admin/appointments";
    if (content.includes("nghỉ") || content.includes("nghi")) return "/admin/schedules?tab=leave-requests";
    return "/admin/dashboard";
  }
  if (role === "doctor") {
    if (type === "appointment") return "/doctor/schedule/today";
    if (type === "reminder")    return "/doctor/schedule/today";
    return "/doctor/dashboard";
  }
  // patient (default)
  if (type === "appointment") return "/patient/appointments";
  if (type === "reminder")    return "/patient/appointments";
  return "/patient/dashboard";
}

// ── Icon theo type ───────────────────────────────────────────────
function TypeIcon({ type }) {
  if (type === "appointment") return <Calendar className="h-4 w-4 text-primary" />;
  if (type === "reminder")    return <Clock className="h-4 w-4 text-orange-500" />;
  if (type === "system")      return <Info className="h-4 w-4 text-blue-500" />;
  return <Bell className="h-4 w-4 text-muted-foreground" />;
}

// ── Time ago helper ──────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "Vừa xong";
  if (mins < 60)  return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return `${days} ngày trước`;
}

// ── Main Component ───────────────────────────────────────────────
export default function NotificationDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [panelPosition, setPanelPosition] = useState({
    top: 0,
    left: 16,
    width: 320,
    maxHeight: 420,
  });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const updatePanelPosition = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const gutter = 16;
    const panelWidth = Math.min(window.innerWidth >= 640 ? 384 : 320, window.innerWidth - gutter * 2);
    const panelMaxHeight = Math.min(420, window.innerHeight - gutter * 2);
    const preferredLeft = rect.right - panelWidth;
    const left = Math.max(gutter, Math.min(preferredLeft, window.innerWidth - panelWidth - gutter));
    const spaceBelow = window.innerHeight - rect.bottom - gutter;
    const openUp = spaceBelow < panelMaxHeight && rect.top > spaceBelow;
    const top = openUp
      ? Math.max(gutter, rect.top - panelMaxHeight - 8)
      : Math.min(rect.bottom + 8, window.innerHeight - panelMaxHeight - gutter);

    setPanelPosition({
      top,
      left,
      width: panelWidth,
      maxHeight: panelMaxHeight,
    });
  };

  // Fetch unread count on mount + poll every 30s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      const clickedButton = dropdownRef.current?.contains(e.target);
      const clickedPanel = panelRef.current?.contains(e.target);
      if (!clickedButton && !clickedPanel) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function fetchUnreadCount() {
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnread(res.data.data?.count || 0);
    } catch { /* silently fail */ }
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await notificationsApi.getAll();
      setNotifications(res.data.data || []);
    } catch {
      toast.error("Không thể tải thông báo");
    } finally {
      setLoading(false);
    }
  }

  useRealtimeEvent("notification:new", (payload) => {
    const notification = payload?.notification;
    setUnread((count) => count + 1);
    if (notification) {
      setNotifications((prev) => {
        if (prev.some((item) => item._id === notification._id)) return prev;
        return [notification, ...prev];
      });
    } else if (open) {
      fetchNotifications();
    }
  });

  useRealtimeEvent("notification:changed", () => {
    fetchUnreadCount();
    if (open) fetchNotifications();
  });

  const handleToggle = () => {
    if (!open) fetchNotifications();
    if (!open) updatePanelPosition();
    setOpen((v) => !v);
  };

  const handleClick = async (notification) => {
    // Mark as read if not already
    if (!notification.isRead) {
      try {
        await notificationsApi.markRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => n._id === notification._id ? { ...n, isRead: true } : n)
        );
        setUnread((c) => Math.max(0, c - 1));
      } catch { /* ignore */ }
    }
    setOpen(false);
    navigate(resolveLink(notification, user?.role));
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
      toast.success("Đã đánh dấu tất cả là đã đọc");
    } catch {
      toast.error("Thao tác thất bại");
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationsApi.remove(id);
      setNotifications((prev) => {
        const deleted = prev.find((n) => n._id === id);
        if (deleted && !deleted.isRead) setUnread((c) => Math.max(0, c - 1));
        return prev.filter((n) => n._id !== id);
      });
    } catch {
      toast.error("Xóa thất bại");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Bell Button ── */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
          open ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
        )}
        aria-label="Thông báo"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open ? createPortal((
        <div
          ref={panelRef}
          className="fixed z-[99999] overflow-hidden rounded-xl border bg-card shadow-2xl animate-in slide-in-from-top-2 duration-150"
          style={{
            top: panelPosition.top,
            left: panelPosition.left,
            width: panelPosition.width,
            maxHeight: panelPosition.maxHeight,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="font-semibold text-sm">Thông báo</span>
              {unread > 0 && (
                <span className="rounded-full bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5">
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck className="h-3 w-3" />
                Đánh dấu đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <div
            className="overflow-y-auto"
            style={{ maxHeight: Math.max(180, panelPosition.maxHeight - (notifications.length > 0 ? 88 : 48)) }}
          >
            {loading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <Bell className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left border-b last:border-0 transition-colors group hover:bg-muted/60",
                    !n.isRead && "bg-primary/5"
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    !n.isRead ? "bg-primary/10" : "bg-muted"
                  )}>
                    <TypeIcon type={n.type} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug", !n.isRead && "font-semibold")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {timeAgo(n.sentAt || n.createdAt)}
                    </p>
                  </div>

                  {/* Unread dot + delete */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary mt-1" />
                    )}
                    <button
                      onClick={(e) => handleDelete(e, n._id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      title="Xóa thông báo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2 bg-muted/20">
              <p className="text-xs text-center text-muted-foreground">
                {notifications.filter((n) => n.isRead).length} / {notifications.length} đã đọc
              </p>
            </div>
          )}
        </div>
      ), document.body) : null}
    </div>
  );
}
