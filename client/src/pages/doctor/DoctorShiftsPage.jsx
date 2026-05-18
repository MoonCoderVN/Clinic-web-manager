import { useEffect, useState, useCallback, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import {
  Calendar,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Home,
  Loader2,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import axiosInstance from "@/api/httpClient";
import leaveRequestsApi from "@/api/leaveRequests.api";
import { useAuth } from "@/context/AuthContext";
import { usePageFocus } from "@/hooks/usePageFocus";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(date) {
  if (!date || isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatWeekRange(monday) {
  const start = monday.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }).replace("/", "-");
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const end = sunday.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `Tuần ${start} - ${end}`;
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

export default function DoctorSchedulesPage() {
  const { user } = useAuth();
  const refreshKey = useRealtimeRefresh(["schedule:changed", "slots:changed", "leave-request:changed"]);
  const [weekStart, setWeekStart] = useState(() => getWeekStart());
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [doctorUserId, setDoctorUserId] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leavePage, setLeavePage] = useState(1);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    date: isoDate(new Date()),
    reason: "",
  });

  const todayStr = isoDate(new Date());
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);
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

  const fetchSchedules = useCallback(async (start = weekStart) => {
    setSchedulesLoading(true);
    try {
      let did = user?._id || user?.id || doctorUserId;
      if (!did) {
        const profileRes = await axiosInstance.get("/doctors/profile/me");
        const profile = profileRes.data.data;
        did = profile?.userId?._id || profile?.userId;
        setDoctorUserId(did);
      }
      if (!did) return;

      const res = await axiosInstance.get(`/schedules/doctor/${did}?weekStart=${scheduleWeekKey(start)}`);
      setSchedules(res.data.data || res.data.schedules || res.data || []);
    } catch (err) {
      console.error("Failed to fetch schedules:", err);
      if (err.response?.status !== 404) {
        toast.error("Không thể tải lịch làm việc");
      }
    } finally {
      setSchedulesLoading(false);
    }
  }, [doctorUserId, user, weekStart]);

  const fetchLeaveRequests = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const res = await leaveRequestsApi.getMine();
      setLeaveRequests(res.data.data || []);
      setLeavePage(1);
    } catch (err) {
      console.error("Failed to fetch leave requests:", err);
    } finally {
      setLeaveLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules(weekStart);
    fetchLeaveRequests();
  }, [fetchSchedules, fetchLeaveRequests, refreshKey, weekStart]);

  usePageFocus(useCallback(() => {
    fetchSchedules(weekStart);
    fetchLeaveRequests();
  }, [fetchSchedules, fetchLeaveRequests, weekStart]));

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

  const handleSubmitLeaveRequest = async () => {
    if (!leaveForm.date) return toast.error("Vui lòng chọn ngày nghỉ");
    if (!leaveForm.reason.trim()) return toast.error("Vui lòng nhập lý do xin nghỉ");

    setLeaveSubmitting(true);
    try {
      await leaveRequestsApi.create({
        date: leaveForm.date,
        reason: leaveForm.reason.trim(),
      });
      toast.success("Đã gửi yêu cầu nghỉ");
      setShowLeaveDialog(false);
      setLeaveForm({ date: isoDate(new Date()), reason: "" });
      fetchLeaveRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể gửi yêu cầu nghỉ");
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleCancelLeaveRequest = async (id) => {
    try {
      await leaveRequestsApi.cancel(id);
      toast.success("Đã hủy yêu cầu nghỉ");
      setSelectedLeaveRequest(null);
      fetchLeaveRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể hủy yêu cầu nghỉ");
    }
  };

  const getLeaveStatusBadge = (status) => {
    const map = {
      pending: <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-700">Chờ duyệt</Badge>,
      approved: <Badge variant="secondary" className="border-green-200 bg-green-50 text-green-700">Đã duyệt</Badge>,
      rejected: <Badge variant="secondary" className="border-red-200 bg-red-50 text-red-700">Từ chối</Badge>,
      cancelled: <Badge variant="outline">Đã hủy</Badge>,
    };
    return map[status] || <Badge variant="outline">{status}</Badge>;
  };

  const currentWeekKey = scheduleWeekKey(weekStart);
  const getSchedulesForDay = (dayDate) => {
    const dayNum = dayDate.getDay();
    const matchingSchedules = schedules.filter((schedule) => {
      const scheduleWeek = scheduleWeekKey(schedule.weekStart);
      return (scheduleWeek === currentWeekKey || scheduleWeek === null) && Number(schedule.dayOfWeek) === dayNum;
    });
    const specificSchedules = matchingSchedules.filter((schedule) => scheduleWeekKey(schedule.weekStart) === currentWeekKey);
    return specificSchedules.length > 0 ? specificSchedules : matchingSchedules;
  };

  const totalShifts = weekDays.reduce((total, day) => total + getSchedulesForDay(day).length, 0);
  const totalSlots = schedules.reduce((total, schedule) => total + Number(schedule.maxSlots || 0), 0);
  const pendingLeaves = leaveRequests.filter((request) => request.status === "pending").length;
  const leaveItemsPerPage = 5;
  const totalLeavePages = Math.max(1, Math.ceil(leaveRequests.length / leaveItemsPerPage));
  const paginatedLeaveRequests = leaveRequests.slice(
    (leavePage - 1) * leaveItemsPerPage,
    leavePage * leaveItemsPerPage
  );

  useEffect(() => {
    if (leavePage > totalLeavePages) {
      setLeavePage(totalLeavePages);
    }
  }, [leavePage, totalLeavePages]);

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div className="max-w-2xl">
          <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
            Thời gian biểu
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Ca làm việc của tôi</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Theo dõi ca trực được phân công, kiểm tra sức chứa trong tuần và gửi yêu cầu nghỉ khi cần.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[420px]">
          <HeroMetric icon={Calendar} label="Ca trong tuần" value={totalShifts} />
          <HeroMetric icon={Users} label="Sức chứa" value={totalSlots} tone="text-slate-700" bg="bg-slate-100" />
          <HeroMetric icon={CalendarX} label="Chờ duyệt nghỉ" value={pendingLeaves} tone="text-orange-600" bg="bg-orange-50" />
        </div>
      </div>

      <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Phân ca làm việc</h2>
              <p className="text-sm text-muted-foreground">Tuần {formatDate(weekStart)} - {formatDate(weekDays[6])}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
              <Button variant="outline" className="h-11 rounded-full bg-white shadow-sm" onClick={() => setShowLeaveDialog(true)}>
                <CalendarX className="mr-2 h-4 w-4" />
                Xin nghỉ
              </Button>
              <div className="flex h-11 w-full items-center gap-1 overflow-hidden rounded-full border border-primary/10 bg-white shadow-sm sm:w-auto">
                <Button variant="ghost" size="icon" onClick={prevWeek} className="h-11 w-10 rounded-none">
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
                <Button variant="ghost" size="icon" onClick={nextWeek} className="h-11 w-10 rounded-none">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" size="icon" onClick={goToday} className="h-11 w-11 rounded-full bg-white shadow-sm" aria-label="Về tuần hiện tại">
                <Home className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-full bg-white shadow-sm"
                onClick={() => fetchSchedules(weekStart)}
                disabled={schedulesLoading}
                aria-label="Làm mới ca làm việc"
              >
                {schedulesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {schedulesLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
              {weekDays.map((dayDate, index) => {
                const dayNum = dayDate.getDay();
                const dayIdx = dayNum === 0 ? 6 : dayNum - 1;
                const daySchedules = getSchedulesForDay(dayDate);
                const isToday = isoDate(dayDate) === todayStr;

                return (
                  <div key={isoDate(dayDate)} className="flex flex-col gap-3">
                    <div className={`rounded-2xl border px-3 py-3 text-center transition-all ${isToday ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-primary/10 bg-primary/5 text-slate-700"}`}>
                      <div className="text-[10px] font-bold uppercase opacity-80">{DAY_LABELS[dayIdx]}</div>
                      <div className="text-xl font-bold">{dayDate.getDate()}</div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {daySchedules.length === 0 ? (
                        <div className="flex h-[92px] items-center justify-center rounded-2xl border border-dashed border-primary/15 bg-muted/20 text-xs font-medium italic text-muted-foreground">
                          Nghỉ
                        </div>
                      ) : (
                        daySchedules.map((schedule) => (
                          <div key={schedule._id || `${index}-${schedule.startTime}`} className="rounded-2xl border border-primary/10 bg-white p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
                            <div className="mb-2 flex items-center gap-2 text-primary">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-xs font-bold">{schedule.startTime} - {schedule.endTime}</span>
                            </div>
                            {schedule.maxSlots && (
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {schedule.maxSlots} bệnh nhân
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarX className="h-5 w-5 text-primary" />
            Yêu cầu nghỉ của tôi
          </CardTitle>
          <CardDescription>Theo dõi trạng thái xin nghỉ đã gửi cho admin duyệt</CardDescription>
        </CardHeader>
        <CardContent>
          {leaveLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tải yêu cầu nghỉ...
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-primary/15 p-6 text-center text-sm text-muted-foreground">
              Chưa có yêu cầu nghỉ nào
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white">
                <div className="max-h-[360px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-primary/5">
                      <TableRow>
                        <TableHead className="min-w-[110px]">Ngày nghỉ</TableHead>
                        <TableHead className="min-w-[110px]">Loại nghỉ</TableHead>
                        <TableHead>Lý do</TableHead>
                        <TableHead className="min-w-[120px]">Trạng thái</TableHead>
                        <TableHead className="min-w-[120px] text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLeaveRequests.map((request) => (
                        <TableRow
                          key={request._id}
                          className="cursor-pointer hover:bg-primary/5"
                          onClick={() => setSelectedLeaveRequest(request)}
                        >
                          <TableCell className="font-semibold text-slate-900">
                            {request.date ? new Date(`${request.date}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa có ngày"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">Nghỉ cả ngày</TableCell>
                          <TableCell className="max-w-[300px] truncate text-muted-foreground">
                            {request.reason || "Không có lý do"}
                          </TableCell>
                          <TableCell>{getLeaveStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-full bg-white"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedLeaveRequest(request);
                                }}
                                aria-label="Xem chi tiết yêu cầu nghỉ"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {request.status === "pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full bg-white"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleCancelLeaveRequest(request._id);
                                  }}
                                >
                                  <X className="mr-1 h-3.5 w-3.5" />
                                  Hủy yêu cầu
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {totalLeavePages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setLeavePage((page) => Math.max(1, page - 1))}
                        disabled={leavePage === 1}
                        className={leavePage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalLeavePages }, (_, index) => (
                      <PaginationItem key={index + 1}>
                        <PaginationLink
                          onClick={() => setLeavePage(index + 1)}
                          isActive={leavePage === index + 1}
                          className="cursor-pointer"
                        >
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setLeavePage((page) => Math.min(totalLeavePages, page + 1))}
                        disabled={leavePage === totalLeavePages}
                        className={leavePage === totalLeavePages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="rounded-[28px] border-white/80 bg-white/95 shadow-2xl shadow-cyan-950/12 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gửi yêu cầu xin nghỉ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ngày nghỉ</Label>
              <Input
                type="date"
                min={isoDate(new Date())}
                value={leaveForm.date}
                onChange={(event) => setLeaveForm((prev) => ({ ...prev, date: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Lý do</Label>
              <Textarea
                rows={4}
                value={leaveForm.reason}
                onChange={(event) => setLeaveForm((prev) => ({ ...prev, reason: event.target.value }))}
                placeholder="Nhập lý do xin nghỉ..."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Đơn xin nghỉ áp dụng cho cả ngày. Lịch chỉ bị chặn sau khi admin duyệt.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>Hủy</Button>
            <Button onClick={handleSubmitLeaveRequest} disabled={leaveSubmitting}>
              {leaveSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarX className="mr-2 h-4 w-4" />}
              Gửi yêu cầu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedLeaveRequest} onOpenChange={(open) => !open && setSelectedLeaveRequest(null)}>
        <DialogContent className="rounded-[28px] border-white/80 bg-white/95 shadow-2xl shadow-cyan-950/12 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu nghỉ</DialogTitle>
          </DialogHeader>
          {selectedLeaveRequest && (
            <div className="space-y-4 py-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Ngày nghỉ</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {selectedLeaveRequest.date ? new Date(`${selectedLeaveRequest.date}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa có ngày"}
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Loại nghỉ</p>
                  <p className="mt-1 font-semibold text-slate-950">Nghỉ cả ngày</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Trạng thái</p>
                  <div className="mt-2">{getLeaveStatusBadge(selectedLeaveRequest.status)}</div>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Phản hồi admin</p>
                  <p className="mt-1 font-semibold text-slate-950">{selectedLeaveRequest.reviewNote || "Chưa có phản hồi"}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-white p-4">
                <p className="text-xs font-medium text-muted-foreground">Lý do</p>
                <p className="mt-2 leading-6 text-slate-800">{selectedLeaveRequest.reason || "Không có lý do"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLeaveRequest(null)}>Đóng</Button>
            {selectedLeaveRequest?.status === "pending" && (
              <Button variant="destructive" onClick={() => handleCancelLeaveRequest(selectedLeaveRequest._id)}>
                <X className="mr-2 h-4 w-4" />
                Hủy yêu cầu
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
