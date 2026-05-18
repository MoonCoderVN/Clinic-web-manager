import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Calendar, HeartPulse, Search, ShieldCheck, Star, Stethoscope, UserRound } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import axiosInstance from "@/api/httpClient";
import { useAuth } from "@/context/AuthContext";
import { getUploadUrl } from "@/utils/getMediaUrl";

const normalizeText = (value = "") =>
  String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const getDoctorName = (doctor) => {
  const name = doctor.userId?.fullName || doctor.name || "Bác sĩ DentaCare";
  return name.trim().startsWith("BS.") ? name : `BS. ${name}`;
};

const getDoctorAvatar = (doctor) => doctor.userId?.avatar || doctor.avatar || "";

const getDoctorInitial = (name) => name.replace(/^BS\.?\s*/i, "").trim()[0]?.toUpperCase() || "D";

function DoctorCard({ doctor }) {
  const [imageFailed, setImageFailed] = useState(false);
  const name = getDoctorName(doctor);
  const specialty = doctor.specialization || doctor.specialty || "Nha khoa tổng quát";
  const experience = Number(doctor.experience);
  const rating = Number(doctor.rating || 5);
  const imageSrc = !imageFailed ? getUploadUrl(getDoctorAvatar(doctor), doctor.userId?.updatedAt || doctor.updatedAt) : "";

  return (
    <article className="group relative min-h-[430px] overflow-hidden rounded-[30px] bg-slate-900 text-white shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/15 focus-within:shadow-2xl focus-within:shadow-primary/15 motion-reduce:transform-none motion-reduce:transition-none">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 motion-reduce:transform-none"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_28%),linear-gradient(135deg,#1597a8,#0f3f4a)]">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/35 bg-white/18 text-5xl font-bold shadow-2xl shadow-cyan-950/20 backdrop-blur-sm">
            {getDoctorInitial(name)}
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent transition-colors duration-500 group-hover:from-slate-950 group-hover:via-slate-950/62" />

      <div className="absolute inset-x-0 bottom-0 p-6">
        <div className="transition-transform duration-500 group-hover:-translate-y-2 motion-reduce:transform-none">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/62">{specialty}</p>
          <h2 className="mt-2 text-2xl font-bold leading-tight text-white">{name}</h2>
        </div>

        <div className="grid max-h-0 gap-4 overflow-hidden opacity-0 transition-all duration-500 group-hover:mt-5 group-hover:max-h-64 group-hover:opacity-100 group-focus-within:mt-5 group-focus-within:max-h-64 group-focus-within:opacity-100">
          <p className="line-clamp-3 text-sm leading-6 text-white/76">
            {doctor.bio ||
              "Bác sĩ DentaCare ưu tiên tư vấn rõ ràng, điều trị nhẹ nhàng và đồng hành sát sao cùng bệnh nhân."}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/14 px-3 py-1 text-white/86 backdrop-blur-sm">
              {Number.isFinite(experience) && experience > 0 ? `${experience} năm kinh nghiệm` : "Đang cập nhật"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/14 px-3 py-1 text-white/86 backdrop-blur-sm">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              {Number.isFinite(rating) ? rating.toFixed(1) : "5.0"}
            </span>
          </div>
          <Link
            to={`/doctors/${doctor._id}`}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-primary shadow-lg shadow-black/10 transition hover:bg-cyan-50"
          >
            Xem hồ sơ
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

const doctorHeroHighlights = [
  { title: "Chuyên khoa rõ ràng", desc: "Dễ chọn bác sĩ theo nhu cầu điều trị", icon: BadgeCheck },
  { title: "Kinh nghiệm điều trị", desc: "Thông tin hồ sơ và chuyên môn minh bạch", icon: ShieldCheck },
  { title: "Theo dõi sau khám", desc: "Đồng hành trong từng bước chăm sóc", icon: HeartPulse },
];

function HeroDoctorAvatar({ doctor, index }) {
  const [imageFailed, setImageFailed] = useState(false);
  const name = doctor ? getDoctorName(doctor) : `BS. DentaCare ${index + 1}`;
  const specialty = doctor?.specialization || doctor?.specialty || "Nha khoa tổng quát";
  const imageSrc = doctor && !imageFailed ? getUploadUrl(getDoctorAvatar(doctor), doctor.userId?.updatedAt || doctor.updatedAt) : "";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-white p-3 shadow-sm">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#1597a8,#0f6372)] text-white">
        {imageSrc ? (
          <img src={imageSrc} alt={name} className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-bold">{getDoctorInitial(name)}</div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-bold text-slate-950">{name}</p>
        <p className="truncate text-sm text-muted-foreground">{specialty}</p>
      </div>
    </div>
  );
}

export default function DoctorsPage() {
  const { isAuthenticated, role } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const bookingHref = isAuthenticated && role === "patient" ? "/patient/book" : "/login";

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get("/doctors");
        const items = res.data.data || res.data.doctors || [];
        setDoctors(Array.isArray(items) ? items.filter((doctor) => doctor?.userId?.isActive !== false) : []);
      } catch {
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const filteredDoctors = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return doctors;
    return doctors.filter((doctor) =>
      normalizeText([
        getDoctorName(doctor),
        doctor.specialization,
        doctor.specialty,
        doctor.bio,
        doctor.userId?.email,
      ].join(" ")).includes(query)
    );
  }, [doctors, search]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#f7fdfe_0%,#e9f8fb_48%,#ffffff_100%)] py-16 text-slate-950 sm:py-20 lg:py-24">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_18%,rgba(20,184,166,0.18),transparent_28rem),radial-gradient(circle_at_88%_12%,rgba(6,182,212,0.16),transparent_30rem)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-white to-transparent" />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div>
              <Badge className="mb-5 rounded-full border-primary/15 bg-primary/10 px-4 py-1.5 text-primary hover:bg-primary/10">Đội ngũ bác sĩ</Badge>
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
                Đội ngũ bác sĩ đồng hành cùng kế hoạch điều trị của bạn
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Xem hồ sơ, chuyên khoa và kinh nghiệm trong một giao diện rõ ràng để chọn bác sĩ phù hợp cho từng mục tiêu chăm sóc răng miệng.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/20" asChild>
                  <Link to={bookingHref}>
                    <Calendar className="mr-2 h-5 w-5" />
                    Đặt lịch ngay
                  </Link>
                </Button>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span className="rounded-full border border-primary/10 bg-white/80 px-3 py-2 shadow-sm">{doctors.length || "Nhiều"} bác sĩ</span>
                  <span className="rounded-full border border-primary/10 bg-white/80 px-3 py-2 shadow-sm">Hồ sơ rõ ràng</span>
                  <span className="rounded-full border border-primary/10 bg-white/80 px-3 py-2 shadow-sm">Đặt lịch linh hoạt</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
              <div className="absolute -right-6 bottom-8 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/88 p-5 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl">
                <div className="rounded-[24px] bg-[linear-gradient(135deg,hsl(var(--primary))_0%,#12a6b7_100%)] p-5 text-white">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-cyan-50">Ngôi nhà chuyên gia</p>
                      <h2 className="mt-2 text-2xl font-bold">Chọn người đồng hành phù hợp</h2>
                    </div>
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/18">
                      <UserRound className="h-7 w-7" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {(doctors.length ? doctors.slice(0, 3) : [null, null, null]).map((doctor, index) => (
                    <HeroDoctorAvatar key={doctor?._id || index} doctor={doctor} index={index} />
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {doctorHeroHighlights.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
                      <item.icon className="mb-3 h-5 w-5 text-primary" />
                      <p className="text-sm font-bold text-slate-950">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="soft-card mb-8 flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm bác sĩ, chuyên khoa hoặc mô tả..."
                className="h-11 rounded-xl pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Đang tải danh sách bác sĩ...</div>
          ) : filteredDoctors.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                Chưa có bác sĩ phù hợp.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredDoctors.map((doctor) => (
                <DoctorCard key={doctor._id} doctor={doctor} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
