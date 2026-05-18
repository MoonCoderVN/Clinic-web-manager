import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarCheck, Eye, EyeOff, Loader2, User, Mail, Phone, Lock, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import DentaCareLogo from "../../components/Dentacarelogo";
import axiosInstance from "@/api/httpClient";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\d{10}$/;

const initialFormData = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

const validateField = (name, value, formData) => {
  const trimmedValue = value.trim();

  if (name === "fullName" && !trimmedValue) return "Vui lòng nhập họ và tên";

  if (name === "email") {
    if (!trimmedValue) return "Vui lòng nhập email";
    if (!emailPattern.test(trimmedValue)) return "Email không đúng định dạng";
  }

  if (name === "phone") {
    if (!trimmedValue) return "Vui lòng nhập số điện thoại";
    if (!phonePattern.test(trimmedValue)) return "Số điện thoại phải gồm 10 chữ số";
  }

  if (name === "password") {
    if (!value) return "Vui lòng nhập mật khẩu";
    if (value.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự";
  }

  if (name === "confirmPassword") {
    if (!value) return "Vui lòng nhập lại mật khẩu";
    if (value !== formData.password) return "Mật khẩu xác nhận không khớp";
  }

  return "";
};

const getPasswordStrength = (pw) => {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};
const strengthLabel = ["Quá yếu","Yếu","Trung bình","Mạnh","Rất mạnh"];
const strengthColor = ["bg-red-400","bg-orange-400","bg-yellow-400","bg-green-400","bg-emerald-500"];

const RegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const pwStrength = getPasswordStrength(formData.password);

  const setFieldValue = (name, value) => {
    const nextFormData = { ...formData, [name]: value };
    setFormData(nextFormData);

    if (touched[name]) {
      setErrors((current) => ({
        ...current,
        [name]: validateField(name, value, nextFormData),
      }));
    }

    if (name === "password" && touched.confirmPassword) {
      setErrors((current) => ({
        ...current,
        confirmPassword: validateField("confirmPassword", nextFormData.confirmPassword, nextFormData),
      }));
    }
  };

  const handleBlur = (name) => {
    setTouched((current) => ({ ...current, [name]: true }));
    setErrors((current) => ({
      ...current,
      [name]: validateField(name, formData[name], formData),
    }));
  };

  const validateForm = () => {
    const nextErrors = Object.keys(initialFormData).reduce((result, field) => {
      result[field] = validateField(field, formData[field], formData);
      return result;
    }, {});

    setTouched({
      fullName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });
    setErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin đăng ký");
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post("/auth/register", {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
      });
      toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate("/login");
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_34%),linear-gradient(135deg,#f8fdfe_0%,#eef9fb_48%,#ffffff_100%)]">
      <style>{`
        @keyframes auth-sheen {
          0%, 100% { transform: translateX(-180%) skewX(-12deg); opacity: 0; }
          18%, 48% { opacity: 1; }
          70% { transform: translateX(420%) skewX(-12deg); opacity: 0; }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/80 to-transparent" />

      {/* Left branding panel */}
      <aside className="relative hidden min-h-dvh w-[46%] overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-8 xl:p-10">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary))_0%,#11879a_45%,#0f6372_100%)]" />
        <div className="absolute -left-20 top-12 h-48 w-[150%] -rotate-12 rounded-[48px] bg-white/10 blur-[1px]" />
        <div className="absolute bottom-24 left-10 h-28 w-[120%] -rotate-6 rounded-[36px] border border-white/15 bg-white/5" />
        <div
          className="absolute inset-y-0 left-1/4 w-24 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          style={{ animation: "auth-sheen 7s ease-in-out infinite" }}
        />

        <Link to="/" className="relative z-10 flex w-fit items-center gap-3 text-white transition-opacity hover:opacity-90" aria-label="Về trang chủ DentaCare">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/18 shadow-lg shadow-cyan-950/10">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold leading-none">DentaCare</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.22em] text-white/60">Patient portal</p>
          </div>
        </Link>

        <div className="relative z-10 max-w-md text-white">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3.5 py-1.5 text-sm font-medium text-white/85">
            <Sparkles className="h-4 w-4" />
            Bắt đầu chăm sóc nụ cười
          </div>
          <h2 className="text-3xl font-bold leading-tight xl:text-4xl">
            Tạo tài khoản để đặt lịch và theo dõi sức khỏe răng miệng.
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/72">
            Quản lý lịch khám, xem lịch sử điều trị và nhận hỗ trợ nha khoa trong một trải nghiệm thống nhất.
          </p>

          <div className="mt-5 grid gap-2.5">
            {[
              { icon: CalendarCheck, title: "Đặt lịch nhanh", desc: "Chọn dịch vụ, bác sĩ và khung giờ phù hợp" },
              { icon: ShieldCheck, title: "Hồ sơ riêng tư", desc: "Thông tin cá nhân được bảo vệ theo tài khoản" },
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

      {/* Right form panel */}
      <main className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-5 lg:p-7">
        <section className="w-full max-w-[500px] rounded-[28px] border border-white/70 bg-white/88 p-4 shadow-[0_24px_80px_-32px_rgba(15,99,114,0.45)] backdrop-blur-xl sm:p-5">
          <header className="mb-4 flex flex-col items-center text-center">
            <div className="mb-3 lg:hidden"><DentaCareLogo /></div>
            <h1 className="text-2xl font-bold text-foreground">Đăng ký tài khoản</h1>
            <p className="mt-1 text-sm text-muted-foreground">Tạo tài khoản mới để sử dụng dịch vụ của chúng tôi</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-2.5" noValidate>
            {/* Full name */}
            <div className="space-y-1">
              <label htmlFor="fullName" className="block text-sm font-semibold text-foreground">Họ và tên</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="fullName" type="text" placeholder="Nguyễn Văn A"
                  value={formData.fullName} onChange={e=>setFieldValue("fullName",e.target.value)} onBlur={()=>handleBlur("fullName")}
                  disabled={loading} aria-invalid={Boolean(errors.fullName)} className="field-input pl-10" />
              </div>
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="email" className="block text-sm font-semibold text-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="email" type="email" placeholder="email@example.com"
                  value={formData.email} onChange={e=>setFieldValue("email",e.target.value)} onBlur={()=>handleBlur("email")}
                  disabled={loading} aria-invalid={Boolean(errors.email)} className="field-input pl-10" />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label htmlFor="phone" className="block text-sm font-semibold text-foreground">Số điện thoại</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="phone" type="tel" inputMode="numeric" placeholder="0901234567"
                  value={formData.phone} onChange={e=>setFieldValue("phone",e.target.value)} onBlur={()=>handleBlur("phone")}
                  disabled={loading} aria-invalid={Boolean(errors.phone)} className="field-input pl-10" />
              </div>
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="password" className="block text-sm font-semibold text-foreground">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="password" type={showPassword?"text":"password"} placeholder="Ít nhất 6 ký tự"
                  value={formData.password} onChange={e=>setFieldValue("password",e.target.value)} onBlur={()=>handleBlur("password")}
                  disabled={loading} aria-invalid={Boolean(errors.password)} className="field-input pl-10 pr-10" />
                <button type="button" onClick={()=>setShowPassword(v=>!v)} disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword?"Ẩn mật khẩu":"Hiện mật khẩu"}>
                  {showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}
                </button>
              </div>
              {/* Password strength indicator */}
              {formData.password && (
                <div>
                  <div className="mt-1 flex gap-1">
                    {[1,2,3,4].map(i=>(
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i<=pwStrength?strengthColor[pwStrength-1]:"bg-border"}`} />
                    ))}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {strengthLabel[pwStrength] || ""}
                  </p>
                </div>
              )}
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div className="space-y-1">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input id="confirmPassword" type={showConfirmPassword?"text":"password"} placeholder="Nhập lại mật khẩu"
                  value={formData.confirmPassword} onChange={e=>setFieldValue("confirmPassword",e.target.value)} onBlur={()=>handleBlur("confirmPassword")}
                  disabled={loading} aria-invalid={Boolean(errors.confirmPassword)} className="field-input pl-10 pr-10" />
                <button type="button" onClick={()=>setShowConfirmPassword(v=>!v)} disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword?"Ẩn mật khẩu":"Hiện mật khẩu"}>
                  {showConfirmPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading?<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Đang xử lý...</>:"Đăng ký"}
            </button>
          </form>

          <p className="mt-3 text-center text-sm text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Đăng nhập</Link>
          </p>
        </section>
      </main>
    </div>
  );
};

export default RegisterPage;
