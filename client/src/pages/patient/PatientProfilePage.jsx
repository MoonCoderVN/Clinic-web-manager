import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import AvatarUpload from "@/components/common/AvatarUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Phone, MapPin, Calendar, Loader2, HeartPulse, UserRound, Save, X, Camera } from "lucide-react";
import axiosInstance from "@/api/httpClient";

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

export default function PatientProfilePage() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    medicalHistory: [],
    allergies: [],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [userRes, patientRes] = await Promise.allSettled([
          axiosInstance.get("/users/me"),
          axiosInstance.get("/patients/profile"),
        ]);

        const userData = userRes.status === "fulfilled" ? userRes.value.data.data : {};
        const patientData = patientRes.status === "fulfilled" ? patientRes.value.data.data : {};

        setFormData({
          name: userData.fullName || "",
          phone: userData.phone || "",
          dateOfBirth: toDateInputValue(patientData.dateOfBirth),
          gender: patientData.gender || "",
          address: patientData.address || "",
          medicalHistory: Array.isArray(patientData.medicalHistory) ? patientData.medicalHistory.filter(Boolean) : [],
          allergies: Array.isArray(patientData.allergies) ? patientData.allergies.filter(Boolean) : [],
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast.error("Không thể tải hồ sơ cá nhân");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (formData.phone && !/^0\d{9}$/.test(formData.phone)) {
      errs.phone = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0";
    }
    if (formData.dateOfBirth) {
      const dob = new Date(formData.dateOfBirth);
      const now = new Date();
      const minYear = new Date();
      minYear.setFullYear(now.getFullYear() - 120);
      if (dob > now) errs.dateOfBirth = "Ngày sinh không được là ngày trong tương lai";
      else if (dob < minYear) errs.dateOfBirth = "Ngày sinh không hợp lệ";
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);

    const [userResult, patientResult] = await Promise.allSettled([
      axiosInstance.put("/users/profile", {
        fullName: formData.name,
        phone: formData.phone,
      }),
      axiosInstance.put("/patients/profile", {
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        address: formData.address,
        medicalHistory: formData.medicalHistory,
        allergies: formData.allergies,
      }),
    ]);

    const userFailed = userResult.status === "rejected";
    const patientFailed = patientResult.status === "rejected";

    if (userFailed || patientFailed) {
      toast.error("Cập nhật thất bại, vui lòng thử lại");
      if (userFailed) console.error("Failed to update user:", userResult.reason);
      if (patientFailed) console.error("Failed to update patient profile:", patientResult.reason);
    } else {
      toast.success("Cập nhật hồ sơ thành công");
      axiosInstance.get("/users/me").then((res) => {
        setUser(res.data.data);
      }).catch(() => {
        // Ignore context refresh failure; saved data still persists.
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-heading">
          <div className="space-y-2"><div className="skeleton h-4 w-28" /><div className="skeleton h-8 w-48" /><div className="skeleton h-4 w-72" /></div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
          <div className="soft-card p-6 space-y-4">
            <div className="flex flex-col items-center gap-3"><div className="skeleton h-20 w-20 rounded-full" /><div className="skeleton h-5 w-32" /><div className="skeleton h-4 w-40" /></div>
            {[1,2,3,4].map(i=><div key={i} className="skeleton h-10 w-full rounded-xl" />)}
          </div>
          <div className="space-y-6">
            <div className="soft-card p-6 space-y-4"><div className="skeleton h-6 w-40" /><div className="grid gap-4 sm:grid-cols-2">{[1,2,3,4].map(i=><div key={i} className="skeleton h-10 rounded-xl" />)}<div className="skeleton h-10 rounded-xl sm:col-span-2" /></div></div>
            <div className="soft-card p-6 space-y-4"><div className="skeleton h-6 w-36" />{[1,2].map(i=><div key={i} className="skeleton h-20 rounded-xl" />)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#f7fdfe_0%,#e9f8fb_48%,#ffffff_100%)] p-5 shadow-xl shadow-cyan-950/8 sm:p-6 lg:p-7">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-primary/12 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
              Hồ sơ cá nhân
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Thông tin của tôi</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Cập nhật thông tin liên hệ và dữ liệu y tế để phòng khám hỗ trợ bạn tốt hơn trước mỗi lần thăm khám.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <HeroMetric icon={Phone} label="Liên hệ" value={formData.phone ? "Đã cập nhật" : "Bổ sung"} />
            <HeroMetric icon={HeartPulse} label="Dữ liệu y tế" value={formData.medicalHistory.length + formData.allergies.length} />
            <HeroMetric icon={Camera} label="Avatar" value={user?.avatar ? "Đã có" : "Tuỳ chỉnh"} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Card className="soft-card h-fit overflow-hidden border-white/80 bg-white/95 shadow-xl shadow-cyan-950/8 xl:sticky xl:top-6">
          <div className="h-24 bg-[linear-gradient(135deg,hsl(var(--primary)/0.20),#dff7fb_70%,#ffffff_100%)]" />
          <CardHeader className="items-center text-center">
            <AvatarUpload size="lg" />
            <div>
              <CardTitle className="mt-3">{user?.fullName || formData.name}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ProfileLine icon={Mail} label={user?.email || "Chưa cập nhật"} />
            <ProfileLine icon={Phone} label={formData.phone || "Chưa cập nhật số điện thoại"} />
            <ProfileLine icon={MapPin} label={formData.address || "Chưa cập nhật địa chỉ"} />
            <ProfileLine
              icon={Calendar}
              label={formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString("vi-VN") : "Chưa cập nhật ngày sinh"}
            />
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                Thông tin cá nhân
              </CardTitle>
              <CardDescription>Dùng cho liên hệ và xác nhận lịch hẹn.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Họ và tên" htmlFor="name">
                <Input id="name" value={formData.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Nguyễn Văn A" />
              </Field>
              <Field label="Số điện thoại" htmlFor="phone" error={errors.phone}>
                <Input id="phone" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="0901234567" className={errors.phone ? "border-destructive" : ""} />
              </Field>
              <Field label="Ngày sinh" htmlFor="dateOfBirth" error={errors.dateOfBirth}>
                <Input id="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} className={errors.dateOfBirth ? "border-destructive" : ""} />
              </Field>
              <Field label="Giới tính" htmlFor="gender">
                <Select value={formData.gender} onValueChange={(value) => updateField("gender", value)}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Chọn giới tính" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Nam</SelectItem>
                    <SelectItem value="female">Nữ</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Input id="address" value={formData.address} onChange={(e) => updateField("address", e.target.value)} placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM" />
              </div>
            </CardContent>
          </Card>

          <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-primary" />
                Thông tin y tế
              </CardTitle>
              <CardDescription>Thông tin này giúp bác sĩ chuẩn bị tốt hơn trước khi khám.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Tiền sử bệnh" htmlFor="medicalHistory" hint="Nhập rồi nhấn Enter hoặc dấu phẩy để thêm.">
                <TagInput
                  id="medicalHistory"
                  tags={formData.medicalHistory}
                  onChange={(tags) => updateField("medicalHistory", tags)}
                  placeholder="Ví dụ: Tiểu đường"
                />
              </Field>
              <Field label="Dị ứng" htmlFor="allergies" hint="Ví dụ dị ứng thuốc, thức ăn hoặc vật liệu nha khoa.">
                <TagInput
                  id="allergies"
                  tags={formData.allergies}
                  onChange={(tags) => updateField("allergies", tags)}
                  placeholder="Ví dụ: Penicillin"
                />
              </Field>
              <div className="flex justify-end border-t pt-4">
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Đang lưu...</>
                  ) : (
                    <><Save className="h-4 w-4" />Lưu thay đổi</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, hint, error, children }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TagInput({ id, tags, onChange, placeholder }) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  const addTag = (raw) => {
    const value = raw.trim();
    if (!value || tags.includes(value)) return;
    onChange([...tags, value]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
      setInputValue("");
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
      setInputValue("");
    }
  };

  const removeTag = (index) => onChange(tags.filter((_, i) => i !== index));

  return (
    <div
      className="flex min-h-10 flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {tag}
          <button type="button" onClick={() => removeTag(i)} className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-24 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

function ProfileLine({ icon: Icon, label }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 break-words">{label}</span>
    </div>
  );
}

function HeroMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white/85 p-4 shadow-sm backdrop-blur">
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  );
}
