import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Baby,
  BadgeCheck,
  Calendar,
  Clock,
  HeartPulse,
  Search,
  ShieldCheck,
  Smile,
  Sparkles,
  Stethoscope,
  Crown,
  WalletCards,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import axiosInstance from "@/api/httpClient";
import { getUploadUrl } from "@/utils/getMediaUrl";
import { useAuth } from "@/context/AuthContext";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const normalizeText = (value = "") =>
  String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const getServiceIcon = (service) => {
  const text = normalizeText([service?.name, service?.category, service?.description].join(" "));
  if (text.includes("implant") || text.includes("cay ghep")) return Stethoscope;
  if (text.includes("nieng") || text.includes("chinh nha")) return Smile;
  if (text.includes("su") || text.includes("tham my") || text.includes("tay trang")) return Crown;
  if (text.includes("tre em") || text.includes("nhi")) return Baby;
  return HeartPulse;
};

const getServiceTagline = (service) => {
  const text = normalizeText([service?.name, service?.category, service?.description].join(" "));
  if (text.includes("implant") || text.includes("cay ghep")) return "Giải pháp tiên tiến cho người mất răng";
  if (text.includes("nieng") || text.includes("chinh nha")) return "Căn chỉnh nụ cười với kế hoạch cá nhân hóa";
  if (text.includes("su") || text.includes("tham my") || text.includes("tay trang")) return "Khắc phục khiếm khuyết, nâng tầm thẩm mỹ nụ cười";
  if (text.includes("tre em") || text.includes("nhi")) return "Chăm sóc nhẹ nhàng cho nụ cười đầu đời";
  if (text.includes("tong quat") || text.includes("kham") || text.includes("tram")) return "Chẩn đoán và điều trị kịp thời bệnh lý răng miệng";
  return "Chăm sóc chuyên sâu cho nụ cười khỏe đẹp";
};

function ServiceImage({ service, Icon }) {
  const [failed, setFailed] = useState(false);
  const image = typeof service?.image === "string" ? service.image.trim() : "";
  const src = !failed && image ? getUploadUrl(image, service?.updatedAt) : "";

  if (src) {
    return (
      <img
        src={src}
        alt={service?.name || "Dịch vụ nha khoa"}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transform-none"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.95),transparent_28%),linear-gradient(135deg,rgba(26,158,172,0.16),rgba(15,99,114,0.78))] text-white">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/35 bg-white/18 shadow-2xl shadow-cyan-950/20 backdrop-blur-sm">
        <Icon className="h-8 w-8" />
      </div>
    </div>
  );
}

function ServiceCard({ service, bookingHref }) {
  const Icon = getServiceIcon(service);

  return (
    <article className="group flex min-h-[560px] flex-col rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/10 focus-within:shadow-2xl focus-within:shadow-primary/10 motion-reduce:transform-none motion-reduce:transition-none">
      <div className="relative aspect-[16/10] overflow-visible">
        <div className="h-full overflow-hidden rounded-2xl bg-slate-100">
          <ServiceImage service={service} Icon={Icon} />
        </div>
        <div className="absolute -bottom-8 right-5 flex h-16 w-16 items-center justify-center rounded-full border-[6px] border-white bg-white text-primary shadow-xl shadow-slate-900/12">
          <Icon className="h-8 w-8 transition-transform duration-500 group-hover:scale-110 motion-reduce:transform-none" />
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-12">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full px-3 py-1">{service.category || "Nha khoa"}</Badge>
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {service.duration || 30} phút
          </span>
        </div>
        <h2 className="line-clamp-2 text-[1.65rem] font-bold leading-tight text-slate-900 md:text-3xl">{service.name}</h2>
        <p className="mt-3 line-clamp-2 text-base font-semibold leading-6 text-primary">
          {getServiceTagline(service)}
        </p>
        <p className="mt-3 line-clamp-5 text-[15px] leading-7 text-slate-600">
          {service.description || "Dịch vụ nha khoa được thực hiện bởi đội ngũ bác sĩ DentaCare."}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
          <p className="font-bold text-primary">{formatCurrency(service.price)}</p>
          <Button variant="outline" asChild>
            <Link to={bookingHref}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Tìm hiểu thêm
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

const serviceHeroHighlights = [
  { title: "Tư vấn đúng nhu cầu", desc: "Chọn dịch vụ theo tình trạng răng miệng", icon: BadgeCheck },
  { title: "Chi phí minh bạch", desc: "Xem giá tham khảo trước khi đặt lịch", icon: WalletCards },
  { title: "Quy trình nhẹ nhàng", desc: "Theo dõi rõ ràng từ tư vấn đến tái khám", icon: Sparkles },
];

export default function ServicesPage() {
  const { isAuthenticated, role } = useAuth();
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const bookingHref = isAuthenticated && role === "patient" ? "/patient/book" : "/login";

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get("/services");
        const items = res.data.data || res.data.services || [];
        setServices(Array.isArray(items) ? items.filter((s) => s?.isActive !== false) : []);
      } catch {
        setServices([]);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const filteredServices = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return services;
    return services.filter((service) =>
      normalizeText([service.name, service.description, service.category].join(" ")).includes(query)
    );
  }, [search, services]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#f7fdfe_0%,#e9f8fb_48%,#ffffff_100%)] py-16 text-slate-950 sm:py-20 lg:py-24">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(20,184,166,0.18),transparent_28rem),radial-gradient(circle_at_86%_12%,rgba(6,182,212,0.16),transparent_30rem)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-white to-transparent" />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div>
              <Badge className="mb-5 rounded-full border-primary/15 bg-primary/10 px-4 py-1.5 text-primary hover:bg-primary/10">Dịch vụ nha khoa</Badge>
              <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
                Dịch vụ nha khoa chuyên sâu cho từng nhu cầu điều trị
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Xem mô tả, thời lượng và giá tham khảo trong một không gian rõ ràng để chọn dịch vụ phù hợp trước khi đặt lịch tại DentaCare.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button className="h-12 rounded-full px-7 text-base shadow-lg shadow-primary/20" asChild>
                  <Link to={bookingHref}>
                    <Calendar className="mr-2 h-5 w-5" />
                    Đặt lịch ngay
                  </Link>
                </Button>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span className="rounded-full border border-primary/10 bg-white/80 px-3 py-2 shadow-sm">{services.length || "Nhiều"} dịch vụ</span>
                  <span className="rounded-full border border-primary/10 bg-white/80 px-3 py-2 shadow-sm">Thời lượng rõ ràng</span>
                  <span className="rounded-full border border-primary/10 bg-white/80 px-3 py-2 shadow-sm">Đặt lịch 24/7</span>
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
                      <p className="text-sm font-semibold text-cyan-50">Kế hoạch chăm sóc</p>
                      <h2 className="mt-2 text-2xl font-bold">Chọn đúng dịch vụ, hiểu rõ lộ trình</h2>
                    </div>
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/18">
                      <Stethoscope className="h-7 w-7" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {serviceHeroHighlights.map((item) => (
                    <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-950">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                      </div>
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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm dịch vụ, danh mục hoặc mô tả..."
                className="h-11 rounded-xl pl-10"
              />
            </div>
            <span className="text-sm text-muted-foreground">{filteredServices.length} dịch vụ đang hiển thị</span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Đang tải dịch vụ...</div>
          ) : filteredServices.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">Chưa có dịch vụ phù hợp.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map((service) => (
                <ServiceCard key={service._id} service={service} bookingHref={bookingHref} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
