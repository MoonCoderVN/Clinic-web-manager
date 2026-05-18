import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Pencil, Trash2, Stethoscope, CalendarDays, Clock, Edit2, UserCheck, Eye, Mail, Phone } from "lucide-react";
import { AdminPageHeader, AdminEmptyState, AdminLoadingState } from "@/components/admin/AdminUI";
import axiosInstance from "@/api/httpClient";
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

const formatWeekRange = (monday) => {
  const start = monday.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const end = sunday.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `Tuần ${start} – ${end}`;
};

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

const DAY_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const EMPTY_SCH = { dayOfWeek: 1, startTime: "08:00", endTime: "17:00", maxSlots: 10 };

function DoctorStatCard({ title, value, icon: Icon, color, tone }) {
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

function DoctorDetailDialog({ doctor, open, onClose, getVisibleDoctorServices }) {
  if (!doctor) return null;
  const services = getVisibleDoctorServices(doctor.services || []);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="modal-scroll max-h-[85vh] rounded-[28px] border-white/80 bg-white/95 shadow-2xl shadow-cyan-950/12 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chi tiết bác sĩ</DialogTitle>
          <DialogDescription>Thông tin hồ sơ và dịch vụ phụ trách.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-sm">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-950">BS. {doctor.name || "Bác sĩ"}</p>
              <p className="text-sm text-muted-foreground">{doctor.specialization || "Chưa cập nhật chuyên khoa"}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground">Email</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-slate-950"><Mail className="h-4 w-4 text-primary" />{doctor.email || "Chưa cập nhật"}</p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground">Số điện thoại</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-slate-950"><Phone className="h-4 w-4 text-primary" />{doctor.phone || "Chưa cập nhật"}</p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground">Kinh nghiệm</p>
              <p className="mt-1 font-semibold text-slate-950">{doctor.experience || 0} năm</p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground">Trạng thái</p>
              <p className="mt-1 font-semibold text-slate-950">{doctor.isActive ? "Hoạt động" : "Tạm nghỉ"}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-white p-4">
            <p className="text-xs font-medium text-muted-foreground">Dịch vụ phụ trách</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {services.length > 0
                ? services.map((service) => <Badge key={service._id || service} variant="secondary">{service.name || service}</Badge>)
                : <span className="text-sm text-muted-foreground">Chưa gán dịch vụ</span>}
            </div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-white p-4">
            <p className="text-xs font-medium text-muted-foreground">Giới thiệu</p>
            <p className="mt-2 leading-6 text-slate-800">{doctor.bio || "Chưa có giới thiệu"}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDoctorsPage() {
  const refreshKey = useRealtimeRefresh(["doctor:changed", "service:changed", "schedule:changed"]);
  const [doctors, setDoctors] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [detailDoctor, setDetailDoctor] = useState(null);

  // ── Schedule management ──────────────────────────────────────────
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDoctor, setScheduleDoctor] = useState(null);   // bác sĩ đang quản lý
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [schForm, setSchForm] = useState(EMPTY_SCH);
  const [editingSch, setEditingSch] = useState(null);
  const [showSchForm, setShowSchForm] = useState(false);
  const [savingSch, setSavingSch] = useState(false);

  // Week selection
  const [selectedMonday, setSelectedMonday] = useState(getMonday(new Date()));

  const weekOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    let mon = getMonday(today);
    mon.setDate(mon.getDate() - 28);
    for (let i = 0; i < 20; i++) {
      options.push({ value: formatDate(mon), label: formatWeekRange(mon) });
      mon.setDate(mon.getDate() + 7);
    }
    return options;
  }, []);



  const openScheduleDialog = async (doctor) => {
    setScheduleDoctor(doctor);
    const userId = doctor.userId?._id || doctor.userId;
    setSchedules([]);
    setShowSchForm(false);
    setShowScheduleDialog(true);
    setSchedulesLoading(true);
    try {
      // Use User ID for schedules, and filter by current week if needed or fetch all
      const weekParam = formatDate(selectedMonday);
      const res = await axiosInstance.get(`/schedules/doctor/${userId}?weekStart=${weekParam}`);
      setSchedules(res.data.data || res.data.schedules || res.data || []);
    } catch {
      toast.error("Không thể tải ca làm việc");
    } finally {
      setSchedulesLoading(false);
    }
  };

  const handleSaveSch = async () => {
    if (schForm.startTime >= schForm.endTime) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu");
      return;
    }
    setSavingSch(true);
    try {
      const userId = scheduleDoctor.userId?._id || scheduleDoctor.userId;
      const payload = { 
        ...schForm, 
        doctorId: userId,
        weekStart: formatDate(selectedMonday)
      };

      if (editingSch) {
        await axiosInstance.put(`/schedules/${editingSch._id}`, payload);
        toast.success("Đã cập nhật ca làm việc");
      } else {
        await axiosInstance.post("/schedules", payload);
        toast.success("Đã thêm ca làm việc");
      }
      // Reload schedules
      const res = await axiosInstance.get(`/schedules/doctor/${userId}?weekStart=${formatDate(selectedMonday)}`);
      setSchedules(res.data.data || res.data.schedules || res.data || []);
      setShowSchForm(false);
      setEditingSch(null);
      setSchForm(EMPTY_SCH);
    } catch (err) {
      toast.error(err.response?.data?.message || "Thao tác thất bại");
    } finally {
      setSavingSch(false);
    }
  };

  const handleDeleteSch = async (id) => {
    try {
      await axiosInstance.delete(`/schedules/${id}`);
      setSchedules((prev) => prev.filter((s) => s._id !== id));
      toast.success("Đã xóa ca làm việc");
    } catch {
      toast.error("Xóa thất bại");
    }
  };
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    specialization: "",
    experience: 0,
    bio: "",
    services: [], // array of service IDs
  });

  useEffect(() => {
    fetchDoctors();
    fetchServices();
  }, [refreshKey]);

  // Refetch khi quay lại tab
  usePageFocus(useCallback(() => { fetchDoctors(); }, []));

  const fetchDoctors = async () => {
    try {
      const res = await axiosInstance.get("/doctors");
      const raw = res.data.data || res.data.doctors || [];
      const normalized = raw.map((doc) => ({
        ...doc,
        name: doc.name || doc.userId?.fullName || "",
        email: doc.email || doc.userId?.email || "",
        phone: doc.phone || doc.userId?.phone || "",
        specialization: doc.specialization || doc.specialty || "",
        isActive: doc.isActive ?? doc.userId?.isActive ?? true,
        services: (doc.services || []).filter((service) => service?.isDeleted !== true),
      }));
      setDoctors(normalized);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Lỗi khi tải danh sách bác sĩ");
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await axiosInstance.get("/services");
      setAllServices((res.data.data || res.data.services || []).filter((service) => service?.isDeleted !== true));
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const availableServiceIds = useMemo(
    () => new Set(allServices.map((service) => service._id?.toString()).filter(Boolean)),
    [allServices]
  );

  const getVisibleDoctorServices = useCallback((services = []) => {
    return services.filter((service) => {
      if (!service) return false;
      if (typeof service === "object") {
        const id = service._id?.toString();
        return Boolean(id) && service.isDeleted !== true && (availableServiceIds.size === 0 || availableServiceIds.has(id));
      }
      return availableServiceIds.has(service.toString());
    });
  }, [availableServiceIds]);

  const handleServiceToggle = (serviceId) => {
    setFormData((prev) => {
      const exists = prev.services.includes(serviceId);
      return {
        ...prev,
        services: exists
          ? prev.services.filter((id) => id !== serviceId)
          : [...prev.services, serviceId],
      };
    });
  };

  const handleAddDoctor = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.specialization) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    try {
      await axiosInstance.post("/doctors", formData);
      toast.success("Đã thêm bác sĩ mới");
      setShowAddDialog(false);
      resetForm();
      fetchDoctors();
    } catch (error) {
      const msg = error.response?.data?.message || "Lỗi khi thêm bác sĩ";
      toast.error(msg);
    }
  };

  const handleEditDoctor = async () => {
    if (!selectedDoctor) return;
    try {
      await axiosInstance.put(`/doctors/${selectedDoctor._id}`, formData);
      toast.success("Đã cập nhật thông tin bác sĩ");
      setShowEditDialog(false);
      resetForm();
      fetchDoctors();
    } catch (error) {
      const msg = error.response?.data?.message || "Lỗi khi cập nhật bác sĩ";
      toast.error(msg);
    }
  };

  const handleDeleteDoctor = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa bác sĩ này?")) return;
    try {
      await axiosInstance.delete(`/doctors/${id}`);
      toast.success("Đã xóa bác sĩ");
      fetchDoctors();
    } catch (error) {
      toast.error("Lỗi khi xóa bác sĩ");
    }
  };

  const toggleDoctorStatus = async (doctor) => {
    try {
      await axiosInstance.put(`/doctors/${doctor._id}`, { isActive: !doctor.isActive });
      toast.success(`Đã ${doctor.isActive ? "tắt" : "bật"} trạng thái bác sĩ`);
      fetchDoctors();
    } catch (error) {
      toast.error("Lỗi khi cập nhật trạng thái");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      specialization: "",
      experience: 0,
      bio: "",
      services: [],
    });
    setSelectedDoctor(null);
  };

  const openEditDialog = (doctor) => {
    setSelectedDoctor(doctor);
    // services có thể là array of objects (populated) hoặc array of IDs
    const serviceIds = getVisibleDoctorServices(doctor.services || []).map((s) =>
      typeof s === "object" ? s._id : s
    );
    setFormData({
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      password: "",
      specialization: doctor.specialization,
      experience: doctor.experience || 0,
      bio: doctor.bio || "",
      services: serviceIds,
    });
    setShowEditDialog(true);
  };

  const filteredDoctors = doctors.filter((doc) => {
    const name = (doc.name || "").toLowerCase();
    const email = (doc.email || "").toLowerCase();
    const spec = (doc.specialization || "").toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || email.includes(term) || spec.includes(term);
  });

  // Reset page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);
  const paginatedDoctors = filteredDoctors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Shared form fields (used in both Add + Edit dialogs)
  const renderDoctorForm = (idPrefix = "") => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}name`}>Họ và tên *</Label>
        <Input
          id={`${idPrefix}name`}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Nguyễn Văn A"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}email`}>Email *</Label>
          <Input
            id={`${idPrefix}email`}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="doctor@example.com"
            disabled={!!selectedDoctor} // email không đổi khi edit
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}phone`}>Số điện thoại</Label>
          <Input
            id={`${idPrefix}phone`}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="0901234567"
          />
        </div>
      </div>
      {!selectedDoctor && (
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}password`}>Mật khẩu *</Label>
          <Input
            id={`${idPrefix}password`}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Nhập mật khẩu"
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}specialization`}>Chuyên khoa *</Label>
          <Input
            id={`${idPrefix}specialization`}
            value={formData.specialization}
            onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
            placeholder="Nha khoa tổng quát"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${idPrefix}experience`}>Kinh nghiệm (năm)</Label>
          <Input
            id={`${idPrefix}experience`}
            type="number"
            min="0"
            value={formData.experience}
            onChange={(e) =>
              setFormData({ ...formData, experience: parseInt(e.target.value) || 0 })
            }
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}bio`}>Giới thiệu</Label>
        <Textarea
          id={`${idPrefix}bio`}
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Mô tả ngắn về bác sĩ..."
          rows={2}
        />
      </div>

      {/* Services assignment */}
      {allServices.length > 0 && (
        <div className="grid gap-2">
          <Label>Dịch vụ đảm nhận</Label>
          <div className="rounded-md border p-3 grid gap-2 max-h-40 overflow-y-auto">
            {allServices.map((svc) => (
              <div key={svc._id} className="flex items-center gap-2">
                <Checkbox
                  id={`${idPrefix}svc-${svc._id}`}
                  checked={formData.services.includes(svc._id)}
                  onCheckedChange={() => handleServiceToggle(svc._id)}
                />
                <label
                  htmlFor={`${idPrefix}svc-${svc._id}`}
                  className="text-sm cursor-pointer"
                >
                  {svc.name}
                </label>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Đã chọn: {formData.services.length}/{allServices.length} dịch vụ
          </p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return <AdminLoadingState label="Đang tải danh sách bác sĩ..." />;
  }

  const activeDoctors = doctors.filter((doctor) => doctor.isActive).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý đội ngũ bác sĩ"
        titleClassName="text-primary"
        description="Quản lý hồ sơ bác sĩ, chuyên khoa, dịch vụ phụ trách và ca làm việc."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <DoctorStatCard title="Tổng bác sĩ" value={doctors.length} icon={Stethoscope} color="text-primary" tone="bg-primary/10" />
        <DoctorStatCard title="Đang hoạt động" value={activeDoctors} icon={UserCheck} color="text-green-600" tone="bg-green-50" />
        <DoctorStatCard title="Tạm nghỉ" value={doctors.length - activeDoctors} icon={CalendarDays} color="text-orange-600" tone="bg-orange-50" />
      </div>

      <Card className="soft-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full sm:w-[360px] md:w-[400px] lg:w-[420px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm bác sĩ..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="field-input h-11 rounded-xl pl-10"
              />
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="w-full lg:ml-auto lg:w-auto" onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm bác sĩ
                </Button>
              </DialogTrigger>
              <DialogContent className="modal-scroll sm:max-w-[540px] max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Thêm bác sĩ mới</DialogTitle>
                  <DialogDescription>Nhập thông tin bác sĩ mới vào hệ thống</DialogDescription>
                </DialogHeader>
                {renderDoctorForm("add-")}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleAddDoctor}>Thêm bác sĩ</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card className="soft-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Danh sách bác sĩ
          </CardTitle>
          <CardDescription>Tổng cộng {filteredDoctors.length} bác sĩ</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bác sĩ</TableHead>
                  <TableHead>Chuyên khoa</TableHead>
                  <TableHead>Kinh nghiệm</TableHead>
                  <TableHead>Dịch vụ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDoctors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Không tìm thấy bác sĩ nào
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDoctors.map((doctor) => {
                    const serviceCount = getVisibleDoctorServices(doctor.services || []).length;
                    return (
                      <TableRow
                        key={doctor._id}
                        className="cursor-pointer hover:bg-primary/5"
                        onClick={() => setDetailDoctor(doctor)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <Stethoscope className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">BS. {doctor.name}</p>
                              <p className="text-sm text-muted-foreground">{doctor.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{doctor.specialization}</TableCell>
                        <TableCell>{doctor.experience || 0} năm</TableCell>
                        <TableCell>
                          {serviceCount > 0 ? (
                            <Badge variant="secondary">{serviceCount} dịch vụ</Badge>
                          ) : (
                            <span className="text-xs text-orange-500">Chưa gán</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                          className={`cursor-pointer ${doctor.isActive ? 'badge-status-completed' : 'badge-status-cancelled'}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleDoctorStatus(doctor);
                          }}
                        >
                          {doctor.isActive ? "Hoạt động" : "Tạm nghỉ"}
                        </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Xem chi tiết"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDetailDoctor(doctor);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Quản lý ca làm việc"
                              onClick={(event) => {
                                event.stopPropagation();
                                openScheduleDialog(doctor);
                              }}
                            >
                              <CalendarDays className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditDialog(doctor);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteDoctor(doctor._id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      <DoctorDetailDialog
        doctor={detailDoctor}
        open={!!detailDoctor}
        onClose={() => setDetailDoctor(null)}
        getVisibleDoctorServices={getVisibleDoctorServices}
      />

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="modal-scroll sm:max-w-[540px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa bác sĩ</DialogTitle>
            <DialogDescription>Cập nhật thông tin bác sĩ</DialogDescription>
          </DialogHeader>
          {renderDoctorForm("edit-")}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditDoctor}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Schedule Management Dialog ── */}
      <Dialog open={showScheduleDialog} onOpenChange={(v) => { setShowScheduleDialog(v); if (!v) { setShowSchForm(false); setEditingSch(null); setSchForm(EMPTY_SCH); } }}>
        <DialogContent className="modal-scroll sm:max-w-[560px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Ca làm việc — BS. {scheduleDoctor?.name}
            </DialogTitle>
            <DialogDescription>
              Xem và thiết lập lịch làm việc cho từng tuần cụ thể
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Week Picker */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Label className="text-xs font-bold whitespace-nowrap">Chọn tuần:</Label>
              <Select value={formatDate(selectedMonday)} onValueChange={(val) => {
                const newMon = new Date(val);
                setSelectedMonday(newMon);
                // Refresh schedules for this doctor and this week
                const userId = scheduleDoctor.userId?._id || scheduleDoctor.userId;
                axiosInstance.get(`/schedules/doctor/${userId}?weekStart=${val}`).then(res => {
                  setSchedules(res.data.data || res.data.schedules || res.data || []);
                });
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Schedule list */}
            {schedulesLoading ? (
              <div className="flex justify-center py-8 text-muted-foreground text-sm">Đang tải...</div>
            ) : schedules.length === 0 && !showSchForm ? (
              <div className="flex flex-col items-center py-8 text-center gap-2">
                <Clock className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Bác sĩ chưa có ca làm việc nào</p>
              </div>
            ) : (
              <div className="space-y-2">
                {schedules
                  .sort((a, b) => (a.dayOfWeek ?? 0) - (b.dayOfWeek ?? 0))
                  .map((s) => (
                    <div key={s._id} className="flex items-center justify-between rounded-lg border px-4 py-3 bg-muted/30">
                      <div>
                        <p className="font-medium text-sm">{DAY_LABELS[s.dayOfWeek] ?? `Ngày ${s.dayOfWeek}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.startTime} – {s.endTime}
                          {s.maxSlots ? ` · Tối đa ${s.maxSlots} slot` : ""}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingSch(s);
                          setSchForm({ dayOfWeek: s.dayOfWeek ?? 1, startTime: s.startTime, endTime: s.endTime, maxSlots: s.maxSlots || 10 });
                          setShowSchForm(true);
                        }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteSch(s._id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Inline add/edit form */}
            {showSchForm && (
              <div className="rounded-lg border p-4 space-y-3 bg-background">
                <p className="text-sm font-medium">{editingSch ? "Chỉnh sửa ca" : "Thêm ca mới"}</p>
                <div className="space-y-2">
                  <Label>Thứ trong tuần</Label>
                  <Select value={String(schForm.dayOfWeek)}
                    onValueChange={(v) => setSchForm((f) => ({ ...f, dayOfWeek: parseInt(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAY_LABELS.map((label, idx) => (
                        <SelectItem key={idx} value={String(idx)}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Giờ bắt đầu</Label>
                    <Input type="time" value={schForm.startTime}
                      onChange={(e) => setSchForm((f) => ({ ...f, startTime: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Giờ kết thúc</Label>
                    <Input type="time" value={schForm.endTime}
                      onChange={(e) => setSchForm((f) => ({ ...f, endTime: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Số slot tối đa</Label>
                  <Input type="number" min={1} max={50} value={schForm.maxSlots}
                    onChange={(e) => setSchForm((f) => ({ ...f, maxSlots: parseInt(e.target.value) || 10 }))} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleSaveSch} disabled={savingSch}>
                    {savingSch ? "Đang lưu..." : editingSch ? "Cập nhật" : "Thêm ca"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setShowSchForm(false); setEditingSch(null); setSchForm(EMPTY_SCH);
                  }}>Hủy</Button>
                </div>
              </div>
            )}

            {!showSchForm && (
              <Button variant="outline" className="w-full" onClick={() => {
                setEditingSch(null); setSchForm(EMPTY_SCH); setShowSchForm(true);
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm ca làm việc
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
