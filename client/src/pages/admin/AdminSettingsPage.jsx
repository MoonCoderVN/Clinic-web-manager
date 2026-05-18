import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Building2, Clock, Mail, Phone, MapPin, Bell, Shield, Loader2, Globe2 } from "lucide-react";
import { AdminLoadingState } from "@/components/admin/AdminUI";
import { toast } from "sonner";
import axiosInstance from "@/api/httpClient";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";

export default function AdminSettingsPage() {
  const refreshKey = useRealtimeRefresh(["settings:changed"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [clinicSettings, setClinicSettings] = useState({
    clinicName: "",
    address: "",
    phone: "",
    email: "",
    openTime: "08:00",
    closeTime: "17:00",
    workDays: "Thứ 2 - Thứ 7",
    description: "",
  });

  const [notifSettings, setNotifSettings] = useState({
    emailNotify: true,
    appointmentReminder: true,
    reminderHoursBefore: 24,
    marketingEmails: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axiosInstance.get("/admin/settings");
        const data = res.data.data;
        if (data) {
          setClinicSettings((prev) => ({
            ...prev,
            clinicName: data.clinicName || "",
            address:    data.address    || "",
            phone:      data.phone      || "",
            email:      data.email      || "",
            openTime:   data.openTime   || "08:00",
            closeTime:  data.closeTime  || "17:00",
            workDays:   data.workDays   || "Thứ 2 - Thứ 7",
          }));
          setNotifSettings((prev) => ({
            ...prev,
            emailNotify:         data.emailNotify         ?? true,
            appointmentReminder: data.appointmentReminder ?? true,
            reminderHoursBefore: data.reminderHoursBefore ?? 24,
            marketingEmails:     data.marketingEmails     ?? false,
          }));
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        toast.error("Không thể tải cài đặt");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [refreshKey]);

  const handleSaveClinicSettings = async () => {
    setSaving(true);
    try {
      await axiosInstance.put("/admin/settings", {
        clinicName: clinicSettings.clinicName,
        address:    clinicSettings.address,
        phone:      clinicSettings.phone,
        email:      clinicSettings.email,
        openTime:   clinicSettings.openTime,
        closeTime:  clinicSettings.closeTime,
        workDays:   clinicSettings.workDays,
        description: clinicSettings.description,
      });
      toast.success("Đã lưu cài đặt phòng khám");
    } catch (err) {
      toast.error("Lưu cài đặt thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await axiosInstance.put("/admin/settings", {
        emailNotify:         notifSettings.emailNotify,
        appointmentReminder: notifSettings.appointmentReminder,
        reminderHoursBefore: notifSettings.reminderHoursBefore,
        marketingEmails:     notifSettings.marketingEmails,
      });
      toast.success("Đã lưu cài đặt thông báo");
    } catch (err) {
      toast.error("Lưu cài đặt thất bại");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminLoadingState label="Đang tải cài đặt hệ thống..." />;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#f7fdfe_0%,#e9f8fb_48%,#ffffff_100%)] p-5 shadow-xl shadow-cyan-950/8 sm:p-6 lg:p-7">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-primary/12 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
              Cài đặt hệ thống
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Thiết lập vận hành DentaCare</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Quản lý thông tin phòng khám, thông báo và các mục bảo mật nền tảng trong một giao diện rõ ràng.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <HeroMetric icon={Building2} label="Phòng khám" value={clinicSettings.clinicName || "DentaCare"} />
            <HeroMetric icon={Clock} label="Giờ làm" value={`${clinicSettings.openTime}-${clinicSettings.closeTime}`} />
            <HeroMetric icon={Globe2} label="Hiển thị" value="Landing" />
          </div>
        </div>
      </div>

      {/* Clinic Information */}
      <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Thông tin phòng khám
          </CardTitle>
          <CardDescription>
            Cập nhật thông tin hiển thị trên trang web
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên phòng khám</Label>
              <Input
                id="name"
                value={clinicSettings.clinicName}
                onChange={(e) => setClinicSettings({ ...clinicSettings, clinicName: e.target.value })} />
              
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Số điện thoại
              </Label>
              <Input
                id="phone"
                value={clinicSettings.phone}
                onChange={(e) => setClinicSettings({ ...clinicSettings, phone: e.target.value })} />
              
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={clinicSettings.email}
                onChange={(e) => setClinicSettings({ ...clinicSettings, email: e.target.value })} />
              
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Địa chỉ
              </Label>
              <Input
                id="address"
                value={clinicSettings.address}
                onChange={(e) => setClinicSettings({ ...clinicSettings, address: e.target.value })} />
              
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="openTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Giờ bắt đầu
              </Label>
              <Input
                id="openTime"
                type="time"
                value={clinicSettings.openTime}
                onChange={(e) => setClinicSettings({ ...clinicSettings, openTime: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="closeTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Giờ kết thúc
              </Label>
              <Input
                id="closeTime"
                type="time"
                value={clinicSettings.closeTime}
                onChange={(e) => setClinicSettings({ ...clinicSettings, closeTime: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="workingDays">Ngày làm việc</Label>
              <Input
                id="workingDays"
                value={clinicSettings.workDays}
                onChange={(e) => setClinicSettings({ ...clinicSettings, workDays: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={clinicSettings.description}
              onChange={(e) => setClinicSettings({ ...clinicSettings, description: e.target.value })}
              rows={3} />
            
          </div>

          <Button onClick={handleSaveClinicSettings} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Cài đặt thông báo
          </CardTitle>
          <CardDescription>
            Quản lý cách gửi thông báo đến người dùng
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="space-y-0.5">
              <Label>Thông báo qua Email</Label>
              <p className="text-sm text-muted-foreground">
                Gửi email xác nhận khi đặt lịch hẹn
              </p>
            </div>
            <Switch
              checked={notifSettings.emailNotify}
              onCheckedChange={(checked) =>
              setNotifSettings({ ...notifSettings, emailNotify: checked })
              } />
            
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="space-y-0.5">
              <Label>Thong bao trong ung dung</Label>
              <p className="text-sm text-muted-foreground">
                Hien thi thong bao realtime trong he thong`r`n              </p>
            </div>
            <Switch
              checked={notifSettings.appointmentReminder}
              onCheckedChange={(checked) =>
              setNotifSettings({ ...notifSettings, appointmentReminder: checked })
              } />
            
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="space-y-0.5">
              <Label>Nhắc nhở lịch hẹn</Label>
              <p className="text-sm text-muted-foreground">
                Tự động gửi nhắc nhở trước lịch hẹn 24 giờ
              </p>
            </div>
            <Switch
              checked={notifSettings.appointmentReminder}
              onCheckedChange={(checked) =>
              setNotifSettings({ ...notifSettings, appointmentReminder: checked })
              } />
            
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="space-y-0.5">
              <Label>Email Marketing</Label>
              <p className="text-sm text-muted-foreground">
                Gửi email khuyến mãi và thông tin mới
              </p>
            </div>
            <Switch
              checked={notifSettings.marketingEmails}
              onCheckedChange={(checked) =>
              setNotifSettings({ ...notifSettings, marketingEmails: checked })
              } />
            
          </div>
          <Button onClick={handleSaveNotifications} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu cài đặt
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Bảo mật
          </CardTitle>
          <CardDescription>
            Cài đặt bảo mật cho hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Đổi mật khẩu Admin</p>
                <p className="text-sm text-muted-foreground">
                  Cập nhật mật khẩu đăng nhập của bạn
                </p>
              </div>
              <Button variant="outline">Đổi mật khẩu</Button>
            </div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Xác thực 2 yếu tố</p>
                <p className="text-sm text-muted-foreground">
                  Bảo vệ tài khoản với xác thực 2 yếu tố
                </p>
              </div>
              <Button variant="outline">Thiết lập</Button>
            </div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Nhật ký hoạt động</p>
                <p className="text-sm text-muted-foreground">
                  Xem lịch sử đăng nhập và hoạt động
                </p>
              </div>
              <Button variant="outline">Xem nhật ký</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);

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
