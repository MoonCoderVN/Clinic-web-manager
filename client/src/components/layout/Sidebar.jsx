// client/src/components/layout/Sidebar.jsx
import { NavLink, Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  ClipboardList,
  User,
  MessageSquare,
  LogOut,
  Users,
  UserCog,
  Settings,
  FileText,
  BookOpen,
  BarChart,
  Stethoscope,
  Menu,
  X,
  Clock,
  History,
  ChevronUp,
} from "lucide-react";
import { useState, useEffect } from "react";
import axiosInstance from "@/api/httpClient";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";
import UserAvatar from "@/components/common/UserAvatar";
import { isAppointmentOverdue } from "@/utils/appointmentStatus";

// ── Nav groups ────────────────────────────────────────────────────
const patientNavGroups = [
  {
    label: null,
    items: [
      { title: "Tổng quan",     href: "/patient/dashboard",    icon: LayoutDashboard },
      { title: "Đặt lịch hẹn",  href: "/patient/book",         icon: Calendar },
      { title: "Lịch hẹn",      href: "/patient/appointments", icon: ClipboardList },
      { title: "Lịch sử khám",  href: "/patient/history",      icon: History },
      { title: "Tư vấn AI",     href: "/patient/chat",         icon: MessageSquare },
    ],
  },
];

const doctorNavGroups = [
  {
    label: null,
    items: [
      { title: "Tổng quan",     href: "/doctor/dashboard",       icon: LayoutDashboard },
      { title: "Lịch hẹn",      href: "/doctor/schedule/today",  icon: Clock },
      { title: "Ca làm việc",   href: "/doctor/schedules",       icon: CalendarDays },
      { title: "Bệnh nhân",     href: "/doctor/patients",        icon: Users },
      { title: "Kết quả khám",  href: "/doctor/results",         icon: FileText },
    ],
  },
];

const adminNavGroups = [
  {
    label: "Tổng quan",
    items: [
      { title: "Tổng quan",     href: "/admin/dashboard",    icon: LayoutDashboard },
    ],
  },
  {
    label: "Quản lý",
    items: [
      { title: "Lịch hẹn",     href: "/admin/appointments", icon: Calendar },
      { title: "Bác sĩ",       href: "/admin/doctors",      icon: Stethoscope },
      { title: "Lịch làm việc", href: "/admin/schedules",   icon: CalendarDays },
      { title: "Bệnh nhân",    href: "/admin/patients",     icon: Users },
      { title: "Người dùng",   href: "/admin/users",        icon: UserCog },
      { title: "Dịch vụ",      href: "/admin/services",     icon: ClipboardList },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { title: "Kiến thức AI",  href: "/admin/knowledge",   icon: BookOpen },
      { title: "Báo cáo",       href: "/admin/reports",     icon: BarChart },
    ],
  },
];

const PATIENT_ACTIVE_STATUSES = new Set(["pending", "confirmed", "rescheduled", "in_progress"]);

// ── Role label map ────────────────────────────────────────────────
const ROLE_LABEL = { admin: "Quản trị viên", doctor: "Bác sĩ", patient: "Bệnh nhân" };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const refreshKey = useRealtimeRefresh(["appointment:changed"]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const navGroups =
    user?.role === "admin"  ? adminNavGroups  :
    user?.role === "doctor" ? doctorNavGroups :
    patientNavGroups;

  const dashboardHref =
    user?.role === "admin"  ? "/admin/dashboard"  :
    user?.role === "doctor" ? "/doctor/dashboard" :
    "/patient/dashboard";

  const profileHref =
    user?.role === "admin"  ? "/admin/profile"  :
    user?.role === "doctor" ? "/doctor/profile" :
    "/patient/profile";

  useEffect(() => {
    if (user?.role === "patient") {
      axiosInstance.get("/appointments")
        .then(res => {
          const list = res.data.data || res.data.appointments || [];
          const active = Array.isArray(list)
            ? list.filter(a => PATIENT_ACTIVE_STATUSES.has(a.status) && !isAppointmentOverdue(a))
            : [];
          setPendingCount(active.length);
        })
        .catch(console.error);
    } else {
      setPendingCount(0);
    }
  }, [user, refreshKey]);

  const handleLogout      = () => { setUserMenuOpen(false); logout(); };
  const handleGoProfile   = () => { setUserMenuOpen(false); setMobileOpen(false); navigate(profileHref); };
  const handleGoSettings  = () => {
    setUserMenuOpen(false); setMobileOpen(false);
    if (user?.role === "admin")        navigate("/admin/settings");
    else if (user?.role === "doctor")  navigate("/doctor/settings");
    else                               navigate("/patient/settings");
  };

  // ── Shared inner content ──────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar/95 backdrop-blur-xl">

      {/* Logo */}
      <div className="flex min-h-[72px] shrink-0 items-center gap-2.5 border-b border-sidebar-border/70 px-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <Link
          to={dashboardHref}
          onClick={() => setMobileOpen(false)}
          className="flex min-w-0 items-center gap-3 rounded-2xl transition-opacity hover:opacity-85"
          aria-label="Về dashboard"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_12px_24px_-16px_rgba(11,88,102,0.9)]">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span className="truncate text-lg font-bold text-sidebar-foreground">
            Denta<span className="text-primary">Care</span>
          </span>
        </Link>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-4">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {group.label && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    end={item.href.endsWith("dashboard")}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "group flex min-h-11 items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-[0_12px_30px_-22px_rgba(11,88,102,0.95)]"
                          : "text-sidebar-foreground/68 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground"
                      )
                    }
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </div>
                    {item.href === "/patient/appointments" && pendingCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Menu */}
      <div className="relative shrink-0 border-t border-sidebar-border/70 p-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        {userMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
            <div className="absolute bottom-full left-3 right-3 z-20 mb-2 overflow-hidden rounded-xl border border-border bg-white shadow-lg animate-in slide-in-from-bottom-2 duration-150">
              {/* User info */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <UserAvatar
                  avatar={user?.avatar}
                  name={user?.fullName}
                  email={user?.email}
                  cacheKey={user?.updatedAt}
                  size="xs"
                  className="ring-0"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{user?.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              {/* Options */}
              <div className="p-1">
                <button onClick={handleGoProfile}  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/60">
                  <User    className="h-4 w-4 text-primary" /> Hồ sơ cá nhân
                </button>
                <button onClick={handleGoSettings} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/60">
                  <Settings className="h-4 w-4 text-primary" />
                  {user?.role === "admin" ? "Cài đặt hệ thống" : "Cài đặt"}
                </button>
                <div className="my-1 border-t border-border" />
                <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/8">
                  <LogOut className="h-4 w-4" /> Đăng xuất
                </button>
              </div>
            </div>
          </>
        )}

        {/* Trigger */}
        <button
          onClick={() => setUserMenuOpen(v => !v)}
          className="group flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent/80"
          aria-expanded={userMenuOpen}
          aria-label="Menu người dùng"
        >
          <UserAvatar
            avatar={user?.avatar}
            name={user?.fullName}
            email={user?.email}
            cacheKey={user?.updatedAt}
            size="sm"
            className={cn("transition-all", userMenuOpen ? "ring-2 ring-primary" : "ring-0 group-hover:ring-2 group-hover:ring-primary/30")}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{user?.fullName}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {ROLE_LABEL[user?.role] || user?.role}
            </p>
          </div>
          <ChevronUp
            className={cn("h-4 w-4 shrink-0 text-sidebar-foreground/50 transition-transform duration-200", userMenuOpen ? "" : "rotate-180")}
          />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile Top Bar ── */}
      <div className="sticky top-0 z-50 flex min-h-14 items-center justify-between border-b border-white/70 bg-white/90 px-4 shadow-sm backdrop-blur-xl lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <Link
          to={dashboardHref}
          onClick={() => setMobileOpen(false)}
          className="flex min-w-0 items-center gap-2.5"
          aria-label="Về dashboard"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
            <Stethoscope className="h-3.5 w-3.5" />
          </div>
          <span className="truncate text-base font-bold text-foreground">
            Denta<span className="text-primary">Care</span>
          </span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* ── Mobile Backdrop ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Mobile Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(17rem,86vw)] border-r border-sidebar-border shadow-xl transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* ── Desktop Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-sidebar-border/70 shadow-[18px_0_52px_-44px_rgba(11,88,102,0.55)] lg:flex">
        <SidebarContent />
      </aside>
    </>
  );
}
