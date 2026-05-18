import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Phone,
  Stethoscope,
  History,
  FileText,
  Filter,
  Eye,
  Users,
  Home,
} from "lucide-react";
import axiosInstance from "@/api/httpClient";
import { useAuth } from "@/context/AuthContext";
import { usePageFocus } from "@/hooks/usePageFocus";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";
import { isAppointmentOverdue } from "@/utils/appointmentStatus";

// Returns Monday of the week containing `date`
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Mon
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatWeekRange(monday) {
  const start = monday.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }).replace(/\//g, "-");
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const end = sunday.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `Tuần ${start} – ${end}`;
}

function isoDate(date) {
  if (!date || isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function scheduleWeekKey(weekStart) {
  if (!weekStart) return null;
  if (weekStart instanceof Date) return isoDate(weekStart);
  if (typeof weekStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return weekStart;
  }
  return isoDate(new Date(weekStart));
}

const DAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

const DOCTOR_ACTIONABLE_STATUSES = ["pending", "confirmed", "rescheduled", "in_progress"];

const isDoctorActionableAppointment = (appointment) =>
  DOCTOR_ACTIONABLE_STATUSES.includes(appointment?.status) && !isAppointmentOverdue(appointment);

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

export default function DoctorSchedulePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const refreshKey = useRealtimeRefresh(["appointment:changed", "schedule:changed", "slots:changed", "exam-result:changed", "leave-request:changed"]);
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("all");
  const [appointmentPage, setAppointmentPage] = useState(1);
  const appointmentItemsPerPage = 8;

  // All appointments (no week filter)
  const [allAppointments, setAllAppointments] = useState([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allFilter, setAllFilter] = useState("all");

  // Detail modal
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [patientHistory, setPatientHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Status update
  const [updatingId, setUpdatingId] = useState(null);

  const weekOptions = useMemo(() => {
    const options = [];
    const monday = getWeekStart(new Date());
    monday.setDate(monday.getDate() - 28);

    for (let i = 0; i < 20; i++) {
      const optionDate = new Date(monday);
      options.push({
        value: isoDate(optionDate),
        label: formatWeekRange(optionDate),
      });
      monday.setDate(monday.getDate() + 7);
    }

    return options;
  }, []);

  const fetchAppointments = async (start) => {
    setLoading(true);
    try {
      // Try the new weekly schedule endpoint first
      const res = await axiosInstance.get(
        `/doctors/me/schedule?weekStart=${isoDate(start)}`
      );
      const list = res.data.data?.appointments || res.data.appointments || [];
      setAppointments(list);
    } catch (err) {
      // Fallback: use the generic appointments list filtered by date range
      try {
        const endDate = new Date(start);
        endDate.setDate(endDate.getDate() + 6);
        const res = await axiosInstance.get(`/appointments`);
        const list = res.data.data || res.data.appointments || [];
        // Filter to this week
        const filtered = list.filter((a) => {
          const d = new Date(a.appointmentDate || a.date);
          return d >= start && d <= endDate;
        });
        setAppointments(filtered);
      } catch (err2) {
        console.error("Failed to fetch appointments:", err2);
        if (err2.response?.status !== 404) {
          toast.error("Không thể tải lịch khám. Vui lòng làm mới trang.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAppointments = async () => {
    setAllLoading(true);
    try {
      const res = await axiosInstance.get("/appointments");
      const list = res.data.data || res.data.appointments || [];
      // Sort: upcoming first, then past
      list.sort((a, b) => {
        const da = new Date(a.appointmentDate || a.date);
        const db = new Date(b.appointmentDate || b.date);
        return da - db;
      });
      setAllAppointments(list);
    } catch (err) {
      console.error("Failed to fetch all appointments:", err);
      if (err.response?.status !== 404) {
        toast.error("Không thể tải danh sách lịch hẹn. Vui lòng làm mới trang.");
      }
    } finally {
      setAllLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments(weekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, refreshKey, user]);

  useEffect(() => {
    fetchAllAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshKey]);

  // Refetch lịch hẹn khi user quay lại tab
  usePageFocus(useCallback(() => {
    fetchAppointments(weekStart);
    fetchAllAppointments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, user, fetchAppointments, fetchAllAppointments]));

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goToday = () => setWeekStart(getWeekStart());

  // Group appointments by day-of-week index (0=Mon … 6=Sun)
  const getWeekDays = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const getApptsForDay = (dayDate) => {
    const dayStr = isoDate(dayDate);
    return appointments.filter((a) => {
      const apptDate = new Date(a.appointmentDate || a.date);
      return isoDate(apptDate) === dayStr;
    }).filter((a) => filter === "all" || a.status === filter);
  };

  // ── Fetch patient exam history ────────────────────────────────
  const fetchPatientHistory = async (patientId) => {
    if (!patientId) return;
    setHistoryLoading(true);
    setPatientHistory([]);
    try {
      const res = await axiosInstance.get(`/exam-results/by-patient?patientId=${patientId}`);
      setPatientHistory(res.data.data || []);
    } catch {
      setPatientHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      let endpoint = "";
      switch (newStatus) {
        case "confirmed": endpoint = `/appointments/${id}/confirm`; break;
        case "completed": endpoint = `/appointments/${id}/complete`; break;
        case "cancelled": endpoint = `/appointments/${id}/cancel`; break;
        default: throw new Error("Invalid status update");
      }

      await axiosInstance.patch(endpoint);
      toast.success("Cập nhật trạng thái thành công");
      fetchAppointments(weekStart);
      fetchAllAppointments();
      if (selectedAppt?._id === id) {
        setSelectedAppt((prev) => prev ? { ...prev, status: newStatus } : prev);
      }
      setShowDetail(false);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật trạng thái");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleKham = async (id) => {
    setUpdatingId(id);
    try {
      await axiosInstance.patch(`/appointments/${id}/checkin`);
      toast.success("Bắt đầu khám bệnh");
      setUpdatingId(null);
      navigate("/doctor/results?tab=pending&openId=" + encodeURIComponent(id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi cập nhật trạng thái");
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status, appointment) => {
    if (appointment && isAppointmentOverdue(appointment))
      return <span className="badge-status-overdue">Quá hạn</span>;
    const MAP = {
      pending:     <span className="badge-status-pending">Chờ xác nhận</span>,
      confirmed:   <span className="badge-status-confirmed">Đã xác nhận</span>,
      in_progress: <span className="badge-status-confirmed">Đang khám</span>,
      completed:   <span className="badge-status-completed">Hoàn thành</span>,
      cancelled:   <span className="badge-status-cancelled">Đã hủy</span>,
      rescheduled: <span className="badge-status-pending">Đổi lịch</span>,
    };
    return MAP[status] ?? <span className="badge-status-pending">{status}</span>;
  };

  const weekDays = getWeekDays();
  const todayStr = isoDate(new Date());
  const totalThisWeek = appointments.length;
  const filteredTotal = appointments.filter(
    (a) => filter === "all" || a.status === filter
  ).length;
  const isTodayAppointment = (appointment) => {
    const d = new Date(appointment.appointmentDate || appointment.date);
    return !isNaN(d.getTime()) && isoDate(d) === todayStr;
  };
  const sortByAppointmentTime = (a, b) =>
    (a.startTime || a.timeSlot || "").localeCompare(b.startTime || b.timeSlot || "");
  const todayAppointments = appointments
    .filter(isTodayAppointment)
    .sort(sortByAppointmentTime);
  const todayActionableCount = todayAppointments.filter(isDoctorActionableAppointment).length;
  const actionableAllCount = allAppointments.filter(isDoctorActionableAppointment).length;
  const getAppointmentDisplayStatus = (appointment) =>
    isAppointmentOverdue(appointment) ? "overdue" : appointment?.status;
  const matchesAppointmentStatus = (appointment) => {
    if (appointmentStatusFilter === "all") return true;
    return getAppointmentDisplayStatus(appointment) === appointmentStatusFilter;
  };
  const mergedScopeAppointments = appointments
    .filter(matchesAppointmentStatus)
    .sort((a, b) => {
      const da = new Date(a.appointmentDate || a.date);
      const db = new Date(b.appointmentDate || b.date);
      if (da - db !== 0) return da - db;
      return sortByAppointmentTime(a, b);
    });
  const appointmentTotalPages = Math.ceil(mergedScopeAppointments.length / appointmentItemsPerPage);
  const paginatedScopeAppointments = mergedScopeAppointments.slice(
    (appointmentPage - 1) * appointmentItemsPerPage,
    appointmentPage * appointmentItemsPerPage
  );
  const appointmentListKey = mergedScopeAppointments.map((appointment) => appointment._id).join("|");
  const mergedScopeTitle = "Lịch hẹn theo tuần";
  const mergedScopeDescription = `Tuần ${formatDate(weekStart)} - ${formatDate(weekDays[6])} - ${mergedScopeAppointments.length} lịch`;
  useEffect(() => {
    setAppointmentPage(1);
  }, [appointmentStatusFilter, weekStart, appointmentListKey]);
  useEffect(() => {
    if (appointmentTotalPages > 0 && appointmentPage > appointmentTotalPages) {
      setAppointmentPage(appointmentTotalPages);
    }
  }, [appointmentPage, appointmentTotalPages]);
  const openAppointmentDetail = (appointment) => {
    setSelectedAppt(appointment);
    setShowDetail(true);
    fetchPatientHistory(appointment.patientId?._id || appointment.patientId);
  };
  const renderAppointmentActions = (appointment) => (
    <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
      {(appointment.status === "pending" || appointment.status === "rescheduled") && !isAppointmentOverdue(appointment) && (
        <Button size="sm" onClick={() => handleStatusChange(appointment._id, "confirmed")} disabled={updatingId === appointment._id}>
          {updatingId === appointment._id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
          {appointment.status === "rescheduled" ? "Xác nhận lại" : "Xác nhận"}
        </Button>
      )}
      {appointment.status === "confirmed" && !isAppointmentOverdue(appointment) && (
        <Button size="sm" variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={() => handleKham(appointment._id)} disabled={updatingId === appointment._id}>
          {updatingId === appointment._id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Stethoscope className="mr-1 h-3 w-3" />}
          Khám
        </Button>
      )}
      {appointment.status === "in_progress" && (
        <Button size="sm" variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-200" onClick={() => handleStatusChange(appointment._id, "completed")} disabled={updatingId === appointment._id}>
          {updatingId === appointment._id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
          Hoàn thành
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          openAppointmentDetail(appointment);
        }}
      >
        <Eye className="mr-1 h-3 w-3" />
        Chi tiết
      </Button>
    </div>
  );

  const renderAppointmentCard = (appointment, options = {}) => {
    const { compactDate = false, highlightToday = false } = options;
    const apptDate = new Date(appointment.appointmentDate || appointment.date);
    const isToday = !Number.isNaN(apptDate.getTime()) && isoDate(apptDate) === todayStr;
    const patientName = appointment.patientId?.fullName || appointment.patientName || "Bệnh nhân";
    const patientPhone = appointment.patientId?.phone || "";
    const serviceName = appointment.serviceId?.name || appointment.serviceName || "Dịch vụ";
    const apptTime = appointment.startTime || appointment.timeSlot || "Chưa có giờ";
    const note = appointment.notes || appointment.note;

    return (
      <Card
        key={appointment._id}
        className={`overflow-hidden rounded-[24px] border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 ${highlightToday && isToday ? "border-primary/30 bg-primary/5" : ""}`}
        onClick={() => openAppointmentDetail(appointment)}
      >
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
              <div className={`rounded-2xl p-3 text-sm ${isToday ? "bg-primary text-primary-foreground" : "bg-primary/8 text-slate-900"}`}>
                <div className="flex items-center gap-1 font-medium">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {Number.isNaN(apptDate.getTime())
                    ? "Chưa có ngày"
                    : compactDate
                      ? apptDate.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })
                      : apptDate.toLocaleDateString("vi-VN")}
                </div>
                <div className={`mt-1 flex items-center gap-1 font-semibold ${isToday ? "text-white" : "text-primary"}`}>
                  <Clock className="h-3.5 w-3.5" />
                  {apptTime}
                </div>
                {isToday && <Badge className="mt-2" variant="secondary">Hôm nay</Badge>}
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{patientName}</h3>
                  {getStatusBadge(appointment.status, appointment)}
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {patientPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {patientPhone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Stethoscope className="h-3.5 w-3.5" />
                    {serviceName}
                  </span>
                </div>
                {note && <p className="line-clamp-2 text-sm text-muted-foreground">Ghi chú: {note}</p>}
              </div>
            </div>
            {renderAppointmentActions(appointment)}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div className="max-w-2xl">
          <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
            Lịch hẹn bác sĩ
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Quản lý lịch khám</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Theo dõi lịch khám, xử lý trạng thái hẹn và xem ca làm việc được phân công trong một bảng điều phối rõ ràng.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[420px]">
          <HeroMetric icon={Calendar} label="Hôm nay" value={todayActionableCount} />
          <HeroMetric icon={Clock} label="Cần xử lý" value={actionableAllCount} tone="text-yellow-600" bg="bg-yellow-50" />
          <HeroMetric icon={Users} label="Tuần này" value={totalThisWeek} tone="text-slate-700" bg="bg-slate-100" />
        </div>
      </div>

      <Tabs defaultValue="appointments" className="space-y-4">
        {/* ── Tab: Lịch hẹn hôm nay ── */}
        <TabsContent value="today" className="space-y-4 mt-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Lịch hẹn hôm nay</h2>
              <p className="text-muted-foreground text-sm">
                {todayActionableCount} lịch cần xử lý trong ngày {new Date().toLocaleDateString("vi-VN")}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchAppointments(weekStart)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cập nhật dữ liệu"}
            </Button>
          </div>

          {todayAppointments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Không có lịch hẹn cần xử lý hôm nay</p>
                <p className="text-sm text-muted-foreground mt-1">Các lịch hoàn thành, đã hủy hoặc quá hạn không được tính vào số cần xử lý.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {todayAppointments.map((appt) => {
                const patientName = appt.patientId?.fullName || appt.patientName || "Bệnh nhân";
                const patientPhone = appt.patientId?.phone || "";
                const serviceName = appt.serviceId?.name || appt.serviceName || "Dịch vụ";
                const apptTime = appt.startTime || appt.timeSlot || "Chưa có giờ";
                const note = appt.notes || appt.note;

                return (
                  <Card
                    key={appt._id}
                    className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md ${isAppointmentOverdue(appt) ? "border-orange-200 bg-orange-50/40" : ""}`}
                    onClick={() => openAppointmentDetail(appt)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex gap-4">
                          <div className="flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Clock className="h-4 w-4" />
                            <span className="mt-1 text-sm font-bold">{apptTime}</span>
                          </div>
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{patientName}</h3>
                              {getStatusBadge(appt.status, appt)}
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              {patientPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3.5 w-3.5" />
                                  {patientPhone}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Stethoscope className="h-3.5 w-3.5" />
                                {serviceName}
                              </span>
                            </div>
                            {note && <p className="line-clamp-2 text-sm text-muted-foreground">Ghi chú: {note}</p>}
                          </div>
                        </div>
                        {renderAppointmentActions(appt)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

        </TabsContent>

        {/* ── Tab: Tất cả lịch hẹn ── */}
        <TabsContent value="all" className="space-y-4 mt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tất cả lịch hẹn</h1>
              <p className="text-muted-foreground text-sm">
                Toàn bộ lịch sử đặt hẹn của bệnh nhân — {allAppointments.length} lịch
              </p>
            </div>
            <div className="flex gap-2">
              <Select value={allFilter} onValueChange={setAllFilter}>
                <SelectTrigger className="w-44 h-10">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ({allAppointments.length})</SelectItem>
                  <SelectItem value="pending">Chờ xác nhận</SelectItem>
                  <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                  <SelectItem value="rescheduled">Đổi lịch</SelectItem>
                  <SelectItem value="in_progress">Đang khám</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-10" onClick={fetchAllAppointments} disabled={allLoading}>
                {allLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Làm mới"}
              </Button>
            </div>
          </div>

          {allLoading ? (
            <div className="flex h-[40vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (() => {
            const filtered = allAppointments
              .filter(a => allFilter === "all" || a.status === allFilter)
              .sort((a, b) => new Date(b.appointmentDate || b.date) - new Date(a.appointmentDate || a.date));

            if (filtered.length === 0) return (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Không có lịch hẹn</p>
                  <p className="text-muted-foreground text-sm mt-1">Không tìm thấy dữ liệu phù hợp</p>
                </CardContent>
              </Card>
            );

            return (
              <div className="grid gap-3">
                {filtered.map((appt) => {
                  const apptDate = new Date(appt.appointmentDate || appt.date);
                  const isToday = isoDate(apptDate) === todayStr;
                  const patientName = appt.patientId?.fullName || appt.patientName || "Bệnh nhân";
                  const patientPhone = appt.patientId?.phone || "";
                  const serviceName = appt.serviceId?.name || appt.serviceName || "Dịch vụ";
                  const apptTime = appt.startTime || appt.timeSlot || "Chưa có giờ";

                  return (
                    <Card
                      key={appt._id}
                      className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md ${isToday ? "border-primary/30 bg-primary/5" : ""}`}
                      onClick={() => openAppointmentDetail(appt)}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                            <div className="rounded-md bg-muted/60 p-3 text-sm">
                              <div className="flex items-center gap-1 font-medium">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                {Number.isNaN(apptDate.getTime()) ? "Chưa có ngày" : apptDate.toLocaleDateString("vi-VN")}
                              </div>
                              <div className="mt-1 flex items-center gap-1 text-primary font-semibold">
                                <Clock className="h-3.5 w-3.5" />
                                {apptTime}
                              </div>
                              {isToday && <Badge className="mt-2" variant="secondary">Hôm nay</Badge>}
                            </div>
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold">{patientName}</h3>
                                {getStatusBadge(appt.status, appt)}
                              </div>
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                {patientPhone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5" />
                                    {patientPhone}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Stethoscope className="h-3.5 w-3.5" />
                                  {serviceName}
                                </span>
                              </div>
                            </div>
                          </div>
                          {renderAppointmentActions(appt)}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{mergedScopeTitle}</h2>
                  <p className="text-sm text-muted-foreground">{mergedScopeDescription}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:ml-auto lg:justify-end">
                  <Select value={appointmentStatusFilter} onValueChange={setAppointmentStatusFilter}>
                    <SelectTrigger className="h-11 w-full rounded-full bg-white shadow-sm sm:w-[240px]">
                      <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả trạng thái</SelectItem>
                      <SelectItem value="pending">Chờ xác nhận</SelectItem>
                      <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                      <SelectItem value="rescheduled">Đổi lịch</SelectItem>
                      <SelectItem value="in_progress">Đang khám</SelectItem>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                      <SelectItem value="cancelled">Đã hủy</SelectItem>
                      <SelectItem value="overdue">Quá hạn</SelectItem>
                    </SelectContent>
                  </Select>
                    <div className="flex h-11 w-full items-center gap-1 overflow-hidden rounded-full border border-primary/10 bg-white shadow-sm sm:w-auto">
                      <Button variant="ghost" size="icon" onClick={prevWeek} disabled={loading} className="h-11 w-10 rounded-none">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Select value={isoDate(weekStart)} onValueChange={(value) => setWeekStart(new Date(`${value}T00:00:00`))}>
                        <SelectTrigger className="h-11 w-full border-none shadow-none focus:ring-0 sm:w-[268px]">
                          <Calendar className="mr-2 h-4 w-4 text-primary" />
                          <SelectValue placeholder="Chọn tuần" />
                        </SelectTrigger>
                        <SelectContent>
                          {weekOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={nextWeek} disabled={loading} className="h-11 w-10 rounded-none">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goToday}
                      className="h-11 w-11 rounded-full bg-white shadow-sm"
                      aria-label="Về tuần hiện tại"
                    >
                      <Home className="h-4 w-4" />
                    </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 rounded-full bg-white shadow-sm"
                    aria-label="Làm mới lịch hẹn"
                    onClick={() => {
                      fetchAppointments(weekStart);
                    }}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, i) => {
                const dayStr = isoDate(day);
                const dayAppts = appointments
                  .filter((appointment) => isoDate(new Date(appointment.appointmentDate || appointment.date)) === dayStr)
                  .filter(matchesAppointmentStatus);
                const isToday = isoDate(day) === todayStr;
                return (
                  <div key={i} className="min-h-[140px]">
                    <div className={`mb-1 rounded-t-md px-1 py-2 text-center text-xs font-medium ${isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <div>{DAY_LABELS[i]}</div>
                      <div className="text-base font-bold">{day.getDate()}</div>
                    </div>
                    <div className="space-y-1">
                      {dayAppts.length === 0 ? (
                        <div className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">Trống</div>
                      ) : (
                        dayAppts.map((appointment) => {
                          const patientName = appointment.patientId?.fullName || appointment.patientName || "Bệnh nhân";
                          const time = appointment.startTime || appointment.timeSlot || "";
                          const isOverdue = isAppointmentOverdue(appointment);
                          const statusColors = {
                            pending: "border-l-yellow-400 bg-yellow-50",
                            confirmed: "border-l-blue-400 bg-blue-50",
                            completed: "border-l-green-400 bg-green-50",
                            cancelled: "border-l-red-400 bg-red-50 opacity-60",
                            rescheduled: "border-l-purple-400 bg-purple-50",
                            in_progress: "border-l-cyan-400 bg-cyan-50",
                          };
                          return (
                            <button
                              key={appointment._id}
                              onClick={() => openAppointmentDetail(appointment)}
                              className={`w-full cursor-pointer rounded border-l-2 px-2 py-1 text-left text-xs transition-shadow hover:shadow-sm ${isOverdue ? "border-l-orange-400 bg-orange-50" : statusColors[appointment.status] || "bg-gray-50"}`}
                            >
                              <div className="truncate font-medium">{time}</div>
                              <div className="truncate text-muted-foreground">{patientName}</div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          {loading ? (
            <div className="flex h-[40vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : mergedScopeAppointments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">Không có lịch hẹn</p>
                <p className="mt-1 text-sm text-muted-foreground">Không tìm thấy dữ liệu phù hợp với phạm vi và trạng thái đã chọn</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
              <CardContent className="p-4">
                <h2 className="mb-3 text-lg font-semibold">Danh sách lịch hẹn</h2>
                <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white">
                  <div className="max-h-[420px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-primary/5">
                        <TableRow>
                          <TableHead className="min-w-[160px]">Thời gian</TableHead>
                          <TableHead className="min-w-[180px]">Bệnh nhân</TableHead>
                          <TableHead className="min-w-[140px]">SĐT</TableHead>
                          <TableHead className="min-w-[180px]">Dịch vụ</TableHead>
                          <TableHead className="min-w-[130px]">Trạng thái</TableHead>
                          <TableHead className="min-w-[130px] text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedScopeAppointments.map((appointment) => {
                          const patientName = appointment.patientId?.fullName || appointment.patientName || "Bệnh nhân";
                          const patientPhone = appointment.patientId?.phone || appointment.patientPhone || "Chưa có";
                          const serviceName = appointment.serviceId?.name || appointment.serviceName || "Dịch vụ";
                          const apptDate = new Date(appointment.appointmentDate || appointment.date);
                          const apptTime = appointment.startTime || appointment.timeSlot || "";

                          return (
                            <TableRow
                              key={appointment._id}
                              className="cursor-pointer hover:bg-primary/5"
                              onClick={() => openAppointmentDetail(appointment)}
                            >
                              <TableCell>
                                <div className="font-semibold text-slate-900">
                                  {Number.isNaN(apptDate.getTime()) ? "Chưa có ngày" : apptDate.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })}
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-primary">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span className="font-semibold">{apptTime || "Chưa có giờ"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold text-slate-900">{patientName}</TableCell>
                              <TableCell className="text-muted-foreground">{patientPhone}</TableCell>
                              <TableCell className="text-muted-foreground">{serviceName}</TableCell>
                              <TableCell>{getStatusBadge(appointment.status, appointment)}</TableCell>
                              <TableCell>
                                <div className="flex justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full bg-white"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openAppointmentDetail(appointment);
                                    }}
                                  >
                                    <Eye className="mr-1 h-3.5 w-3.5" />
                                    Chi tiết
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                {appointmentTotalPages > 1 && (
                  <div className="mt-4 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setAppointmentPage((page) => Math.max(1, page - 1))}
                            disabled={appointmentPage === 1}
                            className={appointmentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>

                        {[...Array(appointmentTotalPages)].map((_, index) => {
                          const page = index + 1;
                          if (page === 1 || page === appointmentTotalPages || (page >= appointmentPage - 1 && page <= appointmentPage + 1)) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setAppointmentPage(page)}
                                  isActive={appointmentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                          if ((page === appointmentPage - 2 && page > 1) || (page === appointmentPage + 2 && page < appointmentTotalPages)) {
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
                            onClick={() => setAppointmentPage((page) => Math.min(appointmentTotalPages, page + 1))}
                            disabled={appointmentPage === appointmentTotalPages}
                            className={appointmentPage === appointmentTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="hidden">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Lịch khám</h1>
              <p className="text-muted-foreground">
                Tuần: {formatDate(weekStart)} –{" "}
                {formatDate(weekDays[6])} · {totalThisWeek} lịch hẹn
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* Week navigation */}
              <div className="flex items-center gap-1 border rounded-md overflow-hidden">
                <Button variant="ghost" size="icon" onClick={prevWeek} disabled={loading} className="rounded-none h-9 w-9">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToday} className="rounded-none px-3 h-9">
                  Hôm nay
                </Button>
                <Button variant="ghost" size="icon" onClick={nextWeek} disabled={loading} className="rounded-none h-9 w-9">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Status filter */}
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ({totalThisWeek})</SelectItem>
                  <SelectItem value="pending">Chờ khám</SelectItem>
                  <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {[1,2,3,4,5,6,7].map(i=>(
                <div key={i} className="min-h-[140px]">
                  <div className="skeleton h-12 w-full rounded-t-md mb-1" />
                  <div className="space-y-1">
                    <div className="skeleton h-10 rounded" />
                    <div className="skeleton h-10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
              <>
              {/* ── Weekly Calendar Grid ── */}
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, i) => {
                  const dayAppts = getApptsForDay(day);
                  const isToday = isoDate(day) === todayStr;
                  return (
                    <div key={i} className="min-h-[140px]">
                      {/* Day header */}
                      <div
                        className={`text-center py-2 px-1 rounded-t-md text-xs font-medium mb-1 ${isToday
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                          }`}
                      >
                        <div>{DAY_LABELS[i]}</div>
                        <div className="text-base font-bold">
                          {day.getDate()}
                        </div>
                      </div>

                      {/* Appointments */}
                      <div className="space-y-1">
                        {dayAppts.length === 0 ? (
                          <div className="text-center text-xs text-muted-foreground py-3 border border-dashed rounded-md">
                            Trống
                          </div>
                        ) : (
                          dayAppts.map((appt) => {
                            const patientName =
                              appt.patientId?.fullName ||
                              appt.patientName ||
                              "Bệnh nhân";
                            const time = appt.startTime || appt.timeSlot || "";
                            const statusColors = {
                              pending: "border-l-yellow-400 bg-yellow-50",
                              confirmed: "border-l-blue-400 bg-blue-50",
                              completed: "border-l-green-400 bg-green-50",
                              cancelled: "border-l-red-400 bg-red-50 opacity-60",
                              rescheduled: "border-l-purple-400 bg-purple-50",
                            };
                            return (
                              <button
                                key={appt._id}
                                onClick={() => {
                                  setSelectedAppt(appt);
                                  setShowDetail(true);
                                  fetchPatientHistory(appt.patientId?._id || appt.patientId);
                                }}
                                className={`w-full text-left text-xs border-l-2 rounded px-2 py-1 hover:shadow-sm transition-shadow cursor-pointer ${statusColors[appt.status] || "bg-gray-50"
                                  }`}
                              >
                                <div className="font-medium truncate">{time}</div>
                                <div className="truncate text-muted-foreground">
                                  {patientName}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── List view (mobile / summary) ── */}
              {filteredTotal === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Không có lịch khám</p>
                    <p className="text-muted-foreground">
                      Không có cuộc hẹn nào phù hợp với bộ lọc trong tuần này
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Upcoming appointments list */}
              {filteredTotal > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">Chi tiết lịch khám</h2>
                  <div className="grid gap-3">
                    {appointments
                      .filter((a) => filter === "all" || a.status === filter)
                      .sort((a, b) => {
                        const da = new Date(a.appointmentDate || a.date);
                        const db = new Date(b.appointmentDate || b.date);
                        if (da - db !== 0) return da - db;
                        return (a.startTime || a.timeSlot || "").localeCompare(
                          b.startTime || b.timeSlot || ""
                        );
                      })
                      .map((appointment) => {
                        const patientName =
                          appointment.patientId?.fullName ||
                          appointment.patientName ||
                          "Bệnh nhân";
                        const serviceName =
                          appointment.serviceId?.name ||
                          appointment.serviceName ||
                          "Dịch vụ";
                        const apptDate = new Date(
                          appointment.appointmentDate || appointment.date
                        );
                        const apptTime = appointment.startTime || appointment.timeSlot;

                        return (
                          <Card
                            key={appointment._id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => {
                              setSelectedAppt(appointment);
                              setShowDetail(true);
                              fetchPatientHistory(appointment.patientId?._id || appointment.patientId);
                            }}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    {patientName}
                                  </CardTitle>
                                  <CardDescription>
                                    {serviceName}
                                    {appointment.patientId?.phone
                                      ? ` · SĐT: ${appointment.patientId.phone}`
                                      : ""}
                                  </CardDescription>
                                </div>
                                {getStatusBadge(appointment.status, appointment)}
                              </div>
                            </CardHeader>
                            <CardContent className="pb-3">
                              <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {apptDate.toLocaleDateString("vi-VN", {
                                      weekday: "short",
                                      day: "2-digit",
                                      month: "2-digit",
                                    })}
                                  </span>
                                </div>
                                {apptTime && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                      {apptTime}
                                      {appointment.endTime
                                        ? ` - ${appointment.endTime}`
                                        : ""}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Quick action buttons */}
                              {appointment.status !== "completed" &&
                                appointment.status !== "cancelled" && (
                                  <div
                                    className="mt-3 flex gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {(appointment.status === "pending" || appointment.status === "rescheduled") && !isAppointmentOverdue(appointment) && (
                                      <Button
                                        size="sm"
                                        onClick={() => handleStatusChange(appointment._id, "confirmed")}
                                        disabled={updatingId === appointment._id}
                                      >
                                        {updatingId === appointment._id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                                        {appointment.status === "rescheduled" ? "Xác nhận lại" : "Xác nhận"}
                                      </Button>
                                    )}
                                    {appointment.status === "confirmed" && !isAppointmentOverdue(appointment) && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleKham(appointment._id)}
                                        disabled={updatingId === appointment._id}
                                      >
                                        {updatingId === appointment._id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                                        Khám
                                      </Button>
                                    )}
                                    {appointment.status === "in_progress" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleStatusChange(appointment._id, "completed")}
                                        disabled={updatingId === appointment._id}
                                      >
                                        {updatingId === appointment._id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                                        Hoàn thành
                                      </Button>
                                    )}
                                  </div>
                                )}
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              )}
              </>
          )}
          </div>
        </TabsContent>

      </Tabs>

      {/* ── Appointment Detail Modal ── */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết lịch hẹn</DialogTitle>
          </DialogHeader>
          {selectedAppt && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">Thông tin</TabsTrigger>
                <TabsTrigger value="history" className="flex-1 flex items-center gap-1">
                  <History className="h-3.5 w-3.5" /> Lịch sử khám
                </TabsTrigger>
              </TabsList>

              {/* ── TAB: Thông tin lịch hẹn ── */}
              <TabsContent value="info">
            <div className="space-y-4">
              {/* Patient info */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">
                    {selectedAppt.patientId?.fullName ||
                      selectedAppt.patientName ||
                      "Bệnh nhân"}
                  </p>
                  {selectedAppt.patientId?.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedAppt.patientId.phone}
                    </p>
                  )}
                  {selectedAppt.patientId?.email && (
                    <p className="text-sm text-muted-foreground">
                      {selectedAppt.patientId.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Service & time */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 border rounded-lg">
                  <p className="text-muted-foreground flex items-center gap-1 mb-1">
                    <Stethoscope className="h-3 w-3" /> Dịch vụ
                  </p>
                  <p className="font-medium">
                    {selectedAppt.serviceId?.name ||
                      selectedAppt.serviceName ||
                      "—"}
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-muted-foreground flex items-center gap-1 mb-1">
                    <Clock className="h-3 w-3" /> Thời gian
                  </p>
                  <p className="font-medium">
                    {selectedAppt.startTime || selectedAppt.timeSlot || "—"}
                    {selectedAppt.endTime
                      ? ` - ${selectedAppt.endTime}`
                      : ""}
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-muted-foreground flex items-center gap-1 mb-1">
                    <Calendar className="h-3 w-3" /> Ngày khám
                  </p>
                  <p className="font-medium">
                    {selectedAppt.appointmentDate || selectedAppt.date
                      ? new Date(
                        selectedAppt.appointmentDate || selectedAppt.date
                      ).toLocaleDateString("vi-VN")
                      : "—"}
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-muted-foreground mb-1">Trạng thái</p>
                  {getStatusBadge(selectedAppt.status, selectedAppt)}
                </div>
              </div>

              {/* Notes */}
              {(selectedAppt.notes || selectedAppt.note) && (
                <div className="p-3 border rounded-lg text-sm">
                  <p className="text-muted-foreground mb-1">Ghi chú bệnh nhân</p>
                  <p>{selectedAppt.notes || selectedAppt.note}</p>
                </div>
              )}

              {/* Action buttons */}
              {selectedAppt.status !== "completed" &&
                selectedAppt.status !== "cancelled" && (
                  <div className="flex gap-2 pt-2">
                    {(selectedAppt.status === "pending" || selectedAppt.status === "rescheduled") && !isAppointmentOverdue(selectedAppt) && (
                      <Button
                        className="flex-1"
                        onClick={() => handleStatusChange(selectedAppt._id, "confirmed")}
                        disabled={updatingId === selectedAppt._id}
                      >
                        {updatingId === selectedAppt._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        {selectedAppt.status === "rescheduled" ? "Xác nhận lại lịch đổi" : "Xác nhận lịch hẹn"}
                      </Button>
                    )}
                    {selectedAppt.status === "confirmed" && !isAppointmentOverdue(selectedAppt) && (
                      <Button
                        className="flex-1"
                        variant="secondary"
                        onClick={() => handleKham(selectedAppt._id)}
                        disabled={updatingId === selectedAppt._id}
                      >
                        {updatingId === selectedAppt._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Stethoscope className="mr-2 h-4 w-4" />}
                        Bắt đầu khám
                      </Button>
                    )}
                    {selectedAppt.status === "in_progress" && (
                      <Button
                        className="flex-1"
                        onClick={() => handleStatusChange(selectedAppt._id, "completed")}
                        disabled={updatingId === selectedAppt._id}
                      >
                        {updatingId === selectedAppt._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Đánh dấu hoàn thành
                      </Button>
                    )}
                  </div>
                )}
            </div>
              </TabsContent>

              {/* ── TAB: Lịch sử khám ── */}
              <TabsContent value="history">
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang tải lịch sử...
                    </div>
                  ) : patientHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                      <FileText className="h-8 w-8 opacity-30" />
                      <p className="text-sm">Chưa có lịch sử khám</p>
                    </div>
                  ) : (
                    patientHistory.map((result) => (
                      <div key={result._id} className="border rounded-lg p-3 text-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {result.createdAt
                              ? new Date(result.createdAt).toLocaleDateString("vi-VN")
                              : "—"}
                          </span>
                          {result.nextDate && (
                            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">
                              Tái khám: {new Date(result.nextDate).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{result.diagnosis}</p>
                          {result.treatment && (
                            <p className="text-muted-foreground mt-0.5">
                              <span className="font-medium text-gray-600">Điều trị:</span> {result.treatment}
                            </p>
                          )}
                          {result.prescription && (
                            <p className="text-muted-foreground mt-0.5">
                              <span className="font-medium text-gray-600">Đơn thuốc:</span> {result.prescription}
                            </p>
                          )}
                          {result.note && (
                            <p className="text-muted-foreground mt-0.5 italic">{result.note}</p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
