import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  User,
  Users,
  X,
  Stethoscope,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";
import UserAvatar from "../common/UserAvatar";

const navItems = [
  { label: "Dịch vụ",      href: "/services" },
  { label: "Bác sĩ",       href: "/doctors" },
  { label: "Về chúng tôi", hash: "about"    },
  { label: "Liên hệ",      hash: "contact"  },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeNavKey, setActiveNavKey] = useState(() => location.hash?.replace("#", "") || location.pathname);

  /* Backdrop-blur khi scroll > 60px */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Đóng menu khi resize sang desktop */
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setActiveNavKey(location.hash?.replace("#", "") || location.pathname);
  }, [location.hash, location.pathname]);

  const getDashboardLink = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "admin":  return "/admin/dashboard";
      case "doctor": return "/doctor/dashboard";
      default:       return "/patient/dashboard";
    }
  };

  const getProfileLink = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "admin":  return "/admin/profile";
      case "doctor": return "/doctor/profile";
      default:       return "/patient/profile";
    }
  };

  const handleHashLink = (hash) => {
    setMobileMenuOpen(false);
    if (location.pathname === "/") {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    navigate(`/#${hash}`);
  };

  const navigateToTop = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    }, 0);
  };

  const handleNavItem = (item) => {
    setActiveNavKey(item.href || item.hash);
    if (item.href) {
      navigateToTop(item.href);
      return;
    }
    handleHashLink(item.hash);
  };

  const isNavItemActive = (item) => activeNavKey === (item.href || item.hash);

  const handleBrandClick = () => {
    setMobileMenuOpen(false);
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate("/");
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    }, 0);
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    logout();
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "navbar-scrolled"
          : "border-b border-white/50 bg-white/90 backdrop-blur-xl"
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ── Logo ── */}
        <button
          type="button"
          onClick={handleBrandClick}
          className="group flex items-center gap-3 focus-visible:outline-none"
          aria-label="Về đầu trang"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_14px_28px_-18px_rgba(11,88,102,0.95)] transition-transform duration-200 group-hover:scale-105">
            <Stethoscope className="h-5 w-5" />
          </div>
          <span className="text-[22px] font-bold tracking-tight text-foreground">
            Denta<span className="text-primary">Care</span>
          </span>
        </button>

        {/* ── Desktop Nav Links ── */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = isNavItemActive(item);
            return (
              <button
                key={item.hash || item.href}
                type="button"
                onClick={() => handleNavItem(item)}
                className={`relative rounded-full px-4 py-2 text-[15px] transition-colors duration-150
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                             active
                               ? "bg-primary/10 font-bold text-primary shadow-sm hover:bg-primary/12 hover:text-primary"
                               : "font-semibold text-muted-foreground hover:bg-primary/8 hover:text-primary"
                           }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* ── Desktop CTA ── */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="relative">
              {userMenuOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              )}
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
                className="flex max-w-48 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium
                           text-foreground transition-colors hover:bg-primary/8 focus-visible:outline-none
                           focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <UserAvatar
                  avatar={user.avatar}
                  name={user.fullName}
                  email={user.email}
                  cacheKey={user.updatedAt}
                  size="xs"
                  className="ring-0"
                />
                <span className="max-w-32 truncate">{user.fullName}</span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/80 bg-white/95 shadow-lg backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150">
                  <div className="p-1">
                    <Link
                      to={getDashboardLink()}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/60"
                    >
                      <LayoutDashboard className="h-4 w-4 text-primary" />
                      Tổng quan
                    </Link>
                    <Link
                      to={getProfileLink()}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/60"
                    >
                      <User className="h-4 w-4 text-primary" />
                      Hồ sơ
                    </Link>
                    <div className="my-1 border-t border-border" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/8"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full px-4 py-2 text-[15px] font-semibold text-foreground
                           transition-colors hover:bg-primary/8 hover:text-primary focus-visible:outline-none"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="btn-primary px-6 text-[15px]"
              >
                Đặt lịch ngay
              </Link>
            </>
          )}
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          type="button"
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/8 md:hidden
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Mở menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* ── Mobile Menu ── */}
      {mobileMenuOpen && (
        <div className="border-t border-white/70 bg-white/95 shadow-md backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-0.5 px-4 py-3">
            {navItems.map((item) => {
              const active = isNavItemActive(item);
              return (
                <button
                  key={item.hash || item.href}
                  type="button"
                  onClick={() => handleNavItem(item)}
                  className={`flex min-h-10 w-full items-center rounded-lg px-3 py-2 text-left text-sm
                             transition-colors hover:bg-muted/60 ${
                               active
                                 ? "bg-primary/10 font-bold text-primary"
                                 : "font-medium text-muted-foreground hover:text-foreground"
                             }`}
                >
                  {item.label}
                </button>
              );
            })}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              {user ? (
                <>
                  <Link
                    to={getDashboardLink()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5
                               text-sm font-semibold transition-colors hover:bg-muted/60"
                  >
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                    Tổng quan
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg border border-destructive/30 px-4 py-2.5 text-sm font-semibold
                               text-destructive transition-colors hover:bg-destructive/8"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex justify-center rounded-lg border border-border px-4 py-2.5 text-sm
                               font-semibold text-foreground transition-colors hover:bg-muted/60"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary justify-center"
                  >
                    Đặt lịch ngay
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
