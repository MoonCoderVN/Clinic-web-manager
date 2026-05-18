import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, Clock, Star, Stethoscope, UserRound } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axiosInstance from "@/api/httpClient";
import { useAuth } from "@/context/AuthContext";
import { getUploadUrl } from "@/utils/getMediaUrl";

const DAY_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0];

const trustChips = [
  { title: "Tư vấn rõ ràng", icon: UserRound },
  { title: "Điều trị nhẹ nhàng", icon: Stethoscope },
  { title: "Theo dõi sau khám", icon: Calendar },
];

const getDoctorInitial = (name) => name.replace(/^BS\.?\s*/i, "").trim()[0]?.toUpperCase() || "D";
const getDoctorName = (doctor) => doctor?.userId?.fullName || doctor?.name || "Bác sĩ DentaCare";
const getSpecialty = (doctor) => doctor?.specialization || doctor?.specialty || "Nha khoa tổng quát";

export default function DoctorDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, role } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
  const bookingHref = isAuthenticated && role === "patient" ? "/patient/book" : "/login";

  useEffect(() => {
    const fetchDoctor = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/doctors/${id}`);
        const detail = res.data.data || res.data.doctor || res.data;
        setDoctor(detail);

        const doctorUserId = detail?.userId?._id || detail?.userId;
        if (doctorUserId) {
          const scheduleRes = await axiosInstance.get(`/schedules/doctor/${doctorUserId}`);
          setSchedules(scheduleRes.data.data || scheduleRes.data.schedules || []);
        } else {
          setSchedules([]);
        }
      } catch {
        setDoctor(null);
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="py-24 text-center text-muted-foreground">Đang tải hồ sơ bác sĩ...</div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Không tìm thấy bác sĩ</h1>
          <p className="mt-2 text-muted-foreground">Hồ sơ bác sĩ không tồn tại hoặc đang tạm ẩn.</p>
          <Button className="mt-6" asChild>
            <Link to="/">Về trang chủ</Link>
          </Button>
        </div>
      </div>
    );
  }

  const name = getDoctorName(doctor);
  const displayName = name.replace(/^BS\.?\s*/i, "");
  const specialty = getSpecialty(doctor);
  const activeServices = (doctor.services || []).filter((service) => service?.isActive !== false);
  const scheduleByDay = new Map((schedules || []).map((item) => [Number(item.dayOfWeek), item]));
  const doctorImage = !imageFailed
    ? getUploadUrl(doctor.userId?.avatar || doctor.avatar, doctor.userId?.updatedAt || doctor.updatedAt)
    : "";
  const experience = Number(doctor.experience || 0);
  const rating = Number(doctor.rating || 5);
  const bio =
    doctor.bio ||
    "Bác sĩ DentaCare luôn ưu tiên tư vấn rõ ràng, điều trị nhẹ nhàng và theo dõi sát quá trình phục hồi của bệnh nhân.";

  const DoctorImage = ({ compact = false }) => (
    <div className={`relative overflow-hidden bg-slate-900 text-white ${compact ? "aspect-[4/3] rounded-[22px]" : "min-h-[520px] rounded-[36px]"}`}>
      {doctorImage ? (
        <img
          src={doctorImage}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_28%),linear-gradient(135deg,#1597a8,#0f3f4a)]">
          <div className={`${compact ? "h-24 w-24 text-4xl" : "h-32 w-32 text-6xl"} flex items-center justify-center rounded-full border border-white/35 bg-white/18 font-bold shadow-2xl shadow-cyan-950/20 backdrop-blur-sm`}>
            {getDoctorInitial(name)}
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/72 via-slate-950/12 to-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--surface-subtle)_0%,#ffffff_48%,var(--background)_100%)]">
      <Navbar />
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(20,184,166,0.18),transparent_28rem),radial-gradient(circle_at_88%_4%,rgba(6,182,212,0.18),transparent_30rem)]" />
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-16">
            <div className="relative shadow-2xl shadow-cyan-950/14">
              <DoctorImage />
              <div className="absolute inset-x-6 bottom-6 rounded-[28px] border border-white/18 bg-white/14 p-5 text-white backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">Hồ sơ bác sĩ</p>
                <h1 className="mt-2 text-3xl font-bold leading-tight">BS. {displayName}</h1>
                <p className="mt-1 text-cyan-100">{specialty}</p>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <Badge className="mb-5 w-fit rounded-full border-primary/15 bg-primary/10 px-4 py-1.5 text-primary hover:bg-primary/10">
                DentaCare Specialist
              </Badge>
              <h2 className="max-w-3xl text-4xl font-bold leading-tight text-foreground md:text-6xl">
                Đồng hành cùng bạn trong từng kế hoạch điều trị.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                BS. {displayName} tập trung vào tư vấn dễ hiểu, điều trị nhẹ nhàng và theo dõi sát sao để mỗi lần thăm khám rõ ràng, thoải mái hơn.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Badge className="rounded-full bg-amber-50 px-4 py-2 text-amber-700 hover:bg-amber-50">
                  <Star className="mr-1.5 h-4 w-4 fill-current" />
                  {Number.isFinite(rating) ? rating.toFixed(1) : "5.0"} đánh giá
                </Badge>
                <Badge variant="outline" className="rounded-full bg-white px-4 py-2">
                  {Number.isFinite(experience) ? experience : 0} năm kinh nghiệm
                </Badge>
                <Badge variant="outline" className="rounded-full bg-white px-4 py-2">
                  {activeServices.length || "Đang cập nhật"} dịch vụ phụ trách
                </Badge>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {trustChips.map((chip) => (
                  <div key={chip.title} className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
                    <chip.icon className="mb-3 h-5 w-5 text-primary" />
                    <p className="text-sm font-bold text-foreground">{chip.title}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button className="h-12 rounded-full px-7 text-base" asChild>
                  <Link to={bookingHref}>
                    <Calendar className="mr-2 h-5 w-5" />
                    Đặt lịch với bác sĩ
                  </Link>
                </Button>
                <Button variant="outline" className="h-12 rounded-full bg-white px-7 text-base" asChild>
                  <Link to="/doctors">Xem bác sĩ khác</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <div className="space-y-8">
            <Card className="overflow-hidden rounded-[28px] border-white/80 bg-white/95 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <UserRound className="h-6 w-6 text-primary" />
                  Giới thiệu chuyên môn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-[24px] bg-primary/8 p-6">
                  <p className="text-lg font-semibold leading-8 text-slate-800">"{bio}"</p>
                </div>
                <p className="mt-5 text-sm leading-7 text-muted-foreground">
                  DentaCare ưu tiên trải nghiệm điều trị có kế hoạch, trong đó bác sĩ trao đổi rõ ràng về tình trạng hiện tại, lựa chọn điều trị và các bước chăm sóc sau khám.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-white/80 bg-white/95 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Stethoscope className="h-6 w-6 text-primary" />
                  Dịch vụ phụ trách
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeServices.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-slate-50 p-6 text-sm text-muted-foreground">
                    Đang cập nhật dịch vụ phụ trách.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {activeServices.map((service) => (
                      <div key={service._id || service.name} className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Stethoscope className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{service.name}</p>
                          {service.category && <p className="mt-1 text-xs text-muted-foreground">{service.category}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-white/80 bg-white/95 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Clock className="h-6 w-6 text-primary" />
                  Lịch làm việc
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ORDERED_DAYS.map((day) => {
                    const schedule = scheduleByDay.get(day);
                    return (
                      <div
                        key={day}
                        className={`rounded-2xl border px-4 py-4 ${
                          schedule ? "border-primary/15 bg-primary/8" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-slate-900">{DAY_LABELS[day]}</span>
                          {schedule ? (
                            <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-primary shadow-sm">
                              {schedule.startTime} - {schedule.endTime}
                            </span>
                          ) : (
                            <span className="rounded-full bg-white px-3 py-1 text-sm text-muted-foreground">Nghỉ</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="rounded-[28px] border-white/80 bg-white/95 shadow-xl shadow-cyan-950/8">
              <CardContent className="p-6">
                <DoctorImage compact />
                <h3 className="mt-5 text-2xl font-bold text-slate-900">BS. {displayName}</h3>
                <p className="mt-1 text-primary">{specialty}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50">
                    <Star className="mr-1 h-3.5 w-3.5 fill-current" />
                    {Number.isFinite(rating) ? rating.toFixed(1) : "5.0"}
                  </Badge>
                  <Badge variant="outline">{Number.isFinite(experience) ? experience : 0} năm kinh nghiệm</Badge>
                </div>
                <Button className="mt-6 h-12 w-full rounded-full" asChild>
                  <Link to={bookingHref}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Đặt lịch với bác sĩ
                  </Link>
                </Button>
                <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
                  Bạn có thể chọn dịch vụ, ngày khám và khung giờ phù hợp sau khi đăng nhập.
                </p>
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>
    </div>
  );
}
