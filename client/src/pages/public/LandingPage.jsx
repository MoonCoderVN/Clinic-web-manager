import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle,
  Clock,
  FlaskConical,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import Navbar from "../../components/layout/Navbar";
import axiosInstance from "@/api/httpClient";
import { useRealtimeRefresh } from "../../hooks/useRealtimeEvent";
import { getUploadUrl } from "../../utils/getMediaUrl";

const heroSlides = [
  {
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2070&auto=format&fit=crop",
    alt: "Phòng điều trị nha khoa hiện đại",
    position: "center",
  },
  {
    image: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?q=80&w=2070&auto=format&fit=crop",
    alt: "Bác sĩ nha khoa tư vấn cho bệnh nhân",
    position: "center",
  },
  {
    image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?q=80&w=2070&auto=format&fit=crop",
    alt: "Nụ cười sau chăm sóc nha khoa",
    position: "center",
  },
  {
    image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=2070&auto=format&fit=crop",
    alt: "Thiết bị và ghế nha khoa",
    position: "center",
  },
];

const fallbackClinic = {
  clinicName: "DentaCare",
  description:
    "Hệ thống phòng khám nha khoa hiện đại với đội ngũ bác sĩ chuyên nghiệp, trang thiết bị tiên tiến.",
  phone: "1900-xxxx",
  email: "",
  address: "",
  workDays: "Thứ 2 - Chủ nhật",
  openTime: "08:00",
  closeTime: "20:00",
};

const fallbackServices = [
  {
    title: "Khám tổng quát",
    description:
      "Kiểm tra sức khỏe răng miệng toàn diện, phát hiện sớm các vấn đề.",
    price: "200.000đ",
    icon: CheckCircle,
  },
  {
    title: "Trám răng thẩm mỹ",
    description:
      "Phục hồi răng sâu, mất răng bằng vật liệu cao cấp.",
    price: "300.000đ - 800.000đ",
    icon: FlaskConical,
  },
  {
    title: "Tẩy trắng răng",
    description:
      "Làm trắng răng an toàn, hiệu quả với công nghệ hiện đại.",
    price: "1.500.000đ - 3.000.000đ",
    icon: Star,
  },
  {
    title: "Niềng răng chỉnh nha",
    description:
      "Chỉnh nha thẩm mỹ, niềng răng mắc cài và trong suốt.",
    price: "20.000.000đ - 80.000.000đ",
    icon: ShieldCheck,
  },
];

const features = [
  {
    title: "Đội ngũ bác sĩ chuyên nghiệp",
    description: "Các bác sĩ giàu kinh nghiệm, được đào tạo chuyên sâu.",
    icon: Users,
  },
  {
    title: "Trang thiết bị hiện đại",
    description: "Sử dụng công nghệ tiên tiến nhất trong ngành nha khoa.",
    icon: FlaskConical,
  },
  {
    title: "Đặt lịch dễ dàng",
    description: "Đặt lịch hẹn trực tuyến 24/7, nhận thông báo tự động.",
    icon: Calendar,
  },
  {
    title: "Hỗ trợ tận tâm",
    description: "Dịch vụ chăm sóc khách hàng 24/7, tư vấn miễn phí.",
    icon: Phone,
  },
];

const trustStats = [
  { value: "10+", label: "năm đồng hành" },
  { value: "20+", label: "bác sĩ chuyên khoa" },
  { value: "24/7", label: "đặt lịch trực tuyến" },
  { value: "4.9", label: "đánh giá hài lòng" },
];

const storyPoints = [
  {
    title: "Tư vấn rõ ràng",
    description: "Bác sĩ giải thích kế hoạch điều trị, chi phí và thời gian theo cách dễ hiểu trước khi bắt đầu.",
    icon: CheckCircle,
  },
  {
    title: "Điều trị nhẹ nhàng",
    description: "Không gian sạch, quy trình gọn và thiết bị hiện đại giúp bệnh nhân an tâm hơn trong từng lần hẹn.",
    icon: ShieldCheck,
  },
  {
    title: "Theo dõi sau khám",
    description: "Lịch hẹn, kết quả và nhắc tái khám được quản lý trên hệ thống để việc chăm sóc không bị gián đoạn.",
    icon: Calendar,
  },
];

const testimonials = [
  {
    name: "Nguyễn Thị Lan",
    role: "Bệnh nhân chỉnh nha",
    quote: "Bác sĩ tư vấn rất kỹ, mỗi giai đoạn đều có lịch theo dõi rõ ràng. Tôi cảm thấy yên tâm hơn rất nhiều khi điều trị lâu dài.",
    result: "Nụ cười đều hơn sau 18 tháng",
    rating: 5,
    initial: "L",
  },
  {
    name: "Trần Văn Minh",
    role: "Bệnh nhân Implant",
    quote: "Tôi từng rất lo về phẫu thuật, nhưng quy trình được giải thích chi tiết và thực hiện nhẹ nhàng hơn tôi nghĩ.",
    result: "Ăn nhai ổn định, tái khám đúng hẹn",
    rating: 5,
    initial: "M",
  },
  {
    name: "Lê Thị Hoa",
    role: "Bệnh nhân thẩm mỹ nụ cười",
    quote: "Đặt lịch online nhanh, nhân viên thân thiện, bác sĩ trao đổi rất rõ về màu răng và cách chăm sóc sau điều trị.",
    result: "Răng sáng tự nhiên sau điều trị",
    rating: 5,
    initial: "H",
  },
];

const fallbackDoctors = [
  {
    name: "BS. Nguyễn Văn A",
    initial: "A",
    specialty: "Chỉnh nha",
    experience: "15 năm kinh nghiệm",
    rating: "4.9",
  },
  {
    name: "BS. Trần Thị B",
    initial: "B",
    specialty: "Nha khoa tổng quát",
    experience: "12 năm kinh nghiệm",
    rating: "4.8",
  },
  {
    name: "BS. Lê Văn C",
    initial: "C",
    specialty: "Phẫu thuật Implant",
    experience: "10 năm kinh nghiệm",
    rating: "4.9",
  },
];

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const formatPrice = (price) => {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return "Liên hệ";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

const getServiceIcon = (service) => {
  const searchable = `${service.name || ""} ${service.category || ""}`.toLowerCase();
  if (searchable.includes("trám") || searchable.includes("tram")) return FlaskConical;
  if (searchable.includes("tẩy") || searchable.includes("trắng") || searchable.includes("tay") || searchable.includes("trang")) return Star;
  if (searchable.includes("niềng") || searchable.includes("chỉnh") || searchable.includes("nieng") || searchable.includes("chinh")) return ShieldCheck;
  if (searchable.includes("implant") || searchable.includes("phẫu") || searchable.includes("phau")) return Award;
  return CheckCircle;
};

const getServiceTagline = (service) => {
  const searchable = `${service.name || ""} ${service.category || ""}`.toLowerCase();
  if (searchable.includes("implant")) return "Giải pháp tiên tiến cho người mất răng";
  if (searchable.includes("niềng") || searchable.includes("chỉnh") || searchable.includes("nieng") || searchable.includes("chinh")) {
    return "Lấy lại nụ cười thẳng đều, chuẩn khớp cắn";
  }
  if (
    searchable.includes("thẩm mỹ") ||
    searchable.includes("tham my") ||
    searchable.includes("tẩy") ||
    searchable.includes("trắng") ||
    searchable.includes("tay") ||
    searchable.includes("trang") ||
    searchable.includes("sứ") ||
    searchable.includes("su")
  ) {
    return "Khắc phục khiếm khuyết của răng và nướu";
  }
  if (searchable.includes("trẻ em") || searchable.includes("tre em") || searchable.includes("nhi")) {
    return "Chăm sóc nhẹ nhàng cho nụ cười đầu đời";
  }
  if (
    searchable.includes("tổng quát") ||
    searchable.includes("tong quat") ||
    searchable.includes("khám") ||
    searchable.includes("kham") ||
    searchable.includes("trám") ||
    searchable.includes("tram") ||
    searchable.includes("tủy") ||
    searchable.includes("tuy") ||
    searchable.includes("cạo vôi") ||
    searchable.includes("cao voi")
  ) {
    return "Chẩn đoán và điều trị kịp thời bệnh lý răng miệng";
  }
  return "Chăm sóc chuyên sâu cho nụ cười khỏe đẹp";
};

const normalizeService = (service) => ({
  title: service.name || "Dịch vụ nha khoa",
  description:
    service.description ||
    "Dịch vụ nha khoa chất lượng cao được thực hiện bởi đội ngũ chuyên nghiệp.",
  price: formatPrice(service.price),
  tagline: getServiceTagline(service),
  icon: getServiceIcon(service),
  image: typeof service.image === "string" ? service.image.trim() : "",
  updatedAt: service.updatedAt,
});

const ServiceIconFallback = ({ service }) => (
  <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.95),transparent_28%),linear-gradient(135deg,rgba(26,158,172,0.16),rgba(15,99,114,0.78))] text-white">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/35 bg-white/18 shadow-2xl shadow-cyan-950/20 backdrop-blur-sm">
      <service.icon className="h-8 w-8" />
    </div>
  </div>
);

const LandingServiceCard = ({ service }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const serviceImage = !imageFailed ? getUploadUrl(service.image, service.updatedAt) : "";

  return (
    <article className="group flex min-h-[560px] flex-col rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/10 focus-within:shadow-2xl focus-within:shadow-primary/10 motion-reduce:transform-none motion-reduce:transition-none">
      <div className="relative aspect-[16/10] overflow-visible">
        <div className="h-full overflow-hidden rounded-2xl bg-slate-100">
          {serviceImage ? (
            <img
              src={serviceImage}
              alt={service.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transform-none"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <ServiceIconFallback service={service} />
          )}
        </div>
        <div className="absolute -bottom-6 right-5 flex h-14 w-14 items-center justify-center rounded-full border-[6px] border-white bg-white text-primary shadow-lg shadow-slate-900/10">
          <service.icon className="h-7 w-7 transition-transform duration-500 group-hover:scale-110 motion-reduce:transform-none" />
        </div>
      </div>
      <div className="flex flex-1 flex-col pt-10">
        <h3 className="line-clamp-2 text-[1.65rem] font-bold leading-tight text-slate-900 md:text-3xl">{service.title}</h3>
        <p className="mt-3 line-clamp-2 text-base font-semibold leading-6 text-primary">
          {service.tagline}
        </p>
        <p className="mt-3 line-clamp-5 text-[15px] leading-7 text-slate-600">{service.description}</p>
        <Link
          to="/services"
          className="mt-auto inline-flex w-fit items-center justify-center rounded-full border border-primary px-6 py-3 text-sm font-bold text-primary transition-all duration-300 hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Tìm hiểu thêm
        </Link>
      </div>
    </article>
  );
};

const getDoctorName = (doctor) => {
  const rawName = doctor.userId?.fullName || doctor.name || "Bác sĩ DentaCare";
  return rawName.trim().startsWith("BS.") ? rawName : `BS. ${rawName}`;
};

const getInitial = (name) => {
  const cleaned = name.replace(/^BS\.\s*/i, "").trim();
  return (cleaned[0] || name[0] || "D").toUpperCase();
};

const normalizeDoctor = (doctor) => {
  const name = getDoctorName(doctor);
  const experience = Number(doctor.experience);
  const rating = Number(doctor.rating);

  return {
    id: doctor._id,
    name,
    initial: getInitial(name),
    avatar: doctor.userId?.avatar || doctor.avatar || "",
    email: doctor.userId?.email || doctor.email || "",
    updatedAt: doctor.userId?.updatedAt || doctor.updatedAt,
    specialty: doctor.specialization || doctor.specialty || "Nha khoa tổng quát",
    bio:
      doctor.bio ||
      "Bác sĩ DentaCare ưu tiên tư vấn rõ ràng, điều trị nhẹ nhàng và đồng hành sát sao cùng bệnh nhân.",
    services: Array.isArray(doctor.services) ? doctor.services : [],
    experience:
      Number.isFinite(experience) && experience > 0
        ? `${experience} năm kinh nghiệm`
        : "Đang cập nhật kinh nghiệm",
    rating: Number.isFinite(rating) ? rating.toFixed(1) : "5.0",
  };
};

const LandingDoctorCard = ({ doctor }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const doctorImage = !imageFailed ? getUploadUrl(doctor.avatar, doctor.updatedAt) : "";
  const content = (
    <article className="group relative min-h-[430px] overflow-hidden rounded-[30px] bg-slate-900 text-white shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/15 focus-within:shadow-2xl focus-within:shadow-primary/15 motion-reduce:transform-none motion-reduce:transition-none">
      {doctorImage ? (
        <img
          src={doctorImage}
          alt={doctor.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 motion-reduce:transform-none"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_28%),linear-gradient(135deg,#1597a8,#0f3f4a)]">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/35 bg-white/18 text-5xl font-bold shadow-2xl shadow-cyan-950/20 backdrop-blur-sm">
            {doctor.initial}
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent transition-colors duration-500 group-hover:from-slate-950 group-hover:via-slate-950/62" />

      <div className="absolute inset-x-0 bottom-0 p-6">
        <div className="transition-transform duration-500 group-hover:-translate-y-2 motion-reduce:transform-none">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/62">{doctor.specialty}</p>
          <h3 className="mt-2 text-2xl font-bold leading-tight">{doctor.name}</h3>
        </div>

        <div className="grid max-h-0 gap-4 overflow-hidden opacity-0 transition-all duration-500 group-hover:mt-5 group-hover:max-h-64 group-hover:opacity-100 group-focus-within:mt-5 group-focus-within:max-h-64 group-focus-within:opacity-100">
          <p className="line-clamp-3 text-sm leading-6 text-white/76">{doctor.bio}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-white/14 px-3 py-1 text-white/86 backdrop-blur-sm">{doctor.experience}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/14 px-3 py-1 text-white/86 backdrop-blur-sm">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              {doctor.rating}
            </span>
          </div>
          {doctor.id && (
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-primary shadow-lg shadow-black/10">
              Xem hồ sơ
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </article>
  );

  return doctor.id ? (
    <Link to={`/doctors/${doctor.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4">
      {content}
    </Link>
  ) : content;
};

const normalizeClinicSettings = (settings) => ({
  clinicName: settings?.clinicName || fallbackClinic.clinicName,
  description: settings?.description || fallbackClinic.description,
  phone: settings?.phone || fallbackClinic.phone,
  email: settings?.email || fallbackClinic.email,
  address: settings?.address || fallbackClinic.address,
  workDays: settings?.workDays || fallbackClinic.workDays,
  openTime: settings?.openTime || fallbackClinic.openTime,
  closeTime: settings?.closeTime || fallbackClinic.closeTime,
});

const getPhoneHref = (phone) => {
  const normalized = String(phone || "").replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : "tel:1900";
};

const getWorkingHours = (clinic) => `${clinic.openTime} - ${clinic.closeTime}`;

function RedesignedLandingPage({
  activeHeroSlide,
  setActiveHeroSlide,
  landingServices,
  landingDoctors,
  clinicInfo,
  footerServices,
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main>
        <section className="relative min-h-[calc(100vh-88px)] overflow-hidden bg-slate-950 text-white">
          <div className="absolute inset-0" aria-hidden="true">
            {heroSlides.map((slide, index) => (
              <img
                key={slide.image}
                src={slide.image}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-out ${
                  index === activeHeroSlide ? "scale-100 opacity-100" : "scale-105 opacity-0"
                }`}
                style={{ objectPosition: slide.position }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/58 to-cyan-950/18" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-7xl flex-col justify-end px-4 pb-10 pt-28 sm:px-6 lg:px-8 lg:pb-16">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
              <div className="max-w-4xl">
                <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur-md">
                  Nha khoa hiện đại cho nụ cười khỏe đẹp
                </p>
                <h1 className="max-w-4xl text-5xl font-bold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
                  Chăm sóc răng miệng nhẹ nhàng, rõ ràng và chuẩn y tế.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
                  {clinicInfo.clinicName} kết hợp đội ngũ bác sĩ tận tâm, công nghệ hiện đại và quy trình đặt lịch trực tuyến để mỗi lần thăm khám trở nên dễ chịu hơn.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/register"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-bold text-white shadow-2xl shadow-cyan-950/30 transition hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transform-none"
                  >
                    <Calendar className="h-5 w-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
                    Đặt lịch ngay
                  </Link>
                  <button
                    type="button"
                    onClick={() => scrollTo("services")}
                    className="inline-flex items-center justify-center rounded-full border border-white/28 bg-white/12 px-8 py-4 text-base font-bold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transform-none"
                  >
                    Xem dịch vụ
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/16 bg-white/14 p-5 shadow-2xl shadow-cyan-950/25 backdrop-blur-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">Cam kết trải nghiệm</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {trustStats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl bg-white/92 p-4 text-slate-900 shadow-sm">
                      <p className="text-2xl font-bold text-primary">{stat.value}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-2" aria-label="Chọn ảnh giới thiệu">
                  {heroSlides.map((slide, index) => (
                    <button
                      key={slide.image}
                      type="button"
                      onClick={() => setActiveHeroSlide(index)}
                      aria-label={`Xem ảnh ${index + 1}: ${slide.alt}`}
                      aria-current={index === activeHeroSlide ? "true" : undefined}
                      className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                        index === activeHeroSlide ? "w-9 bg-white" : "w-2.5 bg-white/42 hover:bg-white/75"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-20 bg-background py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div className="relative min-h-[520px] overflow-hidden rounded-[32px] bg-slate-100 shadow-2xl shadow-cyan-950/10">
                <img
                  src="https://images.unsplash.com/photo-1606811971618-4486d14f3f99?q=80&w=1600&auto=format&fit=crop"
                  alt="Bác sĩ nha khoa tư vấn cho bệnh nhân"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-x-6 bottom-6 rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-xl backdrop-blur-md">
                  <p className="text-sm font-bold text-primary">DentaCare Care Journey</p>
                  <p className="mt-2 text-2xl font-bold leading-tight text-slate-950">Từ tư vấn đến tái khám, mọi bước đều rõ ràng.</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Câu chuyện chăm sóc</p>
                <h2 className="mt-3 max-w-2xl text-4xl font-bold leading-tight text-foreground md:text-5xl">
                  {clinicInfo.clinicName} đồng hành cùng nụ cười khỏe đẹp.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                  Chúng tôi xây dựng trải nghiệm nha khoa sáng, sạch và dễ hiểu: bệnh nhân biết mình đang điều trị gì, vì sao cần điều trị và cần chăm sóc thế nào sau mỗi lần khám.
                </p>
                <div className="mt-8 grid gap-4">
                  {storyPoints.map((point) => (
                    <div key={point.title} className="flex gap-4 rounded-2xl border border-primary/10 bg-white p-5 shadow-sm">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <point.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-950">{point.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{point.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="scroll-mt-20 bg-[linear-gradient(180deg,#ffffff_0%,var(--surface-subtle)_100%)] py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Dịch vụ chuyên sâu</p>
                <h2 className="mt-3 text-4xl font-bold leading-tight text-foreground md:text-5xl">
                  Giải pháp nha khoa cho từng nhu cầu điều trị.
                </h2>
              </div>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground lg:ml-auto">
                Từ tổng quát, chỉnh nha, thẩm mỹ đến Implant, mỗi dịch vụ được trình bày rõ quy trình và thực hiện bởi đội ngũ phù hợp chuyên môn.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
              {landingServices.map((service) => (
                <LandingServiceCard key={service.title} service={service} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white px-7 py-3 font-semibold text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-lg"
              >
                Xem tất cả dịch vụ
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-background py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Vì sao chọn DentaCare</p>
              <h2 className="mt-3 text-4xl font-bold leading-tight text-foreground md:text-5xl">
                Một trải nghiệm nha khoa gọn, sạch và đáng tin.
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/8 motion-reduce:transform-none">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="doctors" className="scroll-mt-20 bg-[linear-gradient(180deg,var(--surface-subtle)_0%,#ffffff_100%)] py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Ngôi nhà chuyên gia</p>
                <h2 className="mt-3 text-4xl font-bold leading-tight text-foreground md:text-5xl">
                  Bác sĩ đồng hành trong từng kế hoạch điều trị.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-8 text-muted-foreground lg:ml-auto">
                Đội ngũ DentaCare ưu tiên tư vấn rõ ràng, điều trị nhẹ nhàng và theo dõi sát sao để mỗi bệnh nhân có kế hoạch phù hợp.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {landingDoctors.map((doctor) => (
                <LandingDoctorCard key={doctor.id || doctor.name} doctor={doctor} />
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <Link
                to="/doctors"
                className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white px-7 py-3 font-semibold text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-lg"
              >
                Xem tất cả bác sĩ
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-background py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Câu chuyện khách hàng</p>
              <h2 className="mt-3 text-4xl font-bold text-foreground md:text-5xl">Những nụ cười được chăm sóc kỹ lưỡng</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                Trải nghiệm thực tế từ bệnh nhân đã đặt lịch, điều trị và theo dõi tại DentaCare.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((testimonial) => (
                <div key={testimonial.name} className="flex min-h-[320px] flex-col rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="flex-1 text-base leading-8 text-slate-700">"{testimonial.quote}"</p>
                  <div className="mt-6 rounded-2xl bg-primary/8 px-4 py-3 text-sm font-bold text-primary">
                    {testimonial.result}
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      {testimonial.initial}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-20 bg-primary py-16">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 text-white sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/70">Tư vấn và đặt lịch</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-white md:text-5xl">
                Sẵn sàng bắt đầu hành trình chăm sóc nụ cười?
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/78">
                Đặt lịch hẹn để được tư vấn rõ ràng về tình trạng răng miệng, phương án điều trị và thời gian phù hợp.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-primary shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary motion-reduce:transform-none"
              >
                <Calendar className="h-5 w-5" />
                Đặt lịch hẹn
              </Link>
              <a
                href={getPhoneHref(clinicInfo.phone)}
                className="inline-flex items-center justify-center rounded-full border border-white/55 px-8 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary motion-reduce:transform-none"
              >
                Gọi tư vấn
              </a>
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,#ffffff_0%,var(--surface-subtle)_100%)] py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_420px]">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">Thông tin phòng khám</p>
                <h2 className="mt-3 text-4xl font-bold text-foreground">Giờ làm việc và liên hệ</h2>
                <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">{clinicInfo.description}</p>
                <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-primary/12 bg-white p-5 shadow-sm">
                    <Clock className="mb-4 h-6 w-6 text-primary" />
                    <p className="font-bold text-foreground">{clinicInfo.workDays}</p>
                    <p className="mt-1 font-bold text-primary">{getWorkingHours(clinicInfo)}</p>
                  </div>
                  {clinicInfo.address && (
                    <div className="rounded-2xl border border-primary/12 bg-white p-5 shadow-sm">
                      <MapPin className="mb-4 h-6 w-6 text-primary" />
                      <p className="text-sm font-semibold leading-6 text-foreground">{clinicInfo.address}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-[28px] border border-white/80 bg-white p-7 shadow-2xl shadow-cyan-950/10">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Phone className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Đặt lịch hẹn nhanh</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  Đăng ký tài khoản để chọn dịch vụ, bác sĩ và khung giờ phù hợp ngay trên hệ thống.
                </p>
                <Link
                  to="/register"
                  className="mt-6 inline-flex w-full justify-center rounded-full bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none"
                >
                  Bắt đầu ngay
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background pb-8 pt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link to="/" className="group mb-6 flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none">
                <div className="rounded-lg bg-primary p-2 text-white transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none">
                  <Users className="h-6 w-6" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {clinicInfo.clinicName}
                </span>
              </Link>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                {clinicInfo.description}
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">Liên kết nhanh</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button type="button" onClick={() => scrollTo("services")} className="transition hover:text-primary">Dịch vụ</button></li>
                <li><button type="button" onClick={() => scrollTo("doctors")} className="transition hover:text-primary">Đội ngũ bác sĩ</button></li>
                <li><button type="button" onClick={() => scrollTo("about")} className="transition hover:text-primary">Về chúng tôi</button></li>
                <li><Link to="/login" className="transition hover:text-primary">Đặt lịch hẹn</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">Dịch vụ</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {footerServices.map((service) => (
                  <li key={service}>
                    <Link to="/services" className="transition hover:text-primary">
                      {service}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">Liên hệ</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-3"><Phone className="h-5 w-5 text-primary" />{clinicInfo.phone}</li>
                {clinicInfo.email && <li className="flex items-center gap-3"><Mail className="h-5 w-5 text-primary" /><span className="break-all">{clinicInfo.email}</span></li>}
                {clinicInfo.address && <li className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span>{clinicInfo.address}</span></li>}
                <li className="flex items-start gap-3"><Clock className="h-5 w-5 text-primary" /><div><p>{clinicInfo.workDays}</p><p>{getWorkingHours(clinicInfo)}</p></div></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
            <p>© {new Date().getFullYear()} {clinicInfo.clinicName}. Tất cả quyền được bảo lưu.</p>
            <div className="flex gap-6">
              <Link to="/login" className="transition hover:text-primary">Điều khoản dịch vụ</Link>
              <Link to="/login" className="transition hover:text-primary">Chính sách bảo mật</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const LandingPage = () => {
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [landingServices, setLandingServices] = useState(fallbackServices);
  const [landingDoctors, setLandingDoctors] = useState(fallbackDoctors);
  const [clinicInfo, setClinicInfo] = useState(fallbackClinic);
  const [footerServices, setFooterServices] = useState(fallbackServices.map((service) => service.title));
  const refreshKey = useRealtimeRefresh([
    "public:landing-changed",
    "service:changed",
    "doctor:changed",
    "settings:changed",
  ]);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;

    window.setTimeout(() => scrollTo(hash), 100);
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion || heroSlides.length < 2) return undefined;

    const interval = window.setInterval(() => {
      setActiveHeroSlide((current) => (current + 1) % heroSlides.length);
    }, 5500);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLandingData = async () => {
      try {
        const [settingsResponse, servicesResponse, doctorsResponse] = await Promise.all([
          axiosInstance.get("/settings/public"),
          axiosInstance.get("/services"),
          axiosInstance.get("/doctors"),
        ]);

        if (cancelled) return;

        const rawSettings = settingsResponse.data.data || null;
        const rawServices = servicesResponse.data.data || servicesResponse.data.services || [];
        const rawDoctors = doctorsResponse.data.data || doctorsResponse.data.doctors || [];
        const serviceItems = Array.isArray(rawServices) ? rawServices : [];
        const doctorItems = Array.isArray(rawDoctors) ? rawDoctors : [];

        const activeServiceItems = serviceItems.filter((service) => service?.isActive !== false);
        const activeServices = activeServiceItems
          .slice(0, 6)
          .map(normalizeService);
        const nextFooterServices = activeServiceItems
          .slice(0, 5)
          .map((service) => service.name)
          .filter(Boolean);

        const activeDoctors = doctorItems
          .filter((doctor) => doctor?.userId?.isActive !== false)
          .slice(0, 4)
          .map(normalizeDoctor);

        setClinicInfo(normalizeClinicSettings(rawSettings));
        setLandingServices(activeServices.length > 0 ? activeServices : fallbackServices);
        setFooterServices(
          nextFooterServices.length > 0
            ? nextFooterServices
            : fallbackServices.map((service) => service.title)
        );
        setLandingDoctors(activeDoctors.length > 0 ? activeDoctors : fallbackDoctors);
      } catch {
        if (!cancelled) {
          setClinicInfo(fallbackClinic);
          setLandingServices(fallbackServices);
          setFooterServices(fallbackServices.map((service) => service.title));
          setLandingDoctors(fallbackDoctors);
        }
      }
    };

    loadLandingData();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <RedesignedLandingPage
      activeHeroSlide={activeHeroSlide}
      setActiveHeroSlide={setActiveHeroSlide}
      landingServices={landingServices}
      landingDoctors={landingDoctors}
      clinicInfo={clinicInfo}
      footerServices={footerServices}
    />
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main>
        <section
          className="relative flex min-h-[520px] items-center overflow-hidden py-14 text-white"
        >
          <div className="absolute inset-0" aria-hidden="true">
            {heroSlides.map((slide, index) => (
              <img
                key={slide.image}
                src={slide.image}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover transition-all duration-1000 ease-out ${
                  index === activeHeroSlide
                    ? "scale-100 opacity-100"
                    : "scale-105 opacity-0"
                }`}
                style={{ objectPosition: slide.position }}
              />
            ))}
            <div className="absolute inset-0 bg-slate-950/72" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/82 via-slate-950/50 to-slate-950/18" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-6xl">
                Chăm sóc sức khỏe răng miệng{" "}
                <span className="text-primary">chuyên nghiệp</span>
              </h1>
              <p className="mb-10 text-lg leading-relaxed text-slate-300">
                {clinicInfo.clinicName} mang đến dịch vụ nha khoa chất lượng cao với đội ngũ
                bác sĩ chuyên nghiệp và trang thiết bị hiện đại. Đặt lịch hẹn
                dễ dàng, theo dõi lịch sử khám và nhận tư vấn miễn phí.
              </p>
              <div className="mb-8 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3.5 font-bold text-white shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <Calendar className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:scale-110 motion-reduce:transform-none" />
                  Đặt lịch ngay
                </Link>
                <button
                  type="button"
                  onClick={() => scrollTo("services")}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-8 py-3.5 font-bold text-white shadow-lg shadow-black/10 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-slate-500 hover:bg-slate-700 hover:shadow-xl hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  Tìm hiểu thêm
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4 border-t border-white/20 pt-6">
                {[
                  { value: "10+",  label: "Năm kinh nghiệm" },
                  { value: "50K+", label: "Bệnh nhân" },
                  { value: "20+",  label: "Bác sĩ" },
                  { value: "4.9",  label: "Đánh giá" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-2xl font-bold sm:text-3xl">{s.value}</div>
                    <div className="mt-0.5 text-xs text-white/60 sm:text-sm">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2" aria-label="Chọn ảnh giới thiệu">
              {heroSlides.map((slide, index) => (
                <button
                  key={slide.image}
                  type="button"
                  onClick={() => setActiveHeroSlide(index)}
                  aria-label={`Xem ảnh ${index + 1}: ${slide.alt}`}
                  aria-current={index === activeHeroSlide ? "true" : undefined}
                  className={`h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                    index === activeHeroSlide ? "w-9 bg-primary" : "w-2.5 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="scroll-mt-20 bg-background py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-primary">Dịch vụ chuyên sâu</p>
                <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground md:text-5xl">
                  Chăm sóc răng miệng theo từng nhu cầu điều trị.
                </h2>
              </div>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground lg:ml-auto">
                {clinicInfo.clinicName} cung cấp đa dạng dịch vụ nha khoa từ khám tổng quát
                đến thẩm mỹ nụ cười và các điều trị chuyên sâu, với quy trình rõ ràng và đội ngũ bác sĩ phù hợp từng chuyên khoa.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
              {landingServices.map((service) => (
                <LandingServiceCard key={service.title} service={service} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 px-6 py-3 font-semibold text-primary transition hover:bg-primary hover:text-white"
              >
                Xem tất cả dịch vụ
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-24" style={{ background: "var(--surface-subtle)" }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-foreground">
                Tại sao chọn DentaCare?
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Chúng tôi cam kết mang đến trải nghiệm dịch vụ nha khoa tốt
                nhất cho khách hàng.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="feature-card"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="doctors" className="scroll-mt-20 bg-background py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-primary">Ngôi nhà chuyên gia</p>
                <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground md:text-5xl">
                  Đội ngũ bác sĩ đồng hành trong từng kế hoạch điều trị.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-8 text-muted-foreground lg:ml-auto">
                Đội ngũ bác sĩ DentaCare luôn đồng hành cùng bạn trong từng bước chăm sóc răng miệng, từ tư vấn ban đầu đến điều trị và theo dõi sau khám.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
              {landingDoctors.map((doctor) => (
                <LandingDoctorCard key={doctor.id || doctor.name} doctor={doctor} />
              ))}
            </div>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/doctors"
                className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white px-7 py-3 font-semibold text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-primary hover:text-white hover:shadow-lg"
              >
                Xem tất cả bác sĩ
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-24" style={{ background: "var(--surface-subtle)" }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-primary">Khách hàng nói gì</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">Hàng nghìn nụ cười tin tưởng</h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Trải nghiệm thực tế từ bệnh nhân đã điều trị tại DentaCare.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  name: "Nguyễn Thị Lan",
                  role: "Bệnh nhân niềng răng",
                  quote: "Bác sĩ tư vấn rất tận tình, quy trình niềng răng rõ ràng từng bước. Sau 18 tháng, nụ cười của tôi thay đổi hoàn toàn!",
                  rating: 5,
                  initial: "L",
                },
                {
                  name: "Trần Văn Minh",
                  role: "Bệnh nhân implant",
                  quote: "Tôi lo lắng về phẫu thuật implant nhưng đội ngũ DentaCare đã giải thích rất kỹ. Kết quả vượt ngoài mong đợi, không đau như tôi nghĩ.",
                  rating: 5,
                  initial: "M",
                },
                {
                  name: "Lê Thị Hoa",
                  role: "Bệnh nhân tẩy trắng",
                  quote: "Đặt lịch online rất tiện, nhân viên thân thiện. Răng trắng sáng hơn hẳn sau 1 buổi điều trị. Sẽ giới thiệu cho bạn bè!",
                  rating: 5,
                  initial: "H",
                },
              ].map((testimonial) => (
                <div key={testimonial.name} className="flex flex-col rounded-2xl border bg-background p-6 shadow-sm">
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-7 text-muted-foreground">"{testimonial.quote}"</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {testimonial.initial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="scroll-mt-20 bg-primary py-12">
          <div className="mx-auto max-w-7xl px-4 text-center text-white sm:px-6 lg:px-8">
            <h2 className="mb-6 text-3xl font-bold">
              Sẵn sàng chăm sóc sức khỏe răng miệng?
            </h2>
            <p className="mx-auto mb-6 max-w-xl text-base text-white/80">
              Đặt lịch hẹn ngay hôm nay để được tư vấn và khám miễn phí. Đội
              ngũ chuyên gia của chúng tôi luôn sẵn sàng hỗ trợ bạn.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3.5 font-bold text-primary shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-slate-100 hover:shadow-xl hover:shadow-slate-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary motion-reduce:transform-none motion-reduce:transition-none"
              >
                <Calendar className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:scale-110 motion-reduce:transform-none" />
                Đặt lịch hẹn
              </Link>
              <a
                href={getPhoneHref(clinicInfo.phone)}
                className="rounded-lg border-2 border-white bg-transparent px-8 py-3.5 font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-white hover:text-primary hover:shadow-xl hover:shadow-slate-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary motion-reduce:transform-none motion-reduce:transition-none"
              >
                Liên hệ ngay
              </a>
            </div>
          </div>
        </section>

        <section id="about" className="scroll-mt-20 py-20 lg:py-24" style={{ background: "var(--surface-subtle)" }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
              <div>
                <h2 className="mb-4 text-3xl font-bold text-foreground">
                  Giờ làm việc
                </h2>
                <p className="mb-8 text-muted-foreground">
                  {clinicInfo.description}
                </p>
                <div className="max-w-md space-y-4">
                  <div className="flex justify-between rounded-lg border-l-4 border-primary bg-background p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 motion-reduce:transform-none motion-reduce:transition-none">
                    <span className="font-medium text-foreground">{clinicInfo.workDays}</span>
                    <span className="font-bold text-primary">{getWorkingHours(clinicInfo)}</span>
                  </div>
                  {clinicInfo.address && (
                    <div className="flex gap-3 rounded-lg bg-background p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-muted/80 motion-reduce:transform-none motion-reduce:transition-none">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="font-medium text-foreground">{clinicInfo.address}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="elevated-card rounded-2xl p-6 md:p-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-foreground">
                  Đặt lịch hẹn nhanh
                </h3>
                <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                  Đăng ký tài khoản để đặt lịch hẹn trực tuyến nhanh chóng và tiện lợi.
                </p>
                <Link
                  to="/register"
                  className="inline-flex w-full justify-center rounded-xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  Bắt đầu ngay
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background pb-8 pt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link to="/" className="group mb-6 flex items-center gap-2 transition-all duration-300 hover:-translate-y-0.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none">
                <div className="rounded-lg bg-primary p-2 text-white transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none">
                  <Users className="h-6 w-6" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {clinicInfo.clinicName}
                </span>
              </Link>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                {clinicInfo.description}
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">Liên kết nhanh</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <button type="button" onClick={() => scrollTo("services")} className="transition-all duration-300 hover:translate-x-1 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none">
                    Dịch vụ
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollTo("doctors")} className="transition-all duration-300 hover:translate-x-1 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none">
                    Đội ngũ bác sĩ
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollTo("about")} className="transition-all duration-300 hover:translate-x-1 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none">
                    Về chúng tôi
                  </button>
                </li>
                <li>
                  <Link to="/login" className="inline-block transition-all duration-300 hover:translate-x-1 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none">
                    Đặt lịch hẹn
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">Dịch vụ</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {footerServices.map((service) => (
                  <li key={service}>
                    <Link
                      to="/services"
                      className="inline-block transition-all duration-300 hover:translate-x-1 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      {service}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">Liên hệ</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  {clinicInfo.phone}
                </li>
                {clinicInfo.email && (
                  <li className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <span className="break-all">{clinicInfo.email}</span>
                  </li>
                )}
                {clinicInfo.address && (
                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>{clinicInfo.address}</span>
                  </li>
                )}
                <li className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p>{clinicInfo.workDays}</p>
                    <p>{getWorkingHours(clinicInfo)}</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
            <p>
              © {new Date().getFullYear()} {clinicInfo.clinicName}. Tất cả quyền được bảo lưu.
            </p>
            <div className="flex gap-6">
              <Link to="/login" className="transition-all duration-300 hover:-translate-y-0.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none">
                Điều khoản dịch vụ
              </Link>
              <Link to="/login" className="transition-all duration-300 hover:-translate-y-0.5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none">
                Chính sách bảo mật
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
