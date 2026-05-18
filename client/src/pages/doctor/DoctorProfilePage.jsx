import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AvatarUpload from "@/components/common/AvatarUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Award, Loader2, Mail, Phone, Save, Star, Stethoscope, UserRound } from "lucide-react";
import axiosInstance from "@/api/httpClient";

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    specialty: "",
    experience: 0,
    bio: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [userRes, doctorRes] = await Promise.allSettled([
          axiosInstance.get("/users/me"),
          axiosInstance.get("/doctors/profile/me"),
        ]);

        const userData = userRes.status === "fulfilled" ? userRes.value.data.data : {};
        const doctorData = doctorRes.status === "fulfilled" ? doctorRes.value.data.data : {};

        setDoctorProfile(doctorData);
        setFormData({
          name: userData.fullName || "",
          phone: userData.phone || "",
          specialty: doctorData.specialization || doctorData.specialty || "",
          experience: doctorData.experience || 0,
          bio: doctorData.bio || "",
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast.error("Không thể tải hồ sơ bác sĩ");
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchProfile();
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    let hasError = false;

    try {
      await axiosInstance.put("/users/profile", {
        fullName: formData.name,
        phone: formData.phone,
      });
    } catch (error) {
      hasError = true;
      console.error("Failed to update user:", error);
    }

    try {
      await axiosInstance.put("/doctors/profile/me", {
        specialization: formData.specialty,
        experience: formData.experience,
        bio: formData.bio,
      });
    } catch (error) {
      hasError = true;
      console.error("Failed to update doctor profile:", error);
    }

    if (hasError) {
      toast.error("Cập nhật thất bại, vui lòng thử lại");
    } else {
      toast.success("Cập nhật hồ sơ thành công");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-heading">
          <div className="space-y-2"><div className="skeleton h-4 w-24" /><div className="skeleton h-8 w-64" /><div className="skeleton h-4 w-80" /></div>
        </div>
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="soft-card overflow-hidden">
            <div className="skeleton h-24 w-full" />
            <div className="-mt-10 flex flex-col items-center gap-3 p-6">
              <div className="skeleton h-20 w-20 rounded-full" />
              <div className="skeleton h-6 w-36" />
              <div className="skeleton h-4 w-48" />
              <div className="flex gap-2"><div className="skeleton h-5 w-24 rounded-full" /></div>
              {[1,2,3,4].map(i=><div key={i} className="skeleton h-9 w-full rounded-xl" />)}
            </div>
          </div>
          <div className="space-y-6">
            <div className="soft-card p-6 space-y-4"><div className="skeleton h-6 w-40" /><div className="grid gap-4 sm:grid-cols-2">{[1,2].map(i=><div key={i} className="skeleton h-10 rounded-xl" />)}</div></div>
            <div className="soft-card p-6 space-y-4"><div className="skeleton h-6 w-44" /><div className="grid gap-4 sm:grid-cols-2">{[1,2].map(i=><div key={i} className="skeleton h-10 rounded-xl" />)}</div><div className="skeleton h-28 rounded-xl" /></div>
          </div>
        </div>
      </div>
    );
  }

  const rating = Number(doctorProfile?.rating || 0);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#f7fdfe_0%,#e9f8fb_48%,#ffffff_100%)] p-5 shadow-xl shadow-cyan-950/8 sm:p-6 lg:p-7">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-primary/12 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
              Hồ sơ bác sĩ
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Thông tin cá nhân và chuyên môn
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Cập nhật hồ sơ hiển thị cho bệnh nhân, chuyên khoa và kinh nghiệm để tạo sự tin cậy trong từng lịch khám.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <HeroMetric icon={Stethoscope} label="Chuyên khoa" value={formData.specialty || "Bổ sung"} />
            <HeroMetric icon={Award} label="Kinh nghiệm" value={`${formData.experience || 0} năm`} />
            <HeroMetric icon={Star} label="Đánh giá" value={rating > 0 ? rating.toFixed(1) : "Mới"} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="soft-card overflow-hidden border-white/80 bg-white/95 shadow-xl shadow-cyan-950/8">
          <div className="h-24 bg-[linear-gradient(135deg,hsl(var(--primary)/0.20),#dff7fb_70%,#ffffff_100%)]" />
          <CardContent className="-mt-12 space-y-5 p-6">
            <div className="flex flex-col items-center text-center">
              <AvatarUpload size="lg" />
              <p className="mt-2 text-xs text-muted-foreground">Nhấn vào ảnh để thay đổi avatar</p>
              <h2 className="mt-4 text-xl font-bold">BS. {formData.name || user?.fullName}</h2>
              <p className="text-sm text-muted-foreground">
                {formData.specialty || "Chưa cập nhật chuyên khoa"}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Badge variant="secondary">{formData.experience || 0} năm kinh nghiệm</Badge>
                {rating > 0 && <Badge variant="outline">{rating.toFixed(1)}/5 đánh giá</Badge>}
              </div>
            </div>

              <div className="space-y-3 rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="break-all">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{formData.phone || "Chưa cập nhật số điện thoại"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <span>{formData.specialty || "Chưa cập nhật chuyên khoa"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span>{formData.experience || 0} năm kinh nghiệm</span>
              </div>
            </div>

            {rating > 0 && (
              <div className="rounded-xl border bg-yellow-50/70 p-4 text-center">
                <div className="flex justify-center text-yellow-500">
                  {Array.from({ length: Math.max(1, Math.floor(rating)) }).map((_, index) => (
                    <Star key={index} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <p className="mt-1 text-sm text-yellow-800">Đánh giá trung bình từ bệnh nhân</p>
              </div>
            )}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                Thông tin cá nhân
              </CardTitle>
              <CardDescription>Thông tin liên hệ dùng trong hồ sơ và lịch hẹn.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Họ và tên</Label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="field-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <input
                  id="phone"
                  type="text"
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                  placeholder="0901234567"
                  className="field-input"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Thông tin chuyên môn
              </CardTitle>
              <CardDescription>Chuyên khoa, kinh nghiệm và giới thiệu ngắn về bác sĩ.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="specialty">Chuyên khoa</Label>
                  <input
                    id="specialty"
                    type="text"
                    value={formData.specialty}
                    onChange={(event) => setFormData({ ...formData, specialty: event.target.value })}
                    placeholder="Nha khoa tổng quát"
                    className="field-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Kinh nghiệm (năm)</Label>
                  <input
                    id="experience"
                    type="number"
                    min="0"
                    value={formData.experience}
                    onChange={(event) =>
                      setFormData({ ...formData, experience: Number(event.target.value) || 0 })
                    }
                    className="field-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Giới thiệu bản thân</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                  placeholder="Mô tả kinh nghiệm, chuyên môn và phong cách điều trị của bạn..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary min-w-40">
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Đang lưu...</>
              ) : (
                <><Save className="h-4 w-4" />Lưu thay đổi</>
              )}
            </button>
          </div>
        </form>
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
