import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  CalendarCheck,
  ClipboardList,
  Clock3,
  AlertCircle,
  Cake,
  ExternalLink,
  Filter,
  FileText,
  Image,
  Loader2,
  Mail,
  MapPin,
  Paperclip,
  Phone,
  Search,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import axiosInstance from "@/api/httpClient";
import { toast } from "sonner";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";
import UserAvatar from "@/components/common/UserAvatar";
import { isAppointmentOverdue } from "@/utils/appointmentStatus";
import { getUploadUrl } from "@/utils/getMediaUrl";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "new", label: "Bệnh nhân mới" },
  { value: "today", label: "Lịch hẹn hôm nay" },
];

const actionableStatuses = new Set(["pending", "confirmed", "rescheduled", "in_progress"]);

const getAppointmentDate = (appointment) => {
  const rawDate = appointment?.appointmentDate || appointment?.date;
  const date = rawDate ? new Date(rawDate) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getAppointmentTime = (appointment) => appointment?.startTime || appointment?.timeSlot || "";

const isSameDate = (dateA, dateB) =>
  dateA &&
  dateB &&
  dateA.getFullYear() === dateB.getFullYear() &&
  dateA.getMonth() === dateB.getMonth() &&
  dateA.getDate() === dateB.getDate();

const isThisMonth = (date, today = new Date()) =>
  date &&
  date.getFullYear() === today.getFullYear() &&
  date.getMonth() === today.getMonth();

const formatDate = (date) => (date ? date.toLocaleDateString("vi-VN") : "Chưa có");

const genderLabel = (gender) => {
  if (gender === "male") return "Nam";
  if (gender === "female") return "Nữ";
  if (gender === "other") return "Khác";
  return "Chưa cập nhật";
};

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return "Chưa cập nhật";
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return "Chưa cập nhật";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return `${age} tuổi`;
};

const formatMedicalList = (value, fallback = "Chưa cập nhật") => {
  if (Array.isArray(value)) {
    const items = value.filter(Boolean);
    return items.length > 0 ? items.join(", ") : fallback;
  }
  return value || fallback;
};

const resolveAttachmentUrl = (file) => {
  const raw = file?.fileUrl || file?.url || "";
  if (!raw) return "";
  if (raw.startsWith("http") || raw.startsWith("blob:") || raw.startsWith("data:")) return raw;
  return getUploadUrl(raw);
};

const isImageAttachment = (file) =>
  file?.type === "xray" ||
  file?.type === "image" ||
  String(file?.mimeType || "").startsWith("image/");

const getAttachmentTypeLabel = (file) => (file?.type === "xray" ? "X-quang" : "Ảnh lâm sàng");

const formatAppointmentLine = (appointment, today = new Date()) => {
  if (!appointment) return "Chưa có lịch hẹn";
  const date = getAppointmentDate(appointment);
  const time = getAppointmentTime(appointment);
  const dayText = isSameDate(date, today) ? "Hôm nay" : formatDate(date);
  return [time, dayText].filter(Boolean).join(" - ");
};

function ApptBadge({ appointment }) {
  if (isAppointmentOverdue(appointment)) return <span className="badge-status-overdue">Quá hạn</span>;
  const map = {
    pending: <span className="badge-status-pending">Chờ xác nhận</span>,
    confirmed: <span className="badge-status-confirmed">Đã xác nhận</span>,
    rescheduled: <span className="badge-status-pending">Đổi lịch</span>,
    in_progress: <span className="badge-status-confirmed">Đang khám</span>,
    completed: <span className="badge-status-completed">Hoàn thành</span>,
    cancelled: <span className="badge-status-cancelled">Đã hủy</span>,
  };
  return map[appointment?.status] ?? <span className="badge-status-pending">{appointment?.status}</span>;
}

function PatientStatusBadge({ patient }) {
  if (patient.todayAppointment) {
    return <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">Lịch hôm nay</span>;
  }
  if (patient.activeAppointment) {
    return <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">Đang điều trị</span>;
  }
  if (patient.isNewThisMonth) {
    return <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">Khám mới</span>;
  }
  return <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">Đã hoàn thành</span>;
}

function StatCard({ icon: Icon, title, value, hint, tone = "bg-primary/10 text-primary" }) {
  return (
    <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", tone)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {hint && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{hint}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroMetric({ icon: Icon, label, value, tone = "text-primary", bg = "bg-primary/10" }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white/85 p-4 shadow-sm backdrop-blur">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
        <Icon className={`h-5 w-5 ${tone}`} />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function PatientCard({ patient, onOpen }) {
  const visitLine = patient.todayAppointment
    ? formatAppointmentLine(patient.todayAppointment)
    : patient.lastAppointmentDate
      ? `Khám gần nhất: ${formatDate(patient.lastAppointmentDate)}`
      : "Chưa có lịch khám";

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden rounded-[24px] border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10",
        patient.todayAppointment && "border-l-4 border-l-red-500"
      )}
      onClick={() => onOpen(patient)}
    >
      <CardContent className="flex min-h-[260px] flex-col p-5">
        <div className="flex items-start gap-4">
          <UserAvatar
            avatar={patient.avatar}
            name={patient.name}
            email={patient.email}
            size="md"
            className="bg-muted ring-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-lg font-bold leading-snug text-foreground">{patient.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">ID: #{patient._id?.slice(-6)?.toUpperCase() || "N/A"}</p>
              </div>
              <PatientStatusBadge patient={patient} />
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 shrink-0" />
            <span className="truncate">{patient.phone || "Chưa cập nhật"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Stethoscope className="h-4 w-4 shrink-0" />
            <span className="line-clamp-1">{patient.latestService || "Chưa cập nhật dịch vụ"}</span>
          </div>
          <div className={cn("flex items-center gap-3", patient.todayAppointment ? "text-red-600" : "")}>
            <Clock3 className="h-4 w-4 shrink-0" />
            <span className="line-clamp-1">{visitLine}</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-primary/10 pt-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">
              {patient.appointmentsCount} lịch hẹn
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">
              {patient.completedCount} đã hoàn thành
            </span>
          </div>
          <button
            type="button"
            className="flex h-9 shrink-0 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
            aria-label={`Xem hồ sơ ${patient.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(patient);
            }}
          >
            Xem hồ sơ
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function PatientDetailDialog({ patient, open, onClose }) {
  const [tab, setTab] = useState("history");
  const [records, setRecords] = useState([]);
  const [patientAppts, setPatientAppts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingAppts, setLoadingAppts] = useState(false);

  useEffect(() => {
    if (!open || !patient) return;
    setTab("history");
    setPreviewAttachment(null);

    setLoadingProfile(true);
    axiosInstance
      .get(`/patients/profile/by-doctor?patientId=${patient._id}`)
      .then((res) => setProfile(res.data.data || null))
      .catch(() => setProfile(null))
      .finally(() => setLoadingProfile(false));

    setLoadingRecords(true);
    axiosInstance
      .get(`/exam-results/by-patient?patientId=${patient._id}`)
      .then((res) => setRecords(res.data.data || []))
      .catch(() => setRecords([]))
      .finally(() => setLoadingRecords(false));

    setLoadingAppts(true);
    axiosInstance
      .get("/appointments")
      .then((res) => {
        const all = res.data.data || [];
        const patientApptList = all
          .filter((a) => (a.patientId?._id || a.patientId) === patient._id)
          .sort((a, b) => {
            const dateA = getAppointmentDate(a) || new Date(0);
            const dateB = getAppointmentDate(b) || new Date(0);
            if (dateB - dateA !== 0) return dateB - dateA;
            return getAppointmentTime(b).localeCompare(getAppointmentTime(a));
          });
        setPatientAppts(patientApptList);
      })
      .catch(() => setPatientAppts([]))
      .finally(() => setLoadingAppts(false));
  }, [open, patient]);

  if (!patient) return null;

  const patientProfile = profile?.patientProfile || {};
  const userProfile = profile?.user || {};
  const dateOfBirth = patientProfile.dateOfBirth;
  const medicalHistory = patientProfile.medicalHistory || [];
  const allergies = patientProfile.allergies || [];
  const hasMedicalAlert = medicalHistory.length > 0 || allergies.length > 0;
  const profileName = userProfile.fullName || patient.name;
  const profileEmail = userProfile.email || patient.email;
  const profilePhone = userProfile.phone || patient.phone;

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col rounded-[28px] border-white/80 bg-white/95 shadow-2xl shadow-cyan-950/12">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <UserAvatar
              avatar={patient.avatar}
              name={patient.name}
              email={patient.email}
              size="sm"
              className="bg-muted ring-0"
            />
            {profileName}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-4 pt-1">
            {profileEmail && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {profileEmail}
              </span>
            )}
            {profilePhone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {profilePhone}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-3xl border border-primary/10 bg-primary/5 p-4">
          {loadingProfile ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
              Đang tải hồ sơ y tế...
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/85 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Cake className="h-3.5 w-3.5 text-primary" />
                    Tuổi / ngày sinh
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">{calculateAge(dateOfBirth)}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateOfBirth ? new Date(dateOfBirth).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/85 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <User className="h-3.5 w-3.5 text-primary" />
                    Giới tính
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">{genderLabel(patientProfile.gender)}</p>
                </div>
                <div className="rounded-2xl bg-white/85 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Địa chỉ
                  </p>
                  <p className="mt-1 line-clamp-2 font-semibold text-slate-950">{patientProfile.address || "Chưa cập nhật"}</p>
                </div>
              </div>
              <div className={cn(
                "rounded-2xl border p-4",
                hasMedicalAlert ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"
              )}>
                <h4 className={cn(
                  "flex items-center gap-2 font-bold",
                  hasMedicalAlert ? "text-red-700" : "text-emerald-700"
                )}>
                  <AlertCircle className="h-4 w-4" />
                  Cảnh báo y tế quan trọng
                </h4>
                <div className={cn(
                  "mt-2 grid gap-2 text-sm sm:grid-cols-2",
                  hasMedicalAlert ? "text-red-700" : "text-emerald-700"
                )}>
                  <p><strong>Dị ứng:</strong> {formatMedicalList(allergies, "Không ghi nhận")}</p>
                  <p><strong>Tiền sử:</strong> {formatMedicalList(medicalHistory, "Không ghi nhận")}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="shrink-0 rounded-2xl bg-primary/8 p-1">
            <TabsTrigger value="history" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Lịch sử khám
              {records.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
                  {records.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="appointments" className="gap-1.5">
              <Calendar className="h-4 w-4" />
              Lịch hẹn ({patientAppts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-3 flex-1 overflow-auto">
            {loadingRecords ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Chưa có lịch sử khám</p>
                <p className="mt-1 text-sm text-muted-foreground">Chưa có kết quả khám nào cho bệnh nhân này</p>
              </div>
            ) : (
              <ScrollArea className="h-full pr-2">
                <div className="space-y-3">
                  {records.map((record) => (
                    <Card key={record._id} className="rounded-2xl border-primary/10 bg-white shadow-sm">
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="font-semibold">{record.diagnosis}</p>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {record.date}
                          </span>
                        </div>
                        {record.treatment && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Điều trị:</span> {record.treatment}
                          </p>
                        )}
                        {record.treatmentPlan && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Kế hoạch điều trị:</span> {record.treatmentPlan}
                          </p>
                        )}
                        {record.prescription && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Đơn thuốc:</span> {record.prescription}
                          </p>
                        )}
                        {record.nextDate && (
                          <p className="mt-1 flex items-center gap-1 text-sm text-primary">
                            <CalendarCheck className="h-3.5 w-3.5" />
                            <span className="font-medium">Tái khám dự kiến:</span>
                            {new Date(record.nextDate).toLocaleDateString("vi-VN")}
                          </p>
                        )}
                        {record.note && <p className="mt-1 text-sm italic text-muted-foreground">Ghi chú: {record.note}</p>}
                        {record.attachments?.length > 0 && (
                          <div className="mt-3 border-t border-primary/10 pt-3">
                            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              <Paperclip className="h-3.5 w-3.5" />
                              Tệp đính kèm
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {record.attachments.map((file, index) => {
                                const fileUrl = resolveAttachmentUrl(file);
                                const isImage = isImageAttachment(file);
                                const fileLabel = file.originalName || file.fileName || `Tệp ${index + 1}`;

                                if (isImage && fileUrl) {
                                  return (
                                    <button
                                      key={file._id || `${fileUrl}-${index}`}
                                      type="button"
                                      onClick={() => setPreviewAttachment({ ...file, fileUrl, label: fileLabel })}
                                      className="group overflow-hidden rounded-xl border border-primary/10 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                    >
                                      <img src={fileUrl} alt={fileLabel} className="h-20 w-full object-cover transition group-hover:opacity-85" />
                                      <div className="px-2 py-1.5">
                                        <span className="badge-status-confirmed">{getAttachmentTypeLabel(file)}</span>
                                        <p className="mt-1 truncate text-xs font-medium text-slate-700">{fileLabel}</p>
                                      </div>
                                    </button>
                                  );
                                }

                                return (
                                  <a
                                    key={file._id || `${fileUrl}-${index}`}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 rounded-xl border border-primary/10 bg-white p-3 text-xs font-medium text-primary shadow-sm transition hover:bg-primary/5"
                                  >
                                    <FileText className="h-4 w-4" />
                                    <span className="min-w-0 flex-1 truncate">{fileLabel}</span>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {record.doctorName && (
                          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" /> {record.doctorName}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="appointments" className="mt-3 flex-1 overflow-auto">
            {loadingAppts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : patientAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Calendar className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Chưa có lịch hẹn</p>
              </div>
            ) : (
              <ScrollArea className="h-full pr-2">
                <div className="space-y-3">
                  {patientAppts.map((appointment) => (
                    <div key={appointment._id} className="flex items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-3 text-sm">
                      <div>
                        <p className="font-medium">{appointment.serviceId?.name || appointment.serviceName || "Dịch vụ"}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatAppointmentLine(appointment)}
                        </p>
                      </div>
                      <ApptBadge appointment={appointment} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    <Dialog open={!!previewAttachment} onOpenChange={(value) => !value && setPreviewAttachment(null)}>
      <DialogContent className="modal-scroll max-h-[90vh] rounded-[28px] border-white/80 bg-white/95 shadow-2xl shadow-cyan-950/12 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            {previewAttachment?.label || "Tệp đính kèm"}
          </DialogTitle>
          <DialogDescription>{getAttachmentTypeLabel(previewAttachment || {})}</DialogDescription>
        </DialogHeader>
        {previewAttachment?.fileUrl && (
          <div className="overflow-hidden rounded-2xl border border-primary/10 bg-muted/20">
            <img
              src={previewAttachment.fileUrl}
              alt={previewAttachment.label || "Tệp đính kèm"}
              className="max-h-[68vh] w-full object-contain"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

export default function DoctorPatientsPage() {
  const refreshKey = useRealtimeRefresh(["appointment:changed", "exam-result:changed", "patient:changed", "user:changed"]);
  const [allPatients, setAllPatients] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const itemsPerPage = 9;

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/appointments");
      const appointments = response.data.data || [];
      const today = new Date();
      const patientMap = new Map();

      appointments.forEach((appointment) => {
        const patientData = appointment.patientId;
        const patientId = patientData?._id || patientData;
        if (!patientId || typeof patientData !== "object") return;

        const appointmentDate = getAppointmentDate(appointment);
        const serviceName = appointment.serviceId?.name || appointment.serviceName || "Dịch vụ";
        if (!patientMap.has(patientId)) {
          patientMap.set(patientId, {
            _id: patientId,
            name: patientData.fullName || patientData.name || "Bệnh nhân",
            phone: patientData.phone,
            email: patientData.email,
            avatar: patientData.avatar,
            appointmentsCount: 0,
            completedCount: 0,
            firstAppointment: null,
            lastAppointment: null,
            activeAppointment: null,
            todayAppointment: null,
            hasCompletedAppointment: false,
            latestService: serviceName,
          });
        }

        const patient = patientMap.get(patientId);
        patient.appointmentsCount += 1;
        if (appointment.status === "completed") {
          patient.completedCount += 1;
          patient.hasCompletedAppointment = true;
        }

        const firstDate = getAppointmentDate(patient.firstAppointment);
        if (!firstDate || (appointmentDate && appointmentDate < firstDate)) {
          patient.firstAppointment = appointment;
        }

        const lastDate = getAppointmentDate(patient.lastAppointment);
        if (!lastDate || (appointmentDate && appointmentDate > lastDate)) {
          patient.lastAppointment = appointment;
          patient.latestService = serviceName;
        }

        const activeDate = getAppointmentDate(patient.activeAppointment);
        if (
          actionableStatuses.has(appointment.status) &&
          !isAppointmentOverdue(appointment) &&
          (!activeDate || (appointmentDate && appointmentDate > activeDate))
        ) {
          patient.activeAppointment = appointment;
        }

        if (
          isSameDate(appointmentDate, today) &&
          actionableStatuses.has(appointment.status) &&
          !isAppointmentOverdue(appointment)
        ) {
          patient.todayAppointment = appointment;
        }
      });

      const patients = [...patientMap.values()].map((patient) => {
        const firstAppointmentDate = getAppointmentDate(patient.firstAppointment);
        return {
          ...patient,
          firstAppointmentDate,
          lastAppointmentDate: getAppointmentDate(patient.lastAppointment),
          isNewThisMonth: isThisMonth(firstAppointmentDate, today) && !patient.hasCompletedAppointment,
        };
      });

      setAllAppointments(appointments);
      setAllPatients(patients);
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải danh sách bệnh nhân");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [refreshKey]);

  const patients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allPatients.filter((patient) => {
      const matchesSearch =
        !query ||
        patient.name?.toLowerCase().includes(query) ||
        patient.phone?.includes(query) ||
        patient.email?.toLowerCase().includes(query);
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "new" && patient.isNewThisMonth) ||
        (activeFilter === "today" && patient.todayAppointment);
      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, allPatients, search]);

  const stats = useMemo(() => {
    const today = new Date();
    const todayAppointments = allAppointments.filter(
      (appointment) => isSameDate(getAppointmentDate(appointment), today) && actionableStatuses.has(appointment.status)
    );
    return {
      totalPatients: allPatients.length,
      newPatients: allPatients.filter((patient) => patient.isNewThisMonth).length,
      todayAppointments: todayAppointments.length,
    };
  }, [allAppointments, allPatients]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, search]);

  const totalPages = Math.ceil(patients.length / itemsPerPage);
  const paginatedPatients = patients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpen = (patient) => {
    setSelectedPatient(patient);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-heading">
          <div className="space-y-2">
            <div className="skeleton h-8 w-56" />
            <div className="skeleton h-4 w-80" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-20 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="soft-card space-y-3 p-5">
              <div className="flex items-center gap-3">
                <div className="skeleton h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-36" />
                  <div className="skeleton h-3 w-24" />
                </div>
              </div>
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="page-heading">
        <div className="max-w-2xl">
          <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
            Hồ sơ bệnh nhân
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Bệnh nhân của tôi</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Tra cứu bệnh nhân từng đặt lịch, xem lịch sử khám và theo dõi các cuộc hẹn liên quan trong một hồ sơ rõ ràng.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[420px]">
          <HeroMetric icon={Users} label="Tổng bệnh nhân" value={stats.totalPatients} />
          <HeroMetric icon={User} label="Bệnh nhân mới" value={stats.newPatients} tone="text-indigo-600" bg="bg-indigo-50" />
          <HeroMetric icon={CalendarCheck} label="Lịch hôm nay" value={stats.todayAppointments} tone="text-emerald-600" bg="bg-emerald-50" />
        </div>
      </div>

      <div className="hidden gap-4 md:grid-cols-3">
        <StatCard
          icon={Users}
          title="Tổng số bệnh nhân"
          value={stats.totalPatients}
          hint={stats.totalPatients > 0 ? `${patients.length} hiển thị` : ""}
        />
        <StatCard icon={User} title="Bệnh nhân mới tháng này" value={stats.newPatients} tone="bg-indigo-50 text-indigo-600" />
        <StatCard
          icon={CalendarCheck}
          title="Lịch khám hôm nay"
          value={stats.todayAppointments}
          hint={stats.todayAppointments > 0 ? "Cần theo dõi" : ""}
          tone="bg-emerald-50 text-emerald-600"
        />
      </div>

      <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm tên, SĐT, email..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="field-input h-11 rounded-xl pl-10"
              />
            </div>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="h-11 w-full rounded-full bg-white px-4 shadow-sm sm:w-auto sm:min-w-[132px]">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                {FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {patients.length === 0 ? (
        <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">{search || activeFilter !== "all" ? "Không tìm thấy bệnh nhân" : "Chưa có bệnh nhân"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || activeFilter !== "all" ? "Thử đổi từ khóa hoặc bộ lọc khác" : "Bệnh nhân sẽ xuất hiện sau khi có lịch hẹn"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedPatients.map((patient) => (
              <PatientCard key={patient._id} patient={patient} onOpen={handleOpen} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    if ((page === currentPage - 2 && page > 1) || (page === currentPage + 2 && page < totalPages)) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      <PatientDetailDialog
        patient={selectedPatient}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedPatient(null);
        }}
      />
    </div>
  );
}
