import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Search,
  Users,
  Eye,
  Calendar,
  Pencil,
  Trash2,
  Loader2,
  Phone,
  Mail,
  MapPin,
  User,
  UserPlus,
  KeyRound,
} from "lucide-react";
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

// ── Age helper ──────────────────────────────────────────────────
function calcAge(dob) {
  if (!dob) return "—";
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--;
  return `${age} tuổi`;
}

function genderLabel(g) {
  return g === "male" ? "Nam" : g === "female" ? "Nữ" : "—";
}

function PatientStatCard({ title, value, icon: Icon, color, tone }) {
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

// ── Create Patient Dialog ──────────────────────────────────────────────────────────────────
const EMPTY_FORM = { fullName: "", email: "", phone: "", password: "", dateOfBirth: "", gender: "", address: "" };

function CreatePatientDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const reset = () => setForm(EMPTY_FORM);
  const handleClose = () => { reset(); onClose(); };
  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleCreate = async () => {
    if (!form.fullName.trim()) { toast.error("Vui lòng nhập họ tên"); return; }
    if (!form.email.trim())    { toast.error("Vui lòng nhập email");   return; }
    setSaving(true);
    try {
      await axiosInstance.post("/admin/patients", form);
      toast.success("Tạo bệnh nhân thành công!");
      onCreated();
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Tạo bệnh nhân thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Thêm bệnh nhân mới
          </DialogTitle>
          <DialogDescription>
            Tạo tài khoản bệnh nhân mới trong hệ thống
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            {/* Họ tên */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="create-name">Họ và tên <span className="text-destructive">*</span></Label>
              <Input id="create-name" value={form.fullName} onChange={f("fullName")} placeholder="Nguyễn Văn A" />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="create-email">Email <span className="text-destructive">*</span></Label>
              <Input id="create-email" type="email" value={form.email} onChange={f("email")} placeholder="patient@email.com" />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="create-phone">Số điện thoại</Label>
              <Input id="create-phone" value={form.phone} onChange={f("phone")} placeholder="0912345678" />
            </div>

            {/* Password */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="create-pw" className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Mật khẩu
              </Label>
              <Input
                id="create-pw"
                type="password"
                value={form.password}
                onChange={f("password")}
                placeholder="Để trống → dùng mật khẩu mặc định: Dentacare@123"
              />
              <p className="text-xs text-muted-foreground">
                Nếu để trống, mật khẩu mặc định sẽ là <code className="bg-muted px-1 rounded">Dentacare@123</code>
              </p>
            </div>

            {/* Date of birth */}
            <div className="space-y-2">
              <Label htmlFor="create-dob">Ngày sinh</Label>
              <Input id="create-dob" type="date" value={form.dateOfBirth} onChange={f("dateOfBirth")} />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="create-gender">Giới tính</Label>
              <Select value={form.gender} onValueChange={(v) => setForm((p) => ({ ...p, gender: v }))}>
                <SelectTrigger id="create-gender"><SelectValue placeholder="Chọn giới tính" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Nam</SelectItem>
                  <SelectItem value="female">Nữ</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Address */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="create-addr">Địa chỉ</Label>
              <Input id="create-addr" value={form.address} onChange={f("address")} placeholder="123 Đường ABC, Quận 1, TP.HCM" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>Hủy</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang tạo...</>
              : <><UserPlus className="mr-2 h-4 w-4" />Tạo bệnh nhân</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Dialog ─────────────────────────────────────────────────
function EditPatientDialog({ patient, open, onClose, onSaved }) {
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!patient) return;
    setForm({
      fullName:    patient.fullName  || "",
      phone:       patient.phone     || "",
      email:       patient.email     || "",
      dateOfBirth: patient.patientProfile?.dateOfBirth
        ? new Date(patient.patientProfile.dateOfBirth).toISOString().split("T")[0]
        : "",
      gender:  patient.patientProfile?.gender  || "",
      address: patient.patientProfile?.address || "",
    });
  }, [patient]);

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      toast.error("Họ tên không được để trống");
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.put(`/admin/patients/${patient._id}`, form);
      toast.success("Cập nhật bệnh nhân thành công!");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  const f = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Chỉnh sửa thông tin bệnh nhân
          </DialogTitle>
          <DialogDescription>Cập nhật hồ sơ bệnh nhân trong hệ thống</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-name">Họ và tên <span className="text-destructive">*</span></Label>
              <Input id="edit-name" value={form.fullName} onChange={f("fullName")} placeholder="Nguyễn Văn A" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Số điện thoại</Label>
              <Input id="edit-phone" value={form.phone} onChange={f("phone")} placeholder="0912345678" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={form.email} onChange={f("email")} placeholder="patient@email.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-dob">Ngày sinh</Label>
              <Input id="edit-dob" type="date" value={form.dateOfBirth} onChange={f("dateOfBirth")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-gender">Giới tính</Label>
              <Select value={form.gender} onValueChange={(v) => setForm((p) => ({ ...p, gender: v }))}>
                <SelectTrigger id="edit-gender">
                  <SelectValue placeholder="Chọn giới tính" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Nam</SelectItem>
                  <SelectItem value="female">Nữ</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit-address">Địa chỉ</Label>
              <Input id="edit-address" value={form.address} onChange={f("address")} placeholder="123 Đường ABC, Quận 1, TP.HCM" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang lưu...</> : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail Dialog ───────────────────────────────────────────────
function DetailPatientDialog({ patient, open, onClose }) {
  if (!patient) return null;
  const profile = patient.patientProfile;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Hồ sơ bệnh nhân</DialogTitle>
          <DialogDescription>Thông tin chi tiết</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {/* Avatar & name */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{patient.fullName}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />{patient.email}
              </p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "Số điện thoại", value: patient.phone || "—", icon: <Phone className="h-3 w-3" /> },
              { label: "Giới tính", value: genderLabel(profile?.gender) },
              { label: "Tuổi", value: calcAge(profile?.dateOfBirth) },
              { label: "Ngày sinh", value: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString("vi-VN") : "—" },
              { label: "Số lần khám", value: `${patient.appointmentsCount || 0} lần`, icon: <Calendar className="h-3 w-3" /> },
              { label: "Ngày đăng ký", value: new Date(patient.createdAt).toLocaleDateString("vi-VN") },
            ].map(({ label, value, icon }) => (
              <div key={label} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">{icon}{label}</p>
                <p className="font-medium">{value}</p>
              </div>
            ))}
          </div>

          {profile?.address && (
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" />Địa chỉ
              </p>
              <p className="font-medium">{profile.address}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function AdminPatientsPage() {
  const refreshKey = useRealtimeRefresh(["patient:changed", "user:changed", "appointment:changed"]);
  const [patients, setPatients]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [searchTerm, setSearchTerm]   = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog states
  const [detailPatient, setDetailPatient] = useState(null);
  const [editPatient, setEditPatient]     = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [createOpen, setCreateOpen]       = useState(false);

  const fetchPatients = async () => {
    try {
      const res = await axiosInstance.get("/admin/patients");
      setPatients(res.data.data?.patients || []);
    } catch {
      toast.error("Lỗi khi tải danh sách bệnh nhân");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, [refreshKey]);

  // Refetch khi quay lại tab
  usePageFocus(useCallback(() => fetchPatients(), []));

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    const q = searchTerm.toLowerCase();
    return patients.filter(
      (p) =>
        p.fullName?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
    );
  }, [patients, searchTerm]);

  // Reset page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedPatients = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalAppointments = patients.reduce((sum, patient) => sum + (patient.appointmentsCount || 0), 0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(`/admin/patients/${deleteTarget._id}`);
      toast.success("Đã xóa bệnh nhân thành công");
      setDeleteTarget(null);
      fetchPatients();
    } catch (err) {
      toast.error(err.response?.data?.message || "Xóa thất bại");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <AdminLoadingState label="Đang tải danh sách bệnh nhân..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý bệnh nhân"
        titleClassName="text-primary"
        description="Tra cứu, cập nhật và quản lý hồ sơ bệnh nhân trong hệ thống."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <PatientStatCard title="Tổng bệnh nhân" value={patients.length} icon={Users} color="text-primary" tone="bg-primary/10" />
        <PatientStatCard title="Lượt khám" value={totalAppointments} icon={Calendar} color="text-green-600" tone="bg-green-50" />
        <PatientStatCard title="Kết quả lọc" value={filtered.length} icon={Search} color="text-blue-600" tone="bg-blue-50" />
      </div>

      <Card className="soft-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full sm:w-[360px] md:w-[400px] lg:w-[420px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm theo tên, email, SĐT..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="field-input h-11 rounded-xl pl-10"
              />
            </div>
            <Button className="w-full lg:ml-auto lg:w-auto" onClick={() => setCreateOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Thêm bệnh nhân
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="soft-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Danh sách bệnh nhân
              </CardTitle>
              <CardDescription>Tổng cộng {filtered.length} / {patients.length} bệnh nhân</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6 lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bệnh nhân</TableHead>
                  <TableHead>Tuổi</TableHead>
                  <TableHead>Giới tính</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Số lần khám</TableHead>
                  <TableHead>Ngày đăng ký</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      {searchTerm ? "Không tìm thấy bệnh nhân phù hợp" : "Chưa có bệnh nhân nào"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPatients.map((patient) => (
                    <TableRow
                      key={patient._id}
                      className="cursor-pointer hover:bg-primary/5"
                      onClick={() => setDetailPatient(patient)}
                    >
                      {/* Name + email */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{patient.fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{patient.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>{calcAge(patient.patientProfile?.dateOfBirth)}</TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {genderLabel(patient.patientProfile?.gender)}
                        </Badge>
                      </TableCell>

                      <TableCell>{patient.phone || "—"}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {patient.appointmentsCount || 0} lần
                        </div>
                      </TableCell>

                      <TableCell className="text-sm">
                        {new Date(patient.createdAt).toLocaleDateString("vi-VN")}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {/* View */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Xem chi tiết"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDetailPatient(patient);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Chỉnh sửa"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditPatient(patient);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Xóa bệnh nhân"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget(patient);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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

          <div className="grid gap-3 lg:hidden">
            {paginatedPatients.length === 0 ? (
              <AdminEmptyState
                icon={Users}
                title={searchTerm ? "Không tìm thấy bệnh nhân phù hợp" : "Chưa có bệnh nhân nào"}
              />
            ) : paginatedPatients.map((patient) => (
              <div key={patient._id} className="admin-list-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{patient.fullName}</p>
                      <p className="truncate text-sm text-muted-foreground">{patient.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{genderLabel(patient.patientProfile?.gender)}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-muted/60 p-2">
                    <p className="text-muted-foreground">Tuổi</p>
                    <p className="font-medium">{calcAge(patient.patientProfile?.dateOfBirth)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-2">
                    <p className="text-muted-foreground">Lượt khám</p>
                    <p className="font-medium">{patient.appointmentsCount || 0} lần</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{patient.phone || "Chưa cập nhật SĐT"}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDetailPatient(patient)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditPatient(patient)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(patient)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Create Dialog ── */}
      <CreatePatientDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchPatients}
      />

      {/* ── Detail Dialog ── */}
      <DetailPatientDialog
        patient={detailPatient}
        open={!!detailPatient}
        onClose={() => setDetailPatient(null)}
      />

      {/* ── Edit Dialog ── */}
      <EditPatientDialog
        patient={editPatient}
        open={!!editPatient}
        onClose={() => setEditPatient(null)}
        onSaved={fetchPatients}
      />

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bệnh nhân?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sắp xóa <strong>{deleteTarget?.fullName}</strong>. Hành động này sẽ xóa vĩnh viễn
              tài khoản, hồ sơ và toàn bộ lịch hẹn của bệnh nhân. <strong>Không thể hoàn tác.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xóa...</> : "Xóa bệnh nhân"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
