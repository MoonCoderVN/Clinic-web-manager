import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { CalendarCheck, Eye, EyeOff, Loader2, Mail, Lock, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import DentaCareLogo from "../../components/Dentacarelogo";
import { useAuth } from "../../context/AuthContext";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const redirectByRole = (navigate, role) => {
  switch (role) {
    case "admin":
      navigate("/admin/dashboard");
      break;
    case "doctor":
      navigate("/doctor/dashboard");
      break;
    default:
      navigate("/patient/dashboard");
  }
};

const isKnownRole = (role) => ["admin", "doctor", "patient"].includes(role);

const validateField = (name, value) => {
  const trimmedValue = value.trim();

  if (name === "email") {
    if (!trimmedValue) return "Vui lòng nhập email";
    if (!emailPattern.test(trimmedValue)) return "Email không đúng định dạng";
  }

  if (name === "password") {
    if (!value) return "Vui lòng nhập mật khẩu";
    if (value.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự";
  }

  return "";
};

const getForgotPasswordPath = (email) => {
  const trimmedEmail = email.trim();
  return trimmedEmail
    ? `/forgot-password?email=${encodeURIComponent(trimmedEmail)}`
    : "/forgot-password";
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const setFieldValue = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
    if (touched[name]) {
      setErrors((current) => ({ ...current, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (name) => {
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => ({
      ...current,
      [name]: validateField(name, formData[name]),
    }));
  };

  const validateForm = () => {
    const nextErrors = {
      email: validateField("email", formData.email),
      password: validateField("password", formData.password),
    };
    setTouched({ email: true, password: true });
    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin đăng nhập");
      return;
    }

    setLoading(true);
    try {
      const user = await login(formData.email.trim(), formData.password);
      if (!isKnownRole(user?.role)) {
        toast.error("Tài khoản chưa có quyền truy cập hợp lệ");
        return;
      }
      toast.success("Đăng nhập thành công!");
      redirectByRole(navigate, user.role);
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Email hoặc mật khẩu không đúng";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async ({ credential }) => {
    if (!credential) {
      toast.error("Đăng nhập Google thất bại. Vui lòng thử lại hoặc dùng email.");
      return;
    }

    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle(credential);
      if (!isKnownRole(user?.role)) {
        toast.error("Tài khoản chưa có quyền truy cập hợp lệ");
        return;
      }
      toast.success("Đăng nhập Google thành công!");
      redirectByRole(navigate, user.role);
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Đăng nhập Google thất bại";
      toast.error(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_34%),linear-gradient(135deg,#f8fdfe_0%,#eef9fb_48%,#ffffff_100%)]">
      <style>{`
        @keyframes login-sheen {
          0%, 100% { transform: translateX(-180%) skewX(-12deg); opacity: 0; }
          18%, 48% { opacity: 1; }
          70% { transform: translateX(420%) skewX(-12deg); opacity: 0; }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/80 to-transparent" />

      {/* ── Left panel (desktop only) ── */}
      <aside className="relative hidden min-h-dvh w-[46%] overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-8 xl:p-10">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary))_0%,#11879a_45%,#0f6372_100%)]" />
        <div className="absolute -left-20 top-12 h-48 w-[150%] -rotate-12 rounded-[48px] bg-white/10 blur-[1px]" />
        <div className="absolute bottom-24 left-10 h-28 w-[120%] -rotate-6 rounded-[36px] border border-white/15 bg-white/5" />
        <div
          className="absolute inset-y-0 left-1/4 w-24 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          style={{ animation: "login-sheen 7s ease-in-out infinite" }}
        />

        <Link to="/" className="relative z-10 flex w-fit items-center gap-3 text-white transition-opacity hover:opacity-90" aria-label="Về trang chủ DentaCare">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/18 shadow-lg shadow-cyan-950/10">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none">DentaCare</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-white/60">Clinic system</p>
          </div>
        </Link>

        <div className="relative z-10 max-w-md text-white">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3.5 py-1.5 text-sm font-medium text-white/85">
            <Sparkles className="h-4 w-4" />
            Chăm sóc nha khoa thông minh
          </div>
          <h2 className="text-3xl font-bold leading-tight xl:text-4xl">
            Quản lý lịch hẹn, hồ sơ và chăm sóc bệnh nhân trong một nơi.
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/72">
            DentaCare giúp phòng khám vận hành rõ ràng hơn, từ đặt lịch đến theo dõi kết quả khám và tương tác với bệnh nhân.
          </p>

          <div className="mt-5 grid gap-2.5">
            {[
              { icon: CalendarCheck, title: "Lịch hẹn rõ ràng", desc: "Theo dõi trạng thái khám theo thời gian thực" },
              { icon: ShieldCheck, title: "Dữ liệu bảo mật", desc: "Quyền truy cập tách biệt cho từng vai trò" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-white/14 bg-white/10 p-3 backdrop-blur-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/16">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-0.5 text-xs text-white/62">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-4 gap-2.5 text-center text-white">
          {[{v:"50K+",l:"Bệnh nhân"},{v:"20+",l:"Bác sĩ"},{v:"10+",l:"Năm KN"},{v:"4.9★",l:"Đánh giá"}].map(s=>(
            <div key={s.l} className="rounded-2xl border border-white/12 bg-white/10 px-2.5 py-3 backdrop-blur-sm">
              <div className="text-lg font-bold">{s.v}</div>
              <div className="mt-1 text-[11px] text-white/60">{s.l}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Right panel (form) ── */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        <section className="w-full max-w-[420px] rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_24px_80px_-32px_rgba(15,99,114,0.45)] backdrop-blur-xl sm:p-6">
          <header className="mb-5 flex flex-col items-center text-center">
            <div className="mb-4 lg:hidden">
              <DentaCareLogo />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Đăng nhập</h1>
            <p className="mt-1 text-sm text-muted-foreground">Nhập thông tin tài khoản để truy cập hệ thống</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-semibold text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email" type="email" placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFieldValue("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  disabled={loading || googleLoading}
                  aria-invalid={Boolean(errors.email)}
                  className="field-input pl-10"
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-semibold text-foreground">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password" type={showPassword ? "text" : "password"} placeholder="Nhập mật khẩu"
                  value={formData.password}
                  onChange={(e) => setFieldValue("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  disabled={loading || googleLoading}
                  aria-invalid={Boolean(errors.password)}
                  className="field-input pl-10 pr-10"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowPassword(v => !v)} disabled={loading || googleLoading}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link to={getForgotPasswordPath(formData.email)} className="text-xs font-medium text-primary hover:underline">Quên mật khẩu?</Link>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading || googleLoading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xử lý...</> : "Đăng nhập"}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">Hoặc</span></div>
            </div>

            {googleClientId ? (
              <div className={`overflow-hidden rounded-full ${googleLoading ? "pointer-events-none opacity-70" : ""}`}>
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => toast.error("Đăng nhập Google thất bại")}
                  text="signin_with" shape="pill" theme="outline" size="large" width="100%" locale="vi" />
              </div>
            ) : (
              <button type="button"
                className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60"
                onClick={() => toast.error("Đăng nhập Google chưa được kích hoạt. Vui lòng dùng email và mật khẩu.")} disabled={loading || googleLoading}>
                <GoogleIcon />Đăng nhập với Google
              </button>
            )}
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">Đăng ký ngay</Link>
          </p>
        </section>
      </main>
    </div>
  );
};

const GoogleIcon = () => (
  <svg height="20" viewBox="0 0 48 48" width="20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
      fill="#FFC107"
    />
    <path
      d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-7.682 0-14.344 4.337-17.694 10.691Z"
      fill="#FF3D00"
    />
    <path
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z"
      fill="#4CAF50"
    />
    <path
      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
      fill="#1976D2"
    />
  </svg>
);

export default LoginPage;
