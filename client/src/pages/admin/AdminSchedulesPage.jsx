import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Pencil, Trash2, Clock, CalendarDays, Check, X, Filter, Users, LayoutGrid, ChevronLeft, ChevronRight, Calendar, RefreshCw, CalendarX, AlertTriangle, Home, Eye } from "lucide-react";
import { AdminPageHeader, AdminStatCard, AdminToolbar, AdminSearchBox, AdminEmptyState, AdminLoadingState } from "@/components/admin/AdminUI";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axiosInstance from "@/api/httpClient";
import leaveRequestsApi from "@/api/leaveRequests.api";
import { toast } from "sonner";
import { usePageFocus } from "@/hooks/usePageFocus";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon;
};

const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatWeekRange = (monday) => {
  const start = monday.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const end = sunday.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `Tuần ${start} – ${end}`;
};

const DAY_LABELS_BY_VALUE = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const isPastWeek = (monday) => formatDate(monday) < formatDate(getMonday(new Date()));

const ORDERED_DAYS = [
  { label: "Thứ 2", value: 1 },
  { label: "Thứ 3", value: 2 },
  { label: "Thứ 4", value: 3 },
  { label: "Thứ 5", value: 4 },
  { label: "Thứ 6", value: 5 },
  { label: "Thứ 7", value: 6 },
  { label: "Chủ nhật", value: 0 },
];

const getDayLabel = (dayOfWeek) => DAY_LABELS_BY_VALUE[Number(dayOfWeek)] || "Ngày";

const LEAVE_ITEMS_PER_PAGE = 8;

const defaultForm = {
  dayOfWeek: "",
  startTime: "08:00",
  endTime: "17:00",
  maxSlots: 10,
};

export default function AdminSchedulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const refreshKey = useRealtimeRefresh(["schedule:changed", "doctor:changed", "leave-request:changed"]);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "leave-requests" ? "leave-requests" : "schedules");
  const [doctors, setDoctors] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [searchTerm, setSearchTerm] = useState("");

  const weekOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    let mon = getMonday(today);
    
    // Start from 4 weeks ago to 16 weeks ahead
    mon.setDate(mon.getDate() - 28);
    for (let i = 0; i < 20; i++) {
      const val = formatDate(mon);
      options.push({
        value: val,
        label: formatWeekRange(mon)
      });
      mon.setDate(mon.getDate() + 7);
    }
    return options;
  }, []);

  // Week selection - recurring mode removed
  const [selectedMonday, setSelectedMonday] = useState(getMonday(new Date()));
  const selectedWeekIsPast = isPastWeek(selectedMonday);

  // Form states
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editTarget, setEditTarget] = useState(null); 
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  // Bulk Assign states
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    doctorIds: [],
    days: [],
    startTime: "08:00",
    endTime: "17:00",
    maxSlots: 10,
  });
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveActionLoading, setLeaveActionLoading] = useState(null);
  const [leaveSearchTerm, setLeaveSearchTerm] = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("all");
  const [leavePage, setLeavePage] = useState(1);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [conflictInfo, setConflictInfo] = useState(null);

  const getBulkWeekStarts = () => {
    const weeks = [];
    const monday = getMonday(new Date());
    for (let i = 0; i <= 16; i++) {
      weeks.push(formatDate(monday));
      monday.setDate(monday.getDate() + 7);
    }
    return weeks;
  };

  // ── Fetch all data ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const weekParam = formatDate(selectedMonday);
      const [docRes, schRes] = await Promise.all([
        axiosInstance.get("/doctors"),
        axiosInstance.get(`/schedules/all?weekStart=${weekParam}`)
      ]);
      setDoctors(docRes.data.data || docRes.data.doctors || []);
      setAllSchedules(schRes.data.data || []);
    } catch {
      toast.error("Không thể tải dữ liệu lịch làm việc");
    } finally {
      setLoading(false);
    }
  }, [selectedMonday]);

  const fetchLeaveRequests = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const res = await leaveRequestsApi.getAll({ status: "all" });
      setLeaveRequests(res.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải yêu cầu nghỉ");
    } finally {
      setLeaveLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchLeaveRequests();
  }, [fetchData, fetchLeaveRequests, refreshKey]);

  useEffect(() => {
    const nextTab = searchParams.get("tab") === "leave-requests" ? "leave-requests" : "schedules";
    setActiveTab(nextTab);
  }, [searchParams]);

  const handleTabChange = (value) => {
    setActiveTab(value);
    if (value === "leave-requests") {
      setSearchParams({ tab: "leave-requests" });
    } else {
      setSearchParams({});
    }
  };

  const filteredDoctors = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return doctors;
    return doctors.filter(doc => {
      const name = (doc.userId?.fullName || doc.name || "").toLowerCase();
      const spec = (doc.specialization || "").toLowerCase();
      return name.includes(term) || spec.includes(term);
    });
  }, [doctors, searchTerm]);

  // Reset page on search or week change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMonday]);

  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);
  const paginatedDoctors = filteredDoctors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getLeaveDoctor = (request) => request.doctor_id || request.doctorId || {};
  const getLeaveDateLabel = (request) => {
    const rawDate = request.date || request.date_off;
    if (!rawDate) return "Chưa có ngày";
    const date = request.date ? new Date(`${request.date}T00:00:00`) : new Date(rawDate);
    return Number.isNaN(date.getTime()) ? "Chưa có ngày" : date.toLocaleDateString("vi-VN");
  };

  const filteredLeaveRequests = useMemo(() => {
    const term = leaveSearchTerm.trim().toLowerCase();
    return leaveRequests.filter((request) => {
      const doctor = getLeaveDoctor(request);
      const matchesStatus = leaveStatusFilter === "all" || request.status === leaveStatusFilter;
      const haystack = [
        doctor.fullName,
        doctor.email,
        doctor.phone,
        request.reason,
        request.reviewNote,
        getLeaveDateLabel(request),
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [leaveRequests, leaveSearchTerm, leaveStatusFilter]);

  const leaveTotalPages = Math.max(1, Math.ceil(filteredLeaveRequests.length / LEAVE_ITEMS_PER_PAGE));
  const paginatedLeaveRequests = filteredLeaveRequests.slice(
    (leavePage - 1) * LEAVE_ITEMS_PER_PAGE,
    leavePage * LEAVE_ITEMS_PER_PAGE
  );

  useEffect(() => {
    setLeavePage(1);
  }, [leaveSearchTerm, leaveStatusFilter]);

  useEffect(() => {
    if (leavePage > leaveTotalPages) setLeavePage(leaveTotalPages);
  }, [leavePage, leaveTotalPages]);

  usePageFocus(useCallback(() => {
    fetchData();
    fetchLeaveRequests();
  }, [fetchData, fetchLeaveRequests]));

  // ── Helpers ───────────────────────────────────────────────────
  const getScheduleFor = (userId, dayIdx) => {
    const schedulesForDay = allSchedules.filter(s => (s.doctorId?._id || s.doctorId) === userId && s.dayOfWeek === dayIdx);
    if (schedulesForDay.length === 0) return undefined;
    // Prefer specific week schedule over recurring (null)
    const specificSchedule = schedulesForDay.find(s => s.weekStart);
    if (specificSchedule?.isOff) return undefined;
    return specificSchedule || schedulesForDay[0];
  };

  const openCreate = (userId, dayIdx) => {
    if (selectedWeekIsPast) {
      toast.error("Không thể tạo ca làm việc cho tuần đã qua");
      return;
    }
    setEditTarget(null);
    setForm({
      ...defaultForm,
      dayOfWeek: String(dayIdx),
      doctorId: userId,
      weekStart: formatDate(selectedMonday)
    });
    setShowFormDialog(true);
  };

  const openEdit = (schedule) => {
    if (selectedWeekIsPast) {
      toast.error("Không thể sửa ca làm việc của tuần đã qua");
      return;
    }
    setEditTarget(schedule);
    setForm({
      dayOfWeek: String(schedule.dayOfWeek),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      maxSlots: schedule.maxSlots,
      doctorId: schedule.doctorId?._id || schedule.doctorId,
      weekStart: schedule.weekStart || formatDate(selectedMonday)
    });
    setShowFormDialog(true);
  };

  const handleSubmit = async () => {
    if (form.dayOfWeek === "") return toast.error("Chọn ngày");
    if (form.startTime >= form.endTime) return toast.error("Giờ kết thúc không hợp lệ");

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        dayOfWeek: parseInt(form.dayOfWeek),
        maxSlots: parseInt(form.maxSlots) || 10,
      };

      if (editTarget) {
        await axiosInstance.put(`/schedules/${editTarget._id}?weekStart=${formatDate(selectedMonday)}`, payload);
      } else {
        await axiosInstance.post("/schedules", payload);
      }

      toast.success("Đã lưu ca làm việc");
      setShowFormDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi lưu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/schedules/${deleteTarget._id}?weekStart=${formatDate(selectedMonday)}`);
      toast.success("Đã xóa");
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("Lỗi khi xóa");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedWeekIsPast) return toast.error("Không thể gán lịch cho tuần đã qua");
    if (bulkForm.doctorIds.length === 0) return toast.error("Vui lòng chọn ít nhất 1 bác sĩ");
    if (bulkForm.days.length === 0) return toast.error("Vui lòng chọn ít nhất 1 ngày");
    
    setBulkSubmitting(true);
    try {
      const payload = {
        ...bulkForm,
        weekStart: formatDate(selectedMonday),
        weekStarts: getBulkWeekStarts(),
      };
      await axiosInstance.post("/schedules/bulk", payload);
      toast.success("Đã gán lịch cho tuần hiện tại và 16 tuần tiếp theo");
      setShowBulkDialog(false);
      setBulkForm({ ...bulkForm, doctorIds: [], days: [] });
      fetchData();
    } catch (err) {
      toast.error("Gán lịch hàng loạt thất bại");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleApproveLeave = async (request) => {
    setLeaveActionLoading(request._id);
    try {
      await leaveRequestsApi.approve(request._id);
      toast.success("Đã duyệt yêu cầu nghỉ");
      fetchLeaveRequests();
      fetchData();
    } catch (error) {
      const conflicts = error.response?.data?.data?.conflicts || [];
      if (conflicts.length > 0) {
        setConflictInfo({ request, conflicts });
      }
      toast.error(error.response?.data?.message || "Không thể duyệt yêu cầu nghỉ");
    } finally {
      setLeaveActionLoading(null);
    }
  };

  const handleRejectLeave = async () => {
    if (!rejectTarget) return;
    setLeaveActionLoading(rejectTarget._id);
    try {
      await leaveRequestsApi.reject(rejectTarget._id, { reviewNote: reviewNote.trim() });
      toast.success("Đã từ chối yêu cầu nghỉ");
      setRejectTarget(null);
      setReviewNote("");
      fetchLeaveRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể từ chối yêu cầu nghỉ");
    } finally {
      setLeaveActionLoading(null);
    }
  };

  const getLeaveStatusBadge = (status) => {
    const map = {
      pending: <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">Chờ duyệt</Badge>,
      approved: <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">Đã duyệt</Badge>,
      rejected: <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">Từ chối</Badge>,
      cancelled: <Badge variant="outline">Đã hủy</Badge>,
    };
    return map[status] || <Badge variant="outline">{status}</Badge>;
  };

  const changeWeek = (direction) => {
    const next = new Date(selectedMonday);
    next.setDate(selectedMonday.getDate() + (direction * 7));
    setSelectedMonday(next);
  };

  const toggleBulkDoctor = (id) => {
    setBulkForm(prev => ({
      ...prev,
      doctorIds: prev.doctorIds.includes(id) 
        ? prev.doctorIds.filter(i => i !== id)
        : [...prev.doctorIds, id]
    }));
  };

  const toggleBulkDay = (dayIdx) => {
    setBulkForm(prev => ({
      ...prev,
      days: prev.days.includes(dayIdx)
        ? prev.days.filter(d => d !== dayIdx)
        : [...prev.days, dayIdx]
    }));
  };

  const selectAllDoctors = () => {
    const allIds = doctors.map(d => d.userId?._id || d.userId);
    setBulkForm(prev => ({ ...prev, doctorIds: allIds }));
  };

  const selectWeekdayDays = () => {
    setBulkForm(prev => ({ ...prev, days: [1, 2, 3, 4, 5] }));
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý lịch làm việc"
        titleClassName="text-primary"
        description="Phân ca bác sĩ theo tuần, theo dõi giờ làm và gán nhanh lịch trực."
        action={(
          <div className="flex gap-2">
            {activeTab === "schedules" && (
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              aria-label="Làm mới lịch làm việc"
              title="Làm mới"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            )}
            {activeTab === "schedules" && <Button className="bg-primary hover:bg-primary/90 shadow-md" onClick={() => setShowBulkDialog(true)} disabled={selectedWeekIsPast}>
              <LayoutGrid className="h-4 w-4 mr-2" />
              Gán lịch nhanh
            </Button>}
          </div>
        )}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-11 rounded-xl p-1">
          <TabsTrigger value="schedules" className="px-4">
            <LayoutGrid className="h-4 w-4" />
            Phân ca làm việc
          </TabsTrigger>
          <TabsTrigger value="leave-requests" className="px-4">
            <CalendarX className="h-4 w-4" />
            Đơn xin nghỉ
            {leaveRequests.some((request) => request.status === "pending") && (
              <Badge className="ml-1 h-5 rounded-full px-1.5 text-[10px]">
                {leaveRequests.filter((request) => request.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-6">
      <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-1 rounded-lg border bg-background p-1 shadow-sm sm:w-auto">
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => changeWeek(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Select value={formatDate(selectedMonday)} onValueChange={(val) => setSelectedMonday(new Date(val))}>
                <SelectTrigger className="h-9 w-full border-none shadow-none focus:ring-0 sm:w-[260px]">
                  <Calendar className="h-4 w-4 mr-2 text-primary" />
                  <SelectValue placeholder="Chọn tuần làm việc" />
                </SelectTrigger>
                <SelectContent>
                  {weekOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => changeWeek(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full bg-white shadow-sm"
              onClick={() => setSelectedMonday(getMonday(new Date()))}
              aria-label="Về tuần này"
            >
              <Home className="h-4 w-4" />
            </Button>
            
            <div className="sm:ml-auto w-full sm:max-w-xs">
              <AdminSearchBox
                placeholder="Tìm bác sĩ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="leave-requests" className="space-y-6">
          <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <AdminSearchBox
                  placeholder="Tìm theo bác sĩ, email, số điện thoại, lý do..."
                  value={leaveSearchTerm}
                  onChange={(event) => setLeaveSearchTerm(event.target.value)}
                />
                <Select value={leaveStatusFilter} onValueChange={setLeaveStatusFilter}>
                  <SelectTrigger className="h-11 w-full rounded-xl lg:w-[220px]">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="pending">Chờ duyệt</SelectItem>
                    <SelectItem value="approved">Đã duyệt</SelectItem>
                    <SelectItem value="rejected">Từ chối</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-xl lg:w-auto"
                  onClick={fetchLeaveRequests}
                  disabled={leaveLoading}
                >
                  {leaveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Làm mới
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarX className="h-5 w-5 text-primary" />
                Yêu cầu nghỉ của bác sĩ
              </CardTitle>
              <CardDescription>Duyệt hoặc từ chối yêu cầu nghỉ trước khi chặn lịch làm việc</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {leaveLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tải yêu cầu nghỉ...
                </div>
              ) : filteredLeaveRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-primary/15 p-6 text-center text-sm text-muted-foreground">
                  Chưa có yêu cầu nghỉ nào
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white">
                    <div className="max-h-[420px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-primary/5">
                          <TableRow>
                            <TableHead className="min-w-[150px]">Bác sĩ</TableHead>
                            <TableHead className="min-w-[110px]">Ngày nghỉ</TableHead>
                            <TableHead className="min-w-[110px]">Ngày gửi</TableHead>
                            <TableHead>Lý do</TableHead>
                            <TableHead className="min-w-[120px]">Trạng thái</TableHead>
                            <TableHead className="min-w-[120px]">Duyệt bởi</TableHead>
                            <TableHead className="min-w-[190px] text-right">Thao tác</TableHead>
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
                                {getLeaveDoctor(request).fullName || "Bác sĩ"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{getLeaveDateLabel(request)}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {request.createdAt ? new Date(request.createdAt).toLocaleDateString("vi-VN") : "Chưa có ngày gửi"}
                              </TableCell>
                              <TableCell className="max-w-[260px] truncate text-muted-foreground">
                                {request.reason || "Không có lý do"}
                              </TableCell>
                              <TableCell>{getLeaveStatusBadge(request.status)}</TableCell>
                              <TableCell className="text-muted-foreground">{request.reviewedBy?.fullName || "—"}</TableCell>
                              <TableCell>
                                {request.status === "pending" ? (
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
                                    <Button
                                      size="sm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleApproveLeave(request);
                                      }}
                                      disabled={leaveActionLoading === request._id}
                                    >
                                      {leaveActionLoading === request._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                      Duyệt
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setRejectTarget(request);
                                        setReviewNote("");
                                      }}
                                      disabled={leaveActionLoading === request._id}
                                    >
                                      <X className="h-4 w-4" />
                                      Từ chối
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end">
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
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  {leaveTotalPages > 1 && (
                    <div className="flex justify-center pt-2">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setLeavePage((page) => Math.max(1, page - 1))}
                              className={leavePage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: leaveTotalPages }, (_, index) => index + 1).map((page) => (
                            <PaginationItem key={page}>
                              <PaginationLink onClick={() => setLeavePage(page)} isActive={leavePage === page} className="cursor-pointer">
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setLeavePage((page) => Math.min(leaveTotalPages, page + 1))}
                              className={leavePage === leaveTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
      <Card className="soft-card overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1180px]">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="sticky left-0 z-20 w-[220px] border-r bg-muted/50 font-bold text-foreground">
                    Bác sĩ
                  </TableHead>
                  {ORDERED_DAYS.map((day) => (
                    <TableHead key={day.value} className="min-w-[140px] text-center font-bold text-foreground">
                      {day.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-64 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        Đang tải dữ liệu...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredDoctors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-64 text-center text-muted-foreground">
                      Không tìm thấy dữ liệu bác sĩ
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDoctors.map((doc) => {
                    const userId = doc.userId?._id || doc.userId;
                    return (
                      <TableRow key={doc._id} className="transition-colors hover:bg-muted/30">
                        <TableCell className="sticky left-0 z-10 border-r bg-card font-medium shadow-sm">
                          <div className="flex flex-col">
                            <span className="text-foreground">{doc.userId?.fullName || doc.name}</span>
                            <span className="text-xs text-muted-foreground truncate w-40">{doc.specialization}</span>
                          </div>
                        </TableCell>
                        {ORDERED_DAYS.map(({ value: dayIdx }) => {
                          const sch = getScheduleFor(userId, dayIdx);
                          return (
                            <TableCell key={dayIdx} className="border-r p-2 last:border-r-0">
                              {sch ? (
                                <div className="group relative flex min-h-16 flex-col items-center justify-center rounded-lg border bg-blue-50/60 p-2 text-center transition-all hover:border-blue-300 hover:shadow-sm">
                                  <p className="text-xs font-bold text-blue-700">{sch.startTime} – {sch.endTime}</p>
                                  <p className="text-[10px] text-blue-500 mt-1">{sch.maxSlots} slots</p>
                                  
                                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-blue-100/90 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white shadow-sm hover:bg-blue-50" onClick={() => openEdit(sch)} disabled={selectedWeekIsPast}>
                                      <Pencil className="h-3.5 w-3.5 text-blue-600" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white shadow-sm hover:bg-red-50" onClick={() => setDeleteTarget(sch)} disabled={selectedWeekIsPast}>
                                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  className="h-16 w-full rounded-lg border-2 border-dashed border-muted-foreground/15 text-muted-foreground/50 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                                  onClick={() => openCreate(userId, dayIdx)}
                                  disabled={selectedWeekIsPast}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center pb-6">
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
        </CardContent>
      </Card>

      {/* ── Bulk Assign Dialog ── */}
        </TabsContent>
      </Tabs>

      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="modal-scroll sm:max-w-[650px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <LayoutGrid className="h-6 w-6 text-primary" />
              Gán lịch làm việc nhanh
            </DialogTitle>
            <DialogDescription>
              Thiết lập cùng lúc cho nhiều bác sĩ và nhiều ngày trong tuần.
              Gán cho tuần hiện tại và 16 tuần tiếp theo. Lưu ý: Lịch cũ của bác sĩ vào những ngày này sẽ bị ghi đè.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Doctors Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4" /> Chọn bác sĩ
                </Label>
                <Button variant="link" size="sm" onClick={selectAllDoctors}>Chọn tất cả</Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border rounded-lg bg-muted/20">
                {doctors.map(d => {
                  const id = d.userId?._id || d.userId;
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <Checkbox 
                        id={`bulk-doc-${id}`} 
                        checked={bulkForm.doctorIds.includes(id)}
                        onCheckedChange={() => toggleBulkDoctor(id)}
                      />
                      <label htmlFor={`bulk-doc-${id}`} className="text-sm cursor-pointer truncate">
                        {d.userId?.fullName || d.name}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Days Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-bold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Chọn ngày trong tuần
                </Label>
                <Button variant="link" size="sm" onClick={selectWeekdayDays}>Thứ 2 - Thứ 6</Button>
              </div>
              <div className="flex flex-wrap gap-3 p-3 border rounded-lg bg-muted/20">
                {ORDERED_DAYS.map(({ label, value }) => (
                  <div key={value} className="flex items-center gap-2">
                    <Checkbox 
                      id={`bulk-day-${value}`}
                      checked={bulkForm.days.includes(value)}
                      onCheckedChange={() => toggleBulkDay(value)}
                    />
                    <label htmlFor={`bulk-day-${value}`} className="text-sm cursor-pointer">
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Time and Slots */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-bold">Giờ bắt đầu</Label>
                <Input type="time" value={bulkForm.startTime} onChange={e => setBulkForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Giờ kết thúc</Label>
                <Input type="time" value={bulkForm.endTime} onChange={e => setBulkForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="font-bold">Slot tối đa</Label>
                <Input type="number" min={1} value={bulkForm.maxSlots} onChange={e => setBulkForm(f => ({ ...f, maxSlots: parseInt(e.target.value) || 10 }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Hủy</Button>
            <Button onClick={handleBulkAssign} disabled={bulkSubmitting} className="min-w-[120px]">
              {bulkSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gán lịch ngay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Individual Form Dialog ── */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Chỉnh sửa ca làm việc" : "Thêm ca làm việc mới"}</DialogTitle>
            <DialogDescription>
              {form.weekStart ? `Tuần ${form.weekStart} - ` : ''}{getDayLabel(form.dayOfWeek)} – {doctors.find(d => (d.userId?._id || d.userId) === form.doctorId)?.userId?.fullName || 'Bác sĩ'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Giờ bắt đầu</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Giờ kết thúc</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Số lượng lịch hẹn tối đa</Label>
              <Input type="number" min={1} value={form.maxSlots} onChange={e => setForm(f => ({ ...f, maxSlots: parseInt(e.target.value, 10) || 1 }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>Hủy</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => {
        if (!open) {
          setRejectTarget(null);
          setReviewNote("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối yêu cầu nghỉ</DialogTitle>
            <DialogDescription>
              Nhập lý do phản hồi cho bác sĩ nếu cần.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Lý do từ chối</Label>
            <Textarea
              rows={4}
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="Ví dụ: Ngày này phòng khám đang thiếu nhân sự..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleRejectLeave} disabled={leaveActionLoading === rejectTarget?._id}>
              {leaveActionLoading === rejectTarget?._id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedLeaveRequest} onOpenChange={(open) => !open && setSelectedLeaveRequest(null)}>
        <DialogContent className="rounded-[28px] border-white/80 bg-white/95 shadow-2xl shadow-cyan-950/12 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết yêu cầu nghỉ</DialogTitle>
            <DialogDescription>Thông tin đơn xin nghỉ do bác sĩ gửi.</DialogDescription>
          </DialogHeader>
          {selectedLeaveRequest && (
            <div className="space-y-4 py-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Bác sĩ</span>
                    <span className="font-semibold text-slate-950">{getLeaveDoctor(selectedLeaveRequest).fullName || "Bác sĩ"}</span>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {[getLeaveDoctor(selectedLeaveRequest).email, getLeaveDoctor(selectedLeaveRequest).phone].filter(Boolean).join(" · ") || "Chưa có thông tin liên hệ"}
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Trạng thái</p>
                  <div className="mt-2">{getLeaveStatusBadge(selectedLeaveRequest.status)}</div>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Ngày nghỉ</p>
                  <p className="mt-1 font-semibold text-slate-950">{getLeaveDateLabel(selectedLeaveRequest)}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Ngày gửi</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {selectedLeaveRequest.createdAt ? new Date(selectedLeaveRequest.createdAt).toLocaleDateString("vi-VN") : "Chưa có ngày gửi"}
                  </p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Duyệt bởi</p>
                  <p className="mt-1 font-semibold text-slate-950">{selectedLeaveRequest.reviewedBy?.fullName || "Chưa xử lý"}</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Phản hồi</p>
                  <p className="mt-1 font-semibold text-slate-950">{selectedLeaveRequest.reviewNote || "Chưa có phản hồi"}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-white p-4">
                <p className="text-xs font-medium text-muted-foreground">Lý do nghỉ</p>
                <p className="mt-2 leading-6 text-slate-800">{selectedLeaveRequest.reason || "Không có lý do"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLeaveRequest(null)}>Đóng</Button>
            {selectedLeaveRequest?.status === "pending" && (
              <>
                <Button onClick={() => handleApproveLeave(selectedLeaveRequest)} disabled={leaveActionLoading === selectedLeaveRequest?._id}>
                  {leaveActionLoading === selectedLeaveRequest?._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Duyệt
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setRejectTarget(selectedLeaveRequest);
                    setReviewNote("");
                    setSelectedLeaveRequest(null);
                  }}
                  disabled={leaveActionLoading === selectedLeaveRequest?._id}
                >
                  <X className="h-4 w-4" />
                  Từ chối
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!conflictInfo} onOpenChange={(open) => !open && setConflictInfo(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Cần xử lý lịch hẹn trước
            </DialogTitle>
            <DialogDescription>
              Bác sĩ vẫn còn lịch hẹn trong ngày xin nghỉ. Vui lòng đổi lịch, hủy hoặc chuyển bác sĩ trước khi duyệt.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {(conflictInfo?.conflicts || []).map((appointment) => (
              <div key={appointment._id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{appointment.patientName}</span>
                  <Badge variant="secondary">{appointment.status}</Badge>
                </div>
                <div className="mt-1 text-muted-foreground">
                  {appointment.serviceName} - {appointment.startTime}{appointment.endTime ? ` - ${appointment.endTime}` : ""}
                  {appointment.patientPhone ? ` - ${appointment.patientPhone}` : ""}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConflictInfo(null)}>Đóng</Button>
            <Button asChild>
              <Link to="/admin/appointments">Đi đến lịch hẹn</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa ca làm việc</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa ca làm việc này không? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
