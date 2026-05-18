import { Fragment, useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  User,
  Loader2,
  CheckCircle,
  Check,
  ChevronDown,
  AlertCircle,
  Search,
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import { appointmentsApi, doctorsApi, servicesApi } from "@/api";
import { useRealtimeRefresh } from "../../hooks/useRealtimeEvent";
import UserAvatar from "@/components/common/UserAvatar";
import { getUploadUrl } from "@/utils/getMediaUrl";

const normalizeText = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Chưa chọn";

const normalizeList = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  return [];
};

const ServiceImage = ({ service }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const cleanImage =
    typeof service.image === "string" ? service.image.trim() : "";
  const serviceImage = !imageFailed ? getUploadUrl(cleanImage, service.updatedAt) : "";

  if (serviceImage) {
    return (
      <img
        src={serviceImage}
        alt={service.name || "Dịch vụ nha khoa"}
        className="h-32 w-full object-cover"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-20 w-full items-center justify-center bg-primary/10 text-primary">
      <ClipboardCheck className="h-8 w-8" />
    </div>
  );
};

export default function PatientBookPage() {
  const navigate = useNavigate();
  const refreshKey = useRealtimeRefresh([
    "service:changed",
    "doctor:changed",
    "schedule:changed",
    "slots:changed",
    "appointment:changed",
  ]);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [servicesLoading, setServicesLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [formData, setFormData] = useState({
    serviceId: "",
    doctorId: "",
    date: "",
    time: "",
    notes: "",
  });

  const selectedService = services.find((service) => service._id === formData.serviceId);
  const selectedDoctor = doctors.find((doctor) => doctor._id?.toString() === formData.doctorId?.toString());

  const today = new Date();
  const minDate = today.toISOString().split("T")[0];
  const maxDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const filteredServices = useMemo(() => {
    const query = normalizeText(serviceSearch);
    if (!query) return services;
    return services.filter((service) =>
      normalizeText([service.name, service.description, service.price, service.duration].join(" ")).includes(query)
    );
  }, [services, serviceSearch]);

  const slotForSelectedTime = availableSlots.find((slot) => slot.time === formData.time);
  const availableDoctorIds = slotForSelectedTime?.doctors || [];
  const availableDoctorsForTime = doctors.filter((doctor) => availableDoctorIds.includes(doctor._id?.toString()));

  const filteredDoctors = useMemo(() => {
    const query = normalizeText(doctorSearch);
    if (!query) return availableDoctorsForTime;
    return availableDoctorsForTime.filter((doctor) => {
      const name = doctor.userId?.fullName || doctor.name || "";
      const spec = doctor.specialization || doctor.specialty || "";
      return normalizeText([name, spec, doctor.userId?.email, doctor.phone].join(" ")).includes(query);
    });
  }, [availableDoctorsForTime, doctorSearch]);

  useEffect(() => {
    const fetchServices = async () => {
      setServicesLoading(true);
      try {
        const res = await servicesApi.getAll();
        setServices(normalizeList(res.data, "services"));
      } catch (error) {
        console.error("Failed to fetch services:", error);
        toast.error("Không thể tải danh sách dịch vụ");
      } finally {
        setServicesLoading(false);
      }
    };
    fetchServices();
  }, [refreshKey]);

  const fetchAggregatedSlots = useCallback(async (serviceId, date) => {
    if (!serviceId || !date) return;
    setSlotsLoading(true);
    setSlotsError("");
    setAvailableSlots([]);
    setDoctors([]);
    try {
      const res = await doctorsApi.getAggregatedSlots({ date, serviceId });
      setAvailableSlots(normalizeList(res.data, "slots"));
      setDoctors(normalizeList(res.data, "doctors"));
    } catch (error) {
      console.error("Failed to fetch aggregated slots:", error);
      setSlotsError("Không thể tải khung giờ khám. Vui lòng thử lại.");
      toast.error("Không thể tải khung giờ khám");
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (formData.serviceId && formData.date) {
      fetchAggregatedSlots(formData.serviceId, formData.date);
    }
  }, [fetchAggregatedSlots, formData.date, formData.serviceId, refreshKey]);

  const handleServiceSelect = (serviceId) => {
    if (serviceId === formData.serviceId) {
      setStep(2);
      return;
    }

    setFormData((prev) => ({ ...prev, serviceId, doctorId: "", date: "", time: "" }));
    setDoctors([]);
    setAvailableSlots([]);
    setDoctorSearch("");
    setStep(2);
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, date, time: "", doctorId: "" }));
    setAvailableSlots([]);
    setDoctorSearch("");
    if (date && formData.serviceId) fetchAggregatedSlots(formData.serviceId, date);
  };

  const handleTimeSelect = (time) => {
    setFormData((prev) => ({ ...prev, time, doctorId: "" }));
    setDoctorSearch("");
    setStep(3);
  };

  const handleDoctorSelect = (doctorId) => {
    if (doctorId === formData.doctorId) {
      setStep(4);
      return;
    }

    setFormData((prev) => ({ ...prev, doctorId }));
    setStep(4);
  };

  const handleSubmit = async () => {
    if (!formData.serviceId || !formData.doctorId || !formData.date || !formData.time) {
      toast.error("Vui lòng hoàn thành đầy đủ các bước đặt lịch");
      return;
    }

    setSubmitting(true);
    try {
      await appointmentsApi.create({
        serviceId: formData.serviceId,
        doctorId: formData.doctorId,
        appointmentDate: formData.date,
        startTime: formData.time,
        note: formData.notes,
      });
      toast.success("Đặt lịch hẹn thành công!");
      setTimeout(() => navigate("/patient/appointments"), 1500);
    } catch (error) {
      const msg = error.response?.data?.message || "Đặt lịch thất bại, vui lòng thử lại";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { id: 1, label: "Dịch vụ", icon: ClipboardCheck },
    { id: 2, label: "Ngày giờ", icon: Calendar },
    { id: 3, label: "Bác sĩ", icon: User },
    { id: 4, label: "Xác nhận", icon: CheckCircle },
  ];

  const canGoToStep = (target) =>
    target === 1 ||
    (target === 2 && formData.serviceId) ||
    (target === 3 && formData.serviceId && formData.date && formData.time) ||
    (target === 4 && formData.serviceId && formData.doctorId && formData.date && formData.time);

  const summaryItems = [
    { label: "Dịch vụ", value: selectedService?.name || "Chưa chọn" },
    { label: "Ngày khám", value: formatDate(formData.date) },
    { label: "Giờ khám", value: formData.time || "Chưa chọn" },
    { label: "Bác sĩ", value: selectedDoctor?.userId?.fullName || selectedDoctor?.name || "Chưa chọn" },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#f7fdfe_0%,#e9f8fb_48%,#ffffff_100%)] p-5 shadow-xl shadow-cyan-950/8 sm:p-6 lg:p-7">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-primary/12 blur-2xl" />
        <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-cyan-300/18 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <Badge className="mb-4 rounded-full border-primary/15 bg-primary/10 px-4 py-1.5 text-primary hover:bg-primary/10">
              Đặt lịch hẹn
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Chọn lịch khám phù hợp với bạn
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Hoàn thành 4 bước rõ ràng để chọn dịch vụ, thời gian và bác sĩ đồng hành trong kế hoạch chăm sóc răng miệng.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <HeroMetric icon={ClipboardCheck} label="Quy trình" value="4 bước" />
            <HeroMetric icon={ShieldCheck} label="Thông tin" value="Minh bạch" />
            <HeroMetric icon={HeartPulse} label="Hỗ trợ" value="Tận tâm" />
          </div>
        </div>
      </div>

      {/* Sticky Step Progress Bar */}
      <div className="sticky top-0 z-20 rounded-2xl border border-primary/10 bg-white/95 shadow-lg shadow-cyan-950/6 backdrop-blur-xl">
        <div className="flex items-center px-4 py-3 sm:px-6">
          {steps.map((item, index) => {
            const isActive = step === item.id;
            const isDone = step > item.id;
            const isClickable = canGoToStep(item.id);
            return (
              <Fragment key={item.id}>
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && setStep(item.id)}
                  className={`flex flex-col items-center gap-1.5 ${!isClickable ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 ring-4 ring-primary/15"
                        : isDone
                        ? "bg-primary/15 text-primary"
                        : "border-2 border-primary/10 bg-white text-muted-foreground"
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : item.id}
                  </span>
                  <span
                    className={`hidden text-xs font-medium sm:block ${
                      isActive ? "text-primary" : isDone ? "text-primary/70" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-2 h-1 flex-1 rounded-full transition-all duration-300 ${
                      step > item.id ? "bg-primary" : "bg-primary/10"
                    }`}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile collapsible summary — hidden on xl where sidebar is visible */}
      {(formData.serviceId || formData.date || formData.time || formData.doctorId) && (
        <details className="group xl:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl border bg-muted/40 px-4 py-3 font-medium">
            <span className="flex items-center gap-2 text-sm">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Tóm tắt lịch hẹn
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-2 space-y-2 rounded-xl border bg-muted/30 px-4 pb-4 pt-3">
            {summaryItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-right font-medium">{item.value}</span>
              </div>
            ))}
            {selectedService && (
              <div className="flex items-center justify-between gap-2 border-t pt-2 text-sm">
                <span className="text-muted-foreground">Chi phí dự kiến</span>
                <span className="font-bold text-primary">{formatCurrency(selectedService.price)}</span>
              </div>
            )}
          </div>
        </details>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">

          {step === 1 && (
            <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>Chọn dịch vụ</CardTitle>
                    <CardDescription>Dịch vụ sẽ quyết định thời lượng và chi phí dự kiến.</CardDescription>
                  </div>
                  <div className="relative w-full sm:max-w-md">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Tìm dịch vụ..."
                      className="field-input h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {servicesLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="overflow-hidden rounded-xl border">
                        <div className="skeleton h-32 w-full" />
                        <div className="space-y-2 p-4">
                          <div className="skeleton h-5 w-3/4" />
                          <div className="skeleton h-4 w-full" />
                          <div className="skeleton h-4 w-2/3" />
                          <div className="flex gap-2 pt-2">
                            <div className="skeleton h-5 w-20 rounded-full" />
                            <div className="skeleton h-5 w-16 rounded-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredServices.length === 0 ? (
                  <EmptyState icon={Search} title="Không tìm thấy dịch vụ" desc="Thử từ khóa khác hoặc quay lại sau." />
                ) : (
                  <RadioGroup value={formData.serviceId} onValueChange={handleServiceSelect} className="grid gap-4 sm:grid-cols-2">
                    {filteredServices.map((service) => {
                      return (
                      <div key={service._id} onClick={() => handleServiceSelect(service._id)}>
                        <RadioGroupItem value={service._id} id={`svc-${service._id}`} className="peer sr-only" />
                        <Label
                          htmlFor={`svc-${service._id}`}
                          className="flex h-full min-h-52 cursor-pointer flex-col overflow-hidden rounded-2xl border-2 bg-white transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:shadow-lg peer-data-[state=checked]:shadow-primary/10"
                        >
                          <ServiceImage service={service} />
                          <div className="flex flex-1 flex-col p-4">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-base font-semibold">{service.name}</span>
                            {formData.serviceId === service._id && <CheckCircle className="h-5 w-5 text-primary" />}
                          </div>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{service.description || "Dịch vụ nha khoa tại DentaCare."}</p>
                          <div className="mt-auto flex flex-wrap gap-2 pt-4">
                            <Badge variant="secondary">{formatCurrency(service.price)}</Badge>
                            <Badge variant="outline">{service.duration || 30} phút</Badge>
                          </div>
                          </div>
                        </Label>
                      </div>
                      );
                    })}
                  </RadioGroup>
                )}
                <StepFooter onNext={() => setStep(2)} nextDisabled={!formData.serviceId} hideBack />
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
              <CardHeader>
                <CardTitle>Chọn ngày và giờ khám</CardTitle>
                <CardDescription>
                  Dịch vụ: <span className="font-medium text-primary">{selectedService?.name}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                  <div className="space-y-2">
                    <Label>Ngày khám</Label>
                     <Input
                      type="date"
                      min={minDate}
                      max={maxDate}
                      value={formData.date}
                      onChange={(e) => handleDateChange(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Có thể đặt lịch trong 60 ngày tới.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Khung giờ còn trống</Label>
                    {!formData.date ? (
                      <EmptyState icon={Calendar} title="Chọn ngày trước" desc="Các khung giờ trống sẽ hiển thị sau khi bạn chọn ngày." compact />
                    ) : slotsLoading ? (
                      <div className="flex items-center gap-2 rounded-xl border p-4 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải khung giờ...
                      </div>
                    ) : slotsError ? (
                      <EmptyState icon={AlertCircle} title="Không thể tải khung giờ" desc={slotsError} compact />
                    ) : availableSlots.length === 0 ? (
                      <EmptyState icon={AlertCircle} title="Không có khung giờ trống" desc="Vui lòng chọn ngày khác." compact />
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                        {availableSlots.map((slot) => {
                          const isToday = formData.date === new Date().toISOString().split("T")[0];
                          let isPast = false;
                          if (isToday && slot.time) {
                            const [slotH, slotM] = slot.time.split(":").map(Number);
                            const now = new Date();
                            isPast = slotH < now.getHours() || (slotH === now.getHours() && slotM < now.getMinutes());
                          }
                          const canSelect = slot.available && !isPast;
                          return (
                            <Button
                              key={slot.time}
                              type="button"
                              variant={formData.time === slot.time ? "default" : "outline"}
                              disabled={!canSelect}
                              onClick={() => canSelect && handleTimeSelect(slot.time)}
                              className={`h-11 ${!canSelect ? "opacity-40 line-through" : ""}`}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              {slot.time}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <StepFooter onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!formData.date || !formData.time} />
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>Chọn bác sĩ</CardTitle>
                    <CardDescription>
                      Bác sĩ còn trống lúc <span className="font-medium text-primary">{formData.time}</span> ngày{" "}
                      <span className="font-medium text-primary">{formatDate(formData.date)}</span>
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:max-w-md">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={doctorSearch}
                      onChange={(e) => setDoctorSearch(e.target.value)}
                      placeholder="Tìm bác sĩ..."
                      className="field-input h-11 rounded-xl pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {slotsLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[1,2].map(i => (
                      <div key={i} className="flex items-start gap-4 rounded-xl border p-4">
                        <div className="skeleton h-14 w-14 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="skeleton h-5 w-36" />
                          <div className="skeleton h-4 w-48" />
                          <div className="flex gap-2 pt-1">
                            <div className="skeleton h-5 w-16 rounded-full" />
                            <div className="skeleton h-5 w-24 rounded-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : availableDoctorsForTime.length === 0 ? (
                  <EmptyState icon={AlertCircle} title="Không còn bác sĩ trống" desc="Vui lòng quay lại chọn khung giờ khác." />
                ) : filteredDoctors.length === 0 ? (
                  <EmptyState icon={Search} title="Không tìm thấy bác sĩ" desc="Thử từ khóa khác hoặc bỏ tìm kiếm." />
                ) : (
                  <RadioGroup value={formData.doctorId} onValueChange={handleDoctorSelect} className="grid gap-4 sm:grid-cols-2">
                    {filteredDoctors.map((doctor) => {
                      const name = doctor.userId?.fullName || doctor.name || "Bác sĩ";
                      const spec = doctor.specialization || doctor.specialty || "Nha khoa tổng quát";
                      return (
                        <div key={doctor._id} onClick={() => handleDoctorSelect(doctor._id)}>
                          <RadioGroupItem value={doctor._id} id={`doc-${doctor._id}`} className="peer sr-only" />
                          <Label
                            htmlFor={`doc-${doctor._id}`}
                            className="flex min-h-36 cursor-pointer items-start gap-4 rounded-2xl border-2 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:shadow-lg peer-data-[state=checked]:shadow-primary/10"
                          >
                            <UserAvatar
                              avatar={doctor.userId?.avatar}
                              name={name}
                              email={doctor.userId?.email}
                              cacheKey={doctor.userId?.updatedAt}
                              size="lg"
                              className="h-14 w-14 bg-muted ring-background"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <span className="block truncate font-semibold">{name}</span>
                                {formData.doctorId === doctor._id && <CheckCircle className="h-5 w-5 text-primary" />}
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{spec}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="secondary">{formData.time}</Badge>
                                <Badge variant="outline">{doctor.experience || 0} năm kinh nghiệm</Badge>
                              </div>
                            </div>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}
                <StepFooter onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={!formData.doctorId} />
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
              <CardHeader>
                <CardTitle>Xác nhận phiếu hẹn</CardTitle>
                <CardDescription>Kiểm tra lại thông tin trước khi gửi lịch hẹn đến phòng khám.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoBlock icon={ClipboardCheck} label="Dịch vụ" value={selectedService?.name} note={formatCurrency(selectedService?.price)} />
                  <InfoBlock icon={Calendar} label="Ngày giờ" value={formatDate(formData.date)} note={formData.time && `Lúc ${formData.time}`} />
                  <InfoBlock
                    icon={User}
                    label="Bác sĩ"
                    value={selectedDoctor?.userId?.fullName || selectedDoctor?.name}
                    note={selectedDoctor?.specialization || selectedDoctor?.specialty}
                  />
                  <InfoBlock icon={Clock} label="Thời lượng" value={`${selectedService?.duration || 30} phút`} note="Thời gian dự kiến" />
                </div>
                <div className="space-y-2">
                  <Label>Ghi chú thêm</Label>
                  <Textarea
                    placeholder="Ghi chú thêm cho bác sĩ..."
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Quay lại
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Đang gửi lịch hẹn...</>
                    ) : (
                      <>Xác nhận đặt lịch <CheckCircle className="h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="soft-card h-fit border-white/80 bg-white/95 shadow-xl shadow-cyan-950/8 xl:sticky xl:top-6">
          <CardHeader>
            <CardTitle className="text-base">Tóm tắt lịch hẹn</CardTitle>
            <CardDescription>Thông tin sẽ được cập nhật theo từng bước.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-xl border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-1 line-clamp-2 font-medium">{item.value}</p>
              </div>
            ))}
            {selectedService && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">Chi phí dự kiến</p>
                <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(selectedService.price)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StepFooter({ onBack, onNext, nextDisabled, hideBack = false }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-between">
      {hideBack ? (
        <div />
      ) : (
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      )}
      <Button onClick={onNext} disabled={nextDisabled}>
        Tiếp tục
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, compact = false }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed text-center ${compact ? "p-4" : "py-10"}`}>
      <Icon className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value, note }) {
  return (
    <div className="flex gap-4 rounded-xl border bg-muted/30 p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold">{value || "Chưa chọn"}</p>
        {note && <p className="mt-1 text-sm text-primary">{note}</p>}
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
