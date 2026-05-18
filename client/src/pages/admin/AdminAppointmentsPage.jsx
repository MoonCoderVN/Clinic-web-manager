import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Filter, CheckCircle, XCircle, Eye, Calendar, Loader2, LogIn, ClipboardCheck, Edit2, Clock, AlertCircle, RefreshCw, Search } from "lucide-react";
import { AdminPageHeader, AdminLoadingState } from "@/components/admin/AdminUI";
import { appointmentsApi, doctorsApi } from "@/api";
import { toast } from "sonner";
import { usePageFocus } from "@/hooks/usePageFocus";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";
import { isAppointmentOverdue } from "@/utils/appointmentStatus";
import { getStatusBadge } from "@/utils/statusBadge";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

function AppointmentStatCard({ title, value, icon: Icon, color, tone }) {
  return (
    <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
      <CardContent className="flex min-h-[92px] items-center justify-between gap-4 p-5">
        <p className="min-w-0 text-base font-semibold text-muted-foreground">{title}</p>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`text-3xl font-bold leading-none tracking-tight ${color}`}>{value}</span>
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ring-1 ring-white/70 ${tone}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const normalizeAppointmentsResponse = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.appointments)) return payload.appointments;
  if (Array.isArray(payload)) return payload;
  return null;
};

const getAppointmentFetchMessage = (error) =>
  error?.response?.data?.message || error?.message || "Không thể tải danh sách lịch hẹn";

const formatCancelReason = (reason) => {
  if (!reason) return "";
  if (String(reason).trim().toLowerCase() === "auto-expired") {
    return "Hệ thống tự động huỷ do lịch hẹn đã quá hạn";
  }
  return reason;
};

export default function AdminAppointmentsPage() {
  const refreshKey = useRealtimeRefresh(["appointment:changed"]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const fetchAppointments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setFetchError("");
    try {
      let res;
      try {
        res = await appointmentsApi.getAll();
      } catch (primaryError) {
        const status = primaryError.response?.status;
        if (![403, 404].includes(status)) throw primaryError;
        res = await appointmentsApi.getMine();
      }

      const list = normalizeAppointmentsResponse(res.data);
      if (!Array.isArray(list)) {
        throw new Error("Không thể tải danh sách lịch hẹn. Vui lòng thử lại.");
      }
      setAllAppointments(list);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      const message = getAppointmentFetchMessage(error);
      setFetchError(message);
      if (!silent) toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(() => fetchAppointments(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchAppointments, refreshKey]);

  usePageFocus(useCallback(() => fetchAppointments(true), [fetchAppointments]));

  // Client-side filter + sort by date desc
  const filteredAppointments = allAppointments
    .filter((apt) => {
      const term = searchTerm.toLowerCase();
      const patientName = apt.patientId?.fullName || apt.patientName || "";
      const doctorName = apt.doctorId?.userId?.fullName || apt.doctorName || "";
      const serviceName = apt.serviceId?.name || apt.serviceName || "";
      const phone = apt.patientId?.phone || apt.patientPhone || "";

      const matchesSearch =
        patientName.toLowerCase().includes(term) ||
        doctorName.toLowerCase().includes(term) ||
        serviceName.toLowerCase().includes(term) ||
        phone.includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "overdue" ? isAppointmentOverdue(apt) : apt.status === statusFilter);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.appointmentDate || a.date || a.createdAt || 0);
      const dateB = new Date(b.appointmentDate || b.date || b.createdAt || 0);
      return dateB - dateA;
    });

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const confirmAppointment = async (id) => {
    setActionLoading(id);
    try {
      await appointmentsApi.confirm(id);
      toast.success("Đã xác nhận lịch hẹn");
      fetchAppointments();
    } catch (error) {
      toast.error("Không thể xác nhận lịch hẹn. Vui lòng thử lại.");
    } finally {
      setActionLoading(null);
    }
  };

  const fetchSlotsForReschedule = async (dateStr, doctorId, serviceId) => {
    if (!dateStr || !doctorId) return;
    setSlotsLoading(true);
    try {
      const res = await doctorsApi.getAvailableSlots(doctorId, { date: dateStr, serviceId: serviceId || "" });
      setAvailableSlots(res.data.data?.slots || []);
      setNewTime("");
    } catch (error) {
      console.error("Lỗi khi tải khung giờ:", error);
      toast.error("Không thể tải khung giờ");
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const openReschedule = (apt) => {
    setRescheduleTarget(apt);
    setNewDate("");
    setNewTime("");
    setAvailableSlots([]);
    setShowRescheduleDialog(true);
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget || !newDate || !newTime) return;
    setActionLoading(rescheduleTarget._id);
    try {
      await appointmentsApi.reschedule(rescheduleTarget._id, {
        newDate,
        newTime,
      });
      toast.success("Đổi lịch thành công");
      setShowRescheduleDialog(false);
      fetchAppointments();
    } catch (error) {
      const msg = error.response?.data?.message || "Không thể đổi lịch";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const checkInAppointment = async (id) => {
    setActionLoading(id);
    try {
      await appointmentsApi.checkIn(id);
      toast.success("Đã check-in bệnh nhân — đang khám");
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể check-in bệnh nhân. Vui lòng thử lại.");
    } finally {
      setActionLoading(null);
    }
  };

  const completeAppointment = async (id) => {
    setActionLoading(id);
    try {
      await appointmentsApi.complete(id);
      toast.success("Đã hoàn thành lịch hẹn");
      fetchAppointments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể cập nhật trạng thái. Vui lòng thử lại.");
    } finally {
      setActionLoading(null);
    }
  };

  const cancelAppointment = async (id) => {
    setActionLoading(id);
    try {
      await appointmentsApi.cancel(id, { reason: cancelReason || "Admin hủy lịch" });
      toast.success("Đã hủy lịch hẹn");
      fetchAppointments();
    } catch (error) {
      const msg = error.response?.data?.message || "Không thể hủy lịch hẹn. Vui lòng thử lại.";
      toast.error(msg);
    } finally {
      setActionLoading(null);
      setShowCancelDialog(false);
      setCancelTarget(null);
      setCancelReason("");
    }
  };

  if (loading) {
    return <AdminLoadingState label="Đang tải lịch hẹn..." />;
  }

  const appointmentStats = {
    pending: allAppointments.filter((apt) => apt.status === "pending" || apt.status === "rescheduled").length,
    confirmed: allAppointments.filter((apt) => apt.status === "confirmed").length,
    overdue: allAppointments.filter(isAppointmentOverdue).length,
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý lịch hẹn"
        titleClassName="text-primary"
        description="Theo dõi, xác nhận, dời lịch và xử lý toàn bộ lịch hẹn trong hệ thống."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <AppointmentStatCard title="Chờ xử lý" value={appointmentStats.pending} icon={Clock} color="text-amber-600" tone="bg-amber-50" />
        <AppointmentStatCard title="Đã xác nhận" value={appointmentStats.confirmed} icon={CheckCircle} color="text-blue-600" tone="bg-blue-50" />
        <AppointmentStatCard title="Quá hạn" value={appointmentStats.overdue} icon={AlertCircle} color="text-orange-600" tone="bg-orange-50" />
      </div>

      <Card className="soft-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full sm:w-[360px] md:w-[400px] lg:w-[420px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, SĐT, dịch vụ..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="field-input h-11 rounded-xl pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-12 w-full rounded-lg bg-background px-4 shadow-sm lg:w-[220px]">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Lọc trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ xác nhận</SelectItem>
                <SelectItem value="rescheduled">Đổi lịch</SelectItem>
                <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                <SelectItem value="in_progress">Đang khám</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
                <SelectItem value="overdue">Quá hạn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="soft-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Danh sách lịch hẹn
          </CardTitle>
          <CardDescription>
            Tổng cộng {filteredAppointments.length} lịch hẹn
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fetchError && (
            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
              <span>{fetchError}</span>
              <Button variant="outline" size="sm" onClick={() => fetchAppointments()} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Thử lại
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bệnh nhân</TableHead>
                  <TableHead>Bác sĩ</TableHead>
                  <TableHead>Dịch vụ</TableHead>
                  <TableHead>Ngày giờ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Không tìm thấy lịch hẹn nào
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAppointments.map((apt) => {
                    // Task 11: dùng đúng field names từ populated response
                    const patientName = apt.patientId?.fullName || "—";
                    const patientPhone = apt.patientId?.phone || "—";
                    const doctorName = apt.doctorId?.userId?.fullName || "—";
                    const serviceName = apt.serviceId?.name || "—";
                    const apptDate = apt.appointmentDate || apt.date;
                    const overdue = isAppointmentOverdue(apt);
                    const apptTime = apt.startTime || apt.timeSlot || "—";

                    return (
                      <TableRow 
                        key={apt._id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setShowDetailDialog(true);
                        }}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{patientName}</p>
                            <p className="text-sm text-muted-foreground">{patientPhone}</p>
                          </div>
                        </TableCell>
                        <TableCell>BS. {doctorName}</TableCell>
                        <TableCell>{serviceName}</TableCell>
                        <TableCell>
                          <div>
                            <p>
                              {apptDate
                                ? new Date(apptDate).toLocaleDateString("vi-VN")
                                : "—"}
                            </p>
                            <p className="text-sm text-muted-foreground">{apptTime}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(apt)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {/* View detail (already triggered by row click, but keep button for accessibility) */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppointment(apt);
                                setShowDetailDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* Reschedule (pending, confirmed or rescheduled) */}
                            {["pending", "confirmed", "rescheduled"].includes(apt.status) && !overdue && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-orange-600 hover:text-orange-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openReschedule(apt);
                                }}
                                disabled={actionLoading === apt._id}
                                title="Đổi lịch"
                              >
                                {actionLoading === apt._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Edit2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}

                            {/* Confirm (pending or rescheduled) */}
                            {["pending", "rescheduled"].includes(apt.status) && !overdue && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmAppointment(apt._id);
                                }}
                                disabled={actionLoading === apt._id}
                                title={apt.status === "rescheduled" ? "Xác nhận lịch đổi" : "Xác nhận lịch hẹn"}
                              >
                                {actionLoading === apt._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                            )}

                            {/* Cancel (pending, rescheduled or confirmed) */}
                            {["pending", "rescheduled", "confirmed"].includes(apt.status) && !overdue && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCancelTarget(apt);
                                  setCancelReason("");
                                  setShowCancelDialog(true);
                                }}
                                disabled={actionLoading === apt._id}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Check-in: bệnh nhân đến quầy — confirmed → in_progress */}
                            {apt.status === "confirmed" && !overdue && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-indigo-600 hover:text-indigo-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  checkInAppointment(apt._id);
                                }}
                                disabled={actionLoading === apt._id}
                                title="Check-in bệnh nhân"
                              >
                                {actionLoading === apt._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <LogIn className="h-4 w-4" />
                                )}
                              </Button>
                            )}

                            {/* Complete: kết thúc khám — in_progress → completed */}
                            {apt.status === "in_progress" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  completeAppointment(apt._id);
                                }}
                                disabled={actionLoading === apt._id}
                                title="Hoàn thành khám"
                              >
                                {actionLoading === apt._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ClipboardCheck className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
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
                    // Hiển thị tối đa 5 trang xung quanh trang hiện tại
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
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Chi tiết lịch hẹn</DialogTitle>
            <DialogDescription>Thông tin chi tiết về lịch hẹn</DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bệnh nhân</p>
                  <p className="font-medium">
                    {selectedAppointment.patientId?.fullName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số điện thoại</p>
                  <p className="font-medium">
                    {selectedAppointment.patientId?.phone || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bác sĩ</p>
                  <p className="font-medium">
                    BS. {selectedAppointment.doctorId?.userId?.fullName || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dịch vụ</p>
                  <p className="font-medium">
                    {selectedAppointment.serviceId?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ngày khám</p>
                  <p className="font-medium">
                    {selectedAppointment.appointmentDate || selectedAppointment.date
                      ? new Date(
                          selectedAppointment.appointmentDate || selectedAppointment.date
                        ).toLocaleDateString("vi-VN")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Giờ khám</p>
                  <p className="font-medium">
                    {selectedAppointment.startTime || selectedAppointment.timeSlot || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trạng thái</p>
                  {getStatusBadge(selectedAppointment)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ngày đặt</p>
                  <p className="font-medium">
                    {new Date(selectedAppointment.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
              {(selectedAppointment.notes || selectedAppointment.note) && (
                <div>
                  <p className="text-sm text-muted-foreground">Ghi chú</p>
                  <p className="font-medium">
                    {selectedAppointment.notes || selectedAppointment.note}
                  </p>
                </div>
              )}
              {selectedAppointment.cancelReason && (
                <div>
                  <p className="text-sm text-muted-foreground">Lý do hủy</p>
                  <p className="font-medium text-red-600">
                    {formatCancelReason(selectedAppointment.cancelReason)}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Xong
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={(open) => { setShowCancelDialog(open); if (!open) { setCancelTarget(null); setCancelReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy lịch hẹn này?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {cancelTarget && (
                  <p>
                    Lịch hẹn của <strong>{cancelTarget.patientId?.fullName || "bệnh nhân"}</strong> sẽ bị hủy và bệnh nhân sẽ nhận được thông báo.
                  </p>
                )}
                <Input
                  placeholder="Lý do hủy (không bắt buộc)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setCancelTarget(null); setCancelReason(""); }}>
              Giữ lịch hẹn
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => cancelTarget && cancelAppointment(cancelTarget._id)}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Hủy lịch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi lịch hẹn</DialogTitle>
            <DialogDescription>
              Thay đổi ngày và giờ khám mới cho bệnh nhân.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Chọn ngày mới</Label>
              <input
                type="date"
                value={newDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => {
                  setNewDate(e.target.value);
                  const docId = rescheduleTarget?.doctorId?._id || rescheduleTarget?.doctorId;
                  const svcId = rescheduleTarget?.serviceId?._id || rescheduleTarget?.serviceId;
                  fetchSlotsForReschedule(e.target.value, docId, svcId);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {newDate && (
              <div className="space-y-2">
                <Label>Chọn giờ mới</Label>
                {slotsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang kiểm tra khung giờ còn trống...
                  </div>
                ) : availableSlots.filter((s) => s.available).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Bác sĩ không có giờ trống vào ngày này. Vui lòng chọn ngày khác.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => slot.available && setNewTime(slot.time)}
                        className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                          !slot.available
                            ? "opacity-40 cursor-not-allowed line-through border-input bg-background"
                            : newTime === slot.time
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-input bg-background hover:bg-accent"
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={actionLoading === rescheduleTarget?._id || !newDate || !newTime}
            >
              {actionLoading === rescheduleTarget?._id && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Xác nhận đổi lịch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
