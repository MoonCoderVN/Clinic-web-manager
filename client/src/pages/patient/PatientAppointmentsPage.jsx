import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar, Clock, User, Loader2, Plus, Edit2, Search, Eye, XCircle, ClipboardList, Stethoscope, Funnel, ShieldCheck } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { appointmentsApi, doctorsApi } from "@/api";
import { usePageFocus } from "@/hooks/usePageFocus";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";
import { canPatientModifyAppointment, getAppointmentDateTime, isAppointmentOverdue, isAppointmentWithinHours } from "@/utils/appointmentStatus";
import { getStatusBadge } from "@/utils/statusBadge";

const STATUS_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "rescheduled", label: "Đã đổi lịch" },
  { value: "in_progress", label: "Đang khám" },
  { value: "completed", label: "Đã khám" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "overdue", label: "Quá hạn" },
];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString("vi-VN") : "-");
const getEffectiveDate = (appt) => appt.appointmentDate || appt.date;
const getEffectiveTime = (appt) => appt.startTime || appt.timeSlot;
const getDoctorName = (appt) => appt.doctorId?.userId?.fullName || appt.doctorId?.name || appt.doctorName || "Đang cập nhật";
const getServiceName = (appt) => appt.serviceId?.name || appt.serviceName || "Dịch vụ nha khoa";
const normalizeAppointments = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.appointments)) return payload.appointments;
  if (Array.isArray(payload?.data?.appointments)) return payload.data.appointments;
  return [];
};
const normalizeSlots = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.slots)) return payload.slots;
  if (Array.isArray(payload?.data?.slots)) return payload.data.slots;
  return [];
};
const matchesStatusFilter = (appointment, filter) => {
  if (filter === "all") return true;
  if (filter === "overdue") return isAppointmentOverdue(appointment);
  if (["pending", "confirmed", "rescheduled"].includes(filter)) {
    return appointment.status === filter && !isAppointmentOverdue(appointment);
  }
  return appointment.status === filter;
};

export default function PatientAppointmentsPage() {
  const refreshKey = useRealtimeRefresh(["appointment:changed"]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [rescheduleId, setRescheduleId] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchAppointments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await appointmentsApi.getMine();
      setAppointments(normalizeAppointments(response.data));
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      if (error.response?.status !== 404) toast.error("Không thể tải danh sách lịch hẹn");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments, refreshKey]);

  usePageFocus(useCallback(() => fetchAppointments(true), [fetchAppointments]));

  const filteredAppointments = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const filtered = appointments.filter((apt) => {
      const matchesSearch =
        getDoctorName(apt).toLowerCase().includes(term) ||
        getServiceName(apt).toLowerCase().includes(term);
      const matchesStatus = matchesStatusFilter(apt, filter);
      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      const dtA = getAppointmentDateTime(a) || new Date(a.createdAt || 0);
      const dtB = getAppointmentDateTime(b) || new Date(b.createdAt || 0);
      return dtB - dtA;
    });
  }, [appointments, filter, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const canModify = (appointment) => canPatientModifyAppointment(appointment);

  const openDetail = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailDialog(true);
  };

  const openReschedule = (appointment) => {
    if (isAppointmentOverdue(appointment)) {
      toast.error("Lịch hẹn đã quá hạn, không thể đổi lịch");
      return;
    }
    if (isAppointmentWithinHours(appointment, 2)) {
      toast.error("Không thể đổi lịch trong vòng 2 giờ trước khi khám. Vui lòng liên hệ phòng khám để được hỗ trợ.");
      return;
    }
    setRescheduleAppt(appointment);
    setRescheduleId(appointment._id);
    setNewDate("");
    setNewTime("");
    setAvailableSlots([]);
    setShowReschedule(true);
  };

  const fetchSlotsForReschedule = async (date) => {
    if (!date || !rescheduleAppt) return;
    setSlotsLoading(true);
    setAvailableSlots([]);
    setNewTime("");
    try {
      const doctorId = rescheduleAppt.doctorId?._id || rescheduleAppt.doctorId;
      const serviceId = rescheduleAppt.serviceId?._id || rescheduleAppt.serviceId;
      const res = await doctorsApi.getAvailableSlots(doctorId, { date, serviceId });
      setAvailableSlots(normalizeSlots(res.data));
    } catch {
      toast.error("Không thể tải khung giờ trống");
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      toast.error("Vui lòng chọn ngày và giờ mới");
      return;
    }
    setIsRescheduling(true);
    try {
      await appointmentsApi.reschedule(rescheduleId, { newDate, newTime });
      toast.success("Đổi lịch thành công");
      setShowReschedule(false);
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể đổi lịch");
    } finally {
      setIsRescheduling(false);
    }
  };

  const openCancel = (appointment) => {
    if (isAppointmentOverdue(appointment)) {
      toast.error("Lịch hẹn đã quá hạn, không thể hủy lịch");
      return;
    }
    if (isAppointmentWithinHours(appointment, 2)) {
      toast.error("Không thể hủy lịch trong vòng 2 giờ trước khi khám. Vui lòng liên hệ phòng khám để được hỗ trợ.");
      return;
    }
    setCancelId(appointment._id);
    setCancelReason("");
    setShowCancel(true);
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await appointmentsApi.cancel(cancelId, { reason: cancelReason });
      toast.success("Hủy lịch hẹn thành công");
      setShowCancel(false);
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể hủy lịch hẹn");
    } finally {
      setIsCancelling(false);
    }
  };

  const _today = new Date();
  const minDate = `${_today.getFullYear()}-${String(_today.getMonth() + 1).padStart(2, "0")}-${String(_today.getDate()).padStart(2, "0")}`;
  const _maxDay = new Date(_today.getTime() + 60 * 24 * 60 * 60 * 1000);
  const maxDate = `${_maxDay.getFullYear()}-${String(_maxDay.getMonth() + 1).padStart(2, "0")}-${String(_maxDay.getDate()).padStart(2, "0")}`;
  const activeAppointments = appointments.filter((appt) => matchesStatusFilter(appt, "pending") || matchesStatusFilter(appt, "confirmed") || matchesStatusFilter(appt, "rescheduled"));
  const completedAppointments = appointments.filter((appt) => appt.status === "completed").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-heading">
          <div className="space-y-2"><div className="skeleton h-4 w-20" /><div className="skeleton h-8 w-48" /><div className="skeleton h-4 w-64" /></div>
          <div className="skeleton h-9 w-32 rounded-full" />
        </div>
        <div className="soft-card p-4 space-y-3">
          <div className="flex gap-2">{[1,2,3,4].map(i=><div key={i} className="skeleton h-8 w-24 rounded-full" />)}</div>
          <div className="skeleton h-10 w-full rounded-2xl" />
        </div>
        <div className="soft-card p-4 space-y-3">
          {[1,2,3,4,5].map(i=><div key={i} className="skeleton h-14 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#f7fdfe_0%,#e9f8fb_48%,#ffffff_100%)] p-5 shadow-xl shadow-cyan-950/8 sm:p-6 lg:p-7">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-primary/12 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
              Lịch hẹn
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Quản lý lịch khám của tôi</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Theo dõi trạng thái, xem chi tiết, đổi lịch hoặc hủy lịch trong một không gian rõ ràng và dễ thao tác.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <HeroMetric icon={ClipboardList} label="Tổng lịch" value={appointments.length} />
            <HeroMetric icon={Calendar} label="Đang theo dõi" value={activeAppointments.length} />
            <HeroMetric icon={ShieldCheck} label="Đã khám" value={completedAppointments} />
          </div>
        </div>
      </div>

      <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, dịch vụ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="field-input h-11 rounded-xl pl-10"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="h-12 w-full rounded-lg bg-background px-4 shadow-sm lg:w-56">
                <div className="flex min-w-0 items-center gap-3">
                  <Funnel className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full lg:ml-auto lg:w-auto" asChild>
              <Link to="/patient/book">
                <Plus className="mr-2 h-4 w-4" />
                Đặt lịch mới
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Danh sách lịch hẹn
          </CardTitle>
          <CardDescription>Hiển thị {filteredAppointments.length} lịch hẹn phù hợp</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAppointments.length === 0 ? (
            <EmptyAppointments />
          ) : (
            <>
              <div className="appointment-table-scroll hidden max-h-[520px] overflow-auto rounded-xl border p-1 pr-2 md:block">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow className="sticky top-0 z-10 bg-background">
                      <TableHead>Bác sĩ</TableHead>
                      <TableHead>Dịch vụ</TableHead>
                      <TableHead>Ngày giờ</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAppointments.map((apt) => (
                      <TableRow key={apt._id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(apt)}>
                        <TableCell>
                          <div className="font-medium">BS. {getDoctorName(apt)}</div>
                        </TableCell>
                        <TableCell>{getServiceName(apt)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{formatDate(getEffectiveDate(apt))}</p>
                            <p className="text-sm text-muted-foreground">{getEffectiveTime(apt) || "-"}</p>
                            <CountdownBadge appointment={apt} />
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(apt)}</TableCell>
                        <TableCell>
                          <AppointmentActions appointment={apt} canModify={canModify(apt)} onDetail={openDetail} onReschedule={openReschedule} onCancel={openCancel} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {paginatedAppointments.map((apt) => (
                  <AppointmentCard
                    key={apt._id}
                    appointment={apt}
                    canModify={canModify(apt)}
                    onDetail={openDetail}
                    onReschedule={openReschedule}
                    onCancel={openCancel}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        if (
                          (page === currentPage - 2 && page > 1) ||
                          (page === currentPage + 2 && page < totalPages)
                        ) {
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
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
        </CardContent>
      </Card>

      <AppointmentDetailDialog open={showDetailDialog} onOpenChange={setShowDetailDialog} appointment={selectedAppointment} />

      <Dialog open={showReschedule} onOpenChange={setShowReschedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi lịch khám</DialogTitle>
            <DialogDescription>Chọn ngày và khung giờ mới cho lịch hẹn.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ngày mới</Label>
              <Input
                type="date"
                value={newDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  fetchSlotsForReschedule(e.target.value);
                }}
              />
            </div>
            {newDate && (
              <div className="space-y-2">
                <Label>Giờ mới</Label>
                {slotsLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang kiểm tra khung giờ còn trống...
                  </div>
                ) : availableSlots.filter((slot) => slot.available).length === 0 ? (
                  <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    Không có khung giờ trống vào ngày này. Vui lòng chọn ngày khác.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        type="button"
                        variant={newTime === slot.time ? "default" : "outline"}
                        disabled={!slot.available}
                        onClick={() => slot.available && setNewTime(slot.time)}
                        className={!slot.available ? "opacity-40 line-through" : ""}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReschedule(false)}>
              Hủy
            </Button>
            <Button onClick={handleReschedule} disabled={isRescheduling || !newDate || !newTime}>
              {isRescheduling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận đổi lịch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy lịch hẹn này?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">Lịch hẹn sẽ bị hủy và bạn có thể đặt lịch mới bất cứ lúc nào.</span>
              <Input
                placeholder="Lý do hủy (không bắt buộc)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ lịch hẹn</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận hủy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AppointmentActions({ appointment, canModify, onDetail, onReschedule, onCancel }) {
  return (
    <div className="flex justify-end gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onDetail(appointment);
        }}
        title="Xem chi tiết"
      >
        <Eye className="h-4 w-4" />
      </Button>
      {canModify && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="text-orange-600 hover:text-orange-700"
            onClick={(e) => {
              e.stopPropagation();
              onReschedule(appointment);
            }}
            title="Đổi lịch"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-600 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              onCancel(appointment);
            }}
            title="Hủy lịch"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}

function AppointmentCard({ appointment, canModify, onDetail, onReschedule, onCancel }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold truncate">{getServiceName(appointment)}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">BS. {getDoctorName(appointment)}</p>
        </div>
        {getStatusBadge(appointment)}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          {formatDate(getEffectiveDate(appointment))}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary" />
          {getEffectiveTime(appointment) || "-"}
        </span>
        <CountdownBadge appointment={appointment} />
      </div>
      <div className="mt-3 flex justify-end gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" onClick={() => onDetail(appointment)}>Chi tiết</Button>
        {canModify && (
          <>
            <Button variant="outline" size="sm" className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700" onClick={() => onReschedule(appointment)}>Đổi lịch</Button>
            <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onCancel(appointment)}>Hủy</Button>
          </>
        )}
      </div>
    </div>
  );
}

function useCountdown(appointment) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const dt = getAppointmentDateTime(appointment);
    if (!dt || !["confirmed", "pending", "rescheduled"].includes(appointment?.status)) {
      setRemaining(null);
      return;
    }

    const update = () => {
      const diff = dt - new Date();
      setRemaining(diff > 0 ? diff : null);
    };

    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [appointment?._id, appointment?.appointmentDate, appointment?.startTime, appointment?.timeSlot, appointment?.status]);

  if (remaining === null) return null;

  const totalMinutes = Math.floor(remaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 24) return null;
  if (hours > 0) return `Còn ${hours} giờ ${minutes} phút`;
  return `Còn ${minutes} phút`;
}

function CountdownBadge({ appointment }) {
  const label = useCountdown(appointment);
  if (!label) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
      <Clock className="h-3 w-3" />
      {label}
    </span>
  );
}

function AppointmentDetailDialog({ open, onOpenChange, appointment }) {
  if (!appointment) return null;

  const detailItems = [
    { label: "Bác sĩ", value: `BS. ${getDoctorName(appointment)}`, icon: User },
    { label: "Dịch vụ", value: getServiceName(appointment), icon: Stethoscope },
    { label: "Ngày khám", value: formatDate(getEffectiveDate(appointment)), icon: Calendar },
    { label: "Giờ khám", value: getEffectiveTime(appointment) || "-", icon: Clock },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Chi tiết lịch hẹn</DialogTitle>
          <DialogDescription>Thông tin lịch khám và trạng thái hiện tại.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
            <div>
              <p className="text-sm text-muted-foreground">Trạng thái</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {getStatusBadge(appointment)}
                <CountdownBadge appointment={appointment} />
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Ngày đặt</p>
              <p className="font-medium text-foreground">{formatDate(appointment.createdAt)}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {detailItems.map((item) => (
              <div key={item.label} className="flex gap-3 rounded-xl border p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
          {(appointment.notes || appointment.note) && (
            <InfoSection title="Ghi chú của bạn" content={appointment.notes || appointment.note} />
          )}
          {appointment.diagnosis && <InfoSection title="Chẩn đoán từ bác sĩ" content={appointment.diagnosis} tone="blue" />}
          {appointment.cancelReason && <InfoSection title="Lý do hủy" content={appointment.cancelReason} tone="red" />}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Xong
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoSection({ title, content, tone = "default" }) {
  const cls =
    tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-900"
      : tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-border bg-muted/30";
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm leading-6">{content}</p>
    </div>
  );
}

function EmptyAppointments() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
      <ClipboardList className="mb-3 h-10 w-10 text-muted-foreground" />
      <p className="font-medium">Không tìm thấy lịch hẹn nào</p>
      <p className="mt-1 text-sm text-muted-foreground">Thử đổi bộ lọc hoặc đặt lịch mới.</p>
      <Button className="mt-4" asChild>
        <Link to="/patient/book">Đặt lịch mới</Link>
      </Button>
    </div>
  );
}

function HeroMetric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-primary/10 bg-white/85 p-4 shadow-sm backdrop-blur">
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
