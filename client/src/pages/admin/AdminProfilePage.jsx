import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AvatarUpload from "@/components/common/AvatarUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Phone, ShieldCheck, Loader2, KeyRound, Eye, EyeOff, Building2, Clock, MapPin } from "lucide-react";
import axiosInstance from "@/api/httpClient";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";
import { AdminLoadingState } from "@/components/admin/AdminUI";

export default function AdminProfilePage() {
  const { user, setUser } = useAuth();
  const refreshKey = useRealtimeRefresh(["settings:changed", "profile:changed"]);
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingClinic, setSavingClinic] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [infoForm, setInfoForm] = useState({ fullName: "", phone: "" });
  const [clinicForm, setClinicForm] = useState({
    clinicName: "",
    phone: "",
    email: "",
    address: "",
    workDays: "",
    openTime: "08:00",
    closeTime: "17:00",
    description: "",
  });
  const [pwdForm, setPwdForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // ── Fetch user info ───────────────────────────────────────────────
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await axiosInstance.get("/users/me");
        const data = res.data.data;
        setInfoForm({ fullName: data.fullName || "", phone: data.phone || "" });
        // Sync latest user vào context
        setUser(data);

        const settingsRes = await axiosInstance.get("/admin/settings");
        const settings = settingsRes.data.data;
        if (settings) {
          setClinicForm({
            clinicName: settings.clinicName || "",
            phone: settings.phone || "",
            email: settings.email || "",
            address: settings.address || "",
            workDays: settings.workDays || "",
            openTime: settings.openTime || "08:00",
            closeTime: settings.closeTime || "17:00",
            description: settings.description || "",
          });
        }
      } catch (err) {
        console.error("Failed to fetch admin profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // ── Lưu thông tin cơ bản ─────────────────────────────────────────
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!infoForm.fullName.trim()) {
      toast.error("Họ tên không được để trống");
      return;
    }
    setSavingInfo(true);
    try {
      const res = await axiosInstance.put("/users/profile", {
        fullName: infoForm.fullName,
        phone: infoForm.phone,
      });
      // Cập nhật context để Sidebar/Navbar phản ánh tên mới
      setUser((prev) => ({ ...prev, ...res.data.data }));
      toast.success("Cập nhật thông tin thành công!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Đổi mật khẩu ─────────────────────────────────────────────────
  const handleSaveClinic = async (e) => {
    e.preventDefault();
    setSavingClinic(true);
    try {
      const res = await axiosInstance.put("/admin/settings", clinicForm);
      const settings = res.data.data;
      if (settings) {
        setClinicForm({
          clinicName: settings.clinicName || "",
          phone: settings.phone || "",
          email: settings.email || "",
          address: settings.address || "",
          workDays: settings.workDays || "",
          openTime: settings.openTime || "08:00",
          closeTime: settings.closeTime || "17:00",
          description: settings.description || "",
        });
      }
      toast.success("Đã lưu thông tin phòng khám");
    } catch (err) {
      toast.error(err.response?.data?.message || "Lưu thông tin phòng khám thất bại");
    } finally {
      setSavingClinic(false);
    }
  };

  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (!pwdForm.oldPassword || !pwdForm.newPassword || !pwdForm.confirmPassword) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    if (pwdForm.newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    setSavingPwd(true);
    try {
      await axiosInstance.put("/users/profile", {
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword,
      });
      toast.success("Đổi mật khẩu thành công!");
      setPwdForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Đổi mật khẩu thất bại");
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) {
    return <AdminLoadingState label="Đang tải hồ sơ..." />;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#f7fdfe_0%,#e9f8fb_48%,#ffffff_100%)] p-5 shadow-xl shadow-cyan-950/8 sm:p-6 lg:p-7">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-primary/12 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
              Hồ sơ quản trị
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Hồ sơ quản trị viên</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Quản lý thông tin tài khoản, bảo mật và thông tin phòng khám hiển thị trên hệ thống.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <HeroMetric icon={ShieldCheck} label="Vai trò" value="Admin" />
            <HeroMetric icon={Building2} label="Phòng khám" value={clinicForm.clinicName || "DentaCare"} />
            <HeroMetric icon={Clock} label="Giờ mở cửa" value={`${clinicForm.openTime}-${clinicForm.closeTime}`} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Avatar & Info Card ── */}
        <Card className="soft-card overflow-hidden border-white/80 bg-white/95 shadow-xl shadow-cyan-950/8 lg:col-span-1">
          <div className="h-24 bg-[linear-gradient(135deg,hsl(var(--primary)/0.20),#dff7fb_70%,#ffffff_100%)]" />
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex flex-col items-center gap-2">
              <AvatarUpload size="lg" />
              <p className="text-xs text-muted-foreground">Nhấn vào ảnh để thay đổi</p>
            </div>
            <CardTitle className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {user?.fullName}
            </CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{infoForm.phone || "Chưa cập nhật"}</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-primary capitalize">Quản trị viên</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Forms ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thông tin cơ bản */}
          <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>Cập nhật họ tên và số điện thoại</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveInfo} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="admin-fullName">Họ và tên</Label>
                    <Input
                      id="admin-fullName"
                      value={infoForm.fullName}
                      onChange={(e) => setInfoForm({ ...infoForm, fullName: e.target.value })}
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-phone">Số điện thoại</Label>
                    <Input
                      id="admin-phone"
                      value={infoForm.phone}
                      onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
                      placeholder="0901234567"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">Email không thể thay đổi</p>
                </div>
                <Button type="submit" disabled={savingInfo}>
                  {savingInfo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu thay đổi"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Đổi mật khẩu */}
          <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Thông tin phòng khám
              </CardTitle>
              <CardDescription>Thông tin này sẽ hiển thị trên LandingPage</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveClinic} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="clinic-name">Tên phòng khám</Label>
                    <Input
                      id="clinic-name"
                      value={clinicForm.clinicName}
                      onChange={(e) => setClinicForm({ ...clinicForm, clinicName: e.target.value })}
                      placeholder="DentaCare"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinic-phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Số điện thoại
                    </Label>
                    <Input
                      id="clinic-phone"
                      value={clinicForm.phone}
                      onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })}
                      placeholder="1900-xxxx"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="clinic-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="clinic-email"
                      type="email"
                      value={clinicForm.email}
                      onChange={(e) => setClinicForm({ ...clinicForm, email: e.target.value })}
                      placeholder="contact@dentacare.vn"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinic-address" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Địa chỉ
                    </Label>
                    <Input
                      id="clinic-address"
                      value={clinicForm.address}
                      onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
                      placeholder="Địa chỉ phòng khám"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="clinic-work-days">Ngày làm việc</Label>
                    <Input
                      id="clinic-work-days"
                      value={clinicForm.workDays}
                      onChange={(e) => setClinicForm({ ...clinicForm, workDays: e.target.value })}
                      placeholder="Thứ 2 - Chủ nhật"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinic-open-time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Giờ mở cửa
                    </Label>
                    <Input
                      id="clinic-open-time"
                      type="time"
                      value={clinicForm.openTime}
                      onChange={(e) => setClinicForm({ ...clinicForm, openTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clinic-close-time" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Giờ đóng cửa
                    </Label>
                    <Input
                      id="clinic-close-time"
                      type="time"
                      value={clinicForm.closeTime}
                      onChange={(e) => setClinicForm({ ...clinicForm, closeTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinic-description">Mô tả phòng khám</Label>
                  <Input
                    id="clinic-description"
                    value={clinicForm.description}
                    onChange={(e) => setClinicForm({ ...clinicForm, description: e.target.value })}
                    placeholder="Mô tả ngắn về phòng khám, địa chỉ hoặc điểm nổi bật"
                  />
                </div>

                <Button type="submit" disabled={savingClinic}>
                  {savingClinic ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu thông tin phòng khám"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Đổi mật khẩu
              </CardTitle>
              <CardDescription>Để bảo mật, hãy sử dụng mật khẩu mạnh</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePwd} className="space-y-4">
                {/* Old password */}
                <div className="space-y-2">
                  <Label htmlFor="admin-oldPwd">Mật khẩu hiện tại</Label>
                  <div className="relative">
                    <Input
                      id="admin-oldPwd"
                      type={showOld ? "text" : "password"}
                      value={pwdForm.oldPassword}
                      onChange={(e) => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
                      placeholder="Nhập mật khẩu hiện tại"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(!showOld)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* New password */}
                  <div className="space-y-2">
                    <Label htmlFor="admin-newPwd">Mật khẩu mới</Label>
                    <div className="relative">
                      <Input
                        id="admin-newPwd"
                        type={showNew ? "text" : "password"}
                        value={pwdForm.newPassword}
                        onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                        placeholder="Ít nhất 6 ký tự"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-2">
                    <Label htmlFor="admin-confirmPwd">Xác nhận mật khẩu mới</Label>
                    <div className="relative">
                      <Input
                        id="admin-confirmPwd"
                        type={showConfirm ? "text" : "password"}
                        value={pwdForm.confirmPassword}
                        onChange={(e) =>
                          setPwdForm({ ...pwdForm, confirmPassword: e.target.value })
                        }
                        placeholder="Nhập lại mật khẩu mới"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button type="submit" variant="outline" disabled={savingPwd}>
                  {savingPwd ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Đổi mật khẩu
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
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
      <p className="mt-1 truncate font-bold text-slate-950">{value}</p>
    </div>
  );
}
