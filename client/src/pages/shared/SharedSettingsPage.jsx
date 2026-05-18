import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Lock,
  Bell,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  UserRound,
} from "lucide-react";
import axiosInstance from "@/api/httpClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

// ── Password Change Section ──────────────────────────────────────
function ChangePasswordSection() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);

  const toggle = (field) => setShow((s) => ({ ...s, [field]: !s[field] }));
  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.put("/users/me/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success("Đổi mật khẩu thành công!");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Đổi mật khẩu thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-5 w-5" />
          Đổi mật khẩu
        </CardTitle>
        <CardDescription>Cập nhật mật khẩu để bảo mật tài khoản của bạn</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current password */}
        <div className="space-y-2">
          <Label htmlFor="cur-pw">Mật khẩu hiện tại</Label>
          <div className="relative">
            <Input
              id="cur-pw"
              type={show.current ? "text" : "password"}
              value={form.currentPassword}
              onChange={f("currentPassword")}
              placeholder="Nhập mật khẩu hiện tại"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => toggle("current")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Separator />

        {/* New password */}
        <div className="space-y-2">
          <Label htmlFor="new-pw">Mật khẩu mới</Label>
          <div className="relative">
            <Input
              id="new-pw"
              type={show.new ? "text" : "password"}
              value={form.newPassword}
              onChange={f("newPassword")}
              placeholder="Tối thiểu 6 ký tự"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => toggle("new")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Confirm password */}
        <div className="space-y-2">
          <Label htmlFor="confirm-pw">Xác nhận mật khẩu mới</Label>
          <div className="relative">
            <Input
              id="confirm-pw"
              type={show.confirm ? "text" : "password"}
              value={form.confirmPassword}
              onChange={f("confirmPassword")}
              placeholder="Nhập lại mật khẩu mới"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => toggle("confirm")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.confirmPassword && form.newPassword && (
            <p className={`text-xs flex items-center gap-1 ${form.newPassword === form.confirmPassword ? "text-green-600" : "text-destructive"}`}>
              {form.newPassword === form.confirmPassword
                ? <><CheckCircle className="h-3 w-3" />Mật khẩu khớp</>
                : "Mật khẩu không khớp"}
            </p>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={saving} className="mt-2">
          {saving
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu...</>
            : <><Lock className="mr-2 h-4 w-4" />Cập nhật mật khẩu</>}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Notification Settings Section ────────────────────────────────
function NotificationSection() {
  const [prefs, setPrefs] = useState({
    appointmentReminder: true,
    appointmentConfirmed: true,
    appointmentCancelled: true,
    newMessage: true,
    systemNotice: false,
  });

  const ITEMS = [
    { key: "appointmentReminder",  label: "Nhắc nhở lịch hẹn",        desc: "Nhận thông báo trước khi đến lịch hẹn" },
    { key: "appointmentConfirmed", label: "Xác nhận lịch hẹn",         desc: "Khi lịch hẹn được xác nhận hoặc thay đổi" },
    { key: "appointmentCancelled", label: "Hủy lịch hẹn",              desc: "Khi lịch hẹn bị hủy" },
    { key: "newMessage",           label: "Tin nhắn mới",               desc: "Thông báo khi có tin nhắn tư vấn mới" },
    { key: "systemNotice",         label: "Thông báo hệ thống",         desc: "Cập nhật, bảo trì và thông báo từ DentaCare" },
  ];

  const handleSave = () => {
    // TODO: persist to backend when preference API is ready
    toast.success("Đã lưu tùy chọn thông báo!");
  };

  return (
    <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" />
          Tùy chọn thông báo
        </CardTitle>
        <CardDescription>Chọn loại thông báo bạn muốn nhận</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {ITEMS.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <Switch
              checked={prefs[key]}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
            />
          </div>
        ))}
        <Button variant="outline" onClick={handleSave} className="mt-2">
          <CheckCircle className="mr-2 h-4 w-4" />
          Lưu tùy chọn
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Security Info Section ─────────────────────────────────────────
function SecuritySection() {
  const { user } = useAuth();
  return (
    <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5" />
          Bảo mật tài khoản
        </CardTitle>
        <CardDescription>Thông tin bảo mật của tài khoản</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email đăng nhập</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vai trò</span>
            <span className="font-medium capitalize">
              {user?.role === "doctor" ? "Bác sĩ" : user?.role === "patient" ? "Bệnh nhân" : user?.role}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trạng thái tài khoản</span>
            <span className="text-green-600 font-medium flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> Đang hoạt động
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Nếu bạn nghi ngờ tài khoản bị xâm phạm, hãy đổi mật khẩu ngay lập tức và liên hệ quản trị viên.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function SharedSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-5xl space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#f7fdfe_0%,#e9f8fb_48%,#ffffff_100%)] p-5 shadow-xl shadow-cyan-950/8 sm:p-6 lg:p-7">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-primary/12 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
              Cài đặt tài khoản
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Quản lý bảo mật và thông báo</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Cập nhật mật khẩu, tùy chọn thông báo và kiểm tra trạng thái tài khoản DentaCare của bạn.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <HeroMetric icon={Lock} label="Bảo mật" value="Mật khẩu" />
            <HeroMetric icon={Bell} label="Thông báo" value="Tuỳ chọn" />
            <HeroMetric icon={UserRound} label="Vai trò" value={user?.role === "doctor" ? "Bác sĩ" : "Bệnh nhân"} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <ChangePasswordSection />
          <NotificationSection />
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <SecuritySection />
        </div>
      </div>
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
