import { useState, useEffect } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Users, Loader2, ShieldCheck, Stethoscope, User, Plus, Lock, UserCheck, Eye } from "lucide-react";
import { AdminPageHeader, AdminEmptyState, AdminLoadingState } from "@/components/admin/AdminUI";
import axiosInstance from "@/api/httpClient";
import { useAuth } from "@/context/AuthContext";
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

const ROLE_CONFIG = {
  admin:   { label: "Admin",     className: "bg-red-50 text-red-700 border-red-200",     icon: ShieldCheck },
  doctor:  { label: "Bác sĩ",   className: "bg-blue-50 text-blue-700 border-blue-200",   icon: Stethoscope },
  patient: { label: "Bệnh nhân",className: "bg-green-50 text-green-700 border-green-200",icon: User },
};

const EMPTY_DOCTOR_FORM = {
  fullName: "", email: "", password: "", phone: "",
  specialty: "", experience: "", bio: "",
};

function UserStatCard({ title, value, icon: Icon, color, tone }) {
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

function UserDetailDialog({ user, open, onClose }) {
  if (!user) return null;
  const roleConf = ROLE_CONFIG[user.role] || ROLE_CONFIG.patient;
  const RoleIcon = roleConf.icon;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="rounded-[28px] border-white/80 bg-white/95 shadow-2xl shadow-cyan-950/12 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chi tiết tài khoản</DialogTitle>
          <DialogDescription>Thông tin người dùng trong hệ thống.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-sm">
              <RoleIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-950">{user.fullName || "Chưa cập nhật"}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email || "Chưa có email"}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground">Vai trò</p>
              <Badge variant="outline" className={`mt-2 ${roleConf.className}`}>{roleConf.label}</Badge>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground">Trạng thái</p>
              <p className="mt-2 font-semibold text-slate-950">{user.isActive ? "Hoạt động" : "Bị khóa"}</p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground">Số điện thoại</p>
              <p className="mt-1 font-semibold text-slate-950">{user.phone || "Chưa cập nhật"}</p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground">Ngày tạo</p>
              <p className="mt-1 font-semibold text-slate-950">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "Chưa có dữ liệu"}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const refreshKey = useRealtimeRefresh(["user:changed", "doctor:changed", "patient:changed"]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const itemsPerPage = 10;

  // Create doctor dialog
  const [showCreateDoctor, setShowCreateDoctor] = useState(false);
  const [doctorForm, setDoctorForm] = useState(EMPTY_DOCTOR_FORM);
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/admin/users");
      setUsers(res.data.data || res.data.users || res.data || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      toast.error("Không thể tải danh sách người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [refreshKey]);

  const handleToggle = async (userId, currentStatus) => {
    if (userId === currentUser?._id) {
      toast.error("Không thể thay đổi trạng thái tài khoản đang đăng nhập");
      return;
    }
    setTogglingId(userId);
    try {
      await axiosInstance.patch(`/admin/users/${userId}/toggle`);
      toast.success(currentStatus ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Thao tác thất bại");
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateDoctor = async () => {
    if (!doctorForm.fullName || !doctorForm.email || !doctorForm.password || !doctorForm.specialty) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    setCreating(true);
    try {
      await axiosInstance.post("/admin/create-doctor", doctorForm);
      toast.success("Tạo tài khoản bác sĩ thành công!");
      setShowCreateDoctor(false);
      setDoctorForm(EMPTY_DOCTOR_FORM);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Tạo tài khoản thất bại");
    } finally {
      setCreating(false);
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      search === "" ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedUsers = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const counts = {
    total:   users.length,
    admin:   users.filter((u) => u.role === "admin").length,
    doctor:  users.filter((u) => u.role === "doctor").length,
    patient: users.filter((u) => u.role === "patient").length,
    active:  users.filter((u) => u.isActive).length,
    locked:  users.filter((u) => !u.isActive).length,
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản trị tài khoản người dùng"
        titleClassName="text-primary"
        description={`Tất cả tài khoản trong hệ thống - ${counts.total} người dùng`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <UserStatCard title="Admin" value={counts.admin} icon={ShieldCheck} color="text-red-600" tone="bg-red-50" />
        <UserStatCard title="Bác sĩ" value={counts.doctor} icon={Stethoscope} color="text-blue-600" tone="bg-blue-50" />
        <UserStatCard title="Bệnh nhân" value={counts.patient} icon={Users} color="text-green-600" tone="bg-green-50" />
        <UserStatCard title="Bị khóa" value={counts.locked} icon={Lock} color="text-orange-600" tone="bg-orange-50" />
      </div>

      <Card className="soft-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full sm:w-[360px] md:w-[400px] lg:w-[420px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="field-input h-11 rounded-xl pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-12 w-full rounded-lg bg-background px-4 shadow-sm lg:w-[220px]">
                <SelectValue placeholder="Vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả vai trò</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="doctor">Bác sĩ</SelectItem>
                <SelectItem value="patient">Bệnh nhân</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="w-full lg:ml-auto lg:w-auto"
              onClick={() => { setDoctorForm(EMPTY_DOCTOR_FORM); setShowCreateDoctor(true); }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tạo tài khoản bác sĩ
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
                Danh sách người dùng
              </CardTitle>
              <CardDescription>Tổng cộng {filtered.length} / {users.length} người dùng</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <AdminLoadingState label="Đang tải người dùng..." />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Không tìm thấy người dùng nào</p>
            </div>
          ) : (
            <>
            <div className="hidden overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6 md:block">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((u) => {
                  const roleConf = ROLE_CONFIG[u.role] || ROLE_CONFIG.patient;
                  const isSelf = u._id === currentUser?._id;
                  return (
                    <TableRow
                      key={u._id}
                      className="cursor-pointer hover:bg-primary/5"
                      onClick={() => setSelectedUser(u)}
                    >
                      <TableCell className="py-5 font-medium">
                        {u.fullName || "—"}
                        {isSelf && (
                          <span className="ml-2 text-xs text-muted-foreground">(bạn)</span>
                        )}
                      </TableCell>
                      <TableCell className="py-5 text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="py-5">
                        <Badge variant="outline" className={roleConf.className}>
                          {roleConf.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-5">
                        <span
                          className={u.isActive ? 'badge-status-completed' : 'badge-status-cancelled'}
                        >
                          {u.isActive ? "Hoạt động" : "Bị khóa"}
                        </span>
                      </TableCell>
                      <TableCell className="py-5 pr-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Xem chi tiết"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedUser(u);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        <Button
                          variant={u.isActive ? "outline" : "default"}
                          size="sm"
                          disabled={isSelf || togglingId === u._id}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggle(u._id, u.isActive);
                          }}
                        >
                          {togglingId === u._id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : u.isActive ? (
                            "Khóa"
                          ) : (
                            "Mở khóa"
                          )}
                        </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              </Table>
            </div>
            <div className="grid gap-3 md:hidden">
              {paginatedUsers.map((u) => {
                const roleConf = ROLE_CONFIG[u.role] || ROLE_CONFIG.patient;
                const isSelf = u._id === currentUser?._id;
                return (
                  <div
                    key={u._id}
                    className="admin-list-card cursor-pointer rounded-2xl border border-primary/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10"
                    onClick={() => setSelectedUser(u)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{u.fullName || "Chưa cập nhật"}</p>
                        <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                      </div>
                      <Badge variant="outline" className={roleConf.className}>{roleConf.label}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className={u.isActive ? 'badge-status-completed' : 'badge-status-cancelled'}>
                        {u.isActive ? "Hoạt động" : "Bị khóa"}
                      </span>
                      <Button
                        variant={u.isActive ? "outline" : "default"}
                        size="sm"
                        disabled={isSelf || togglingId === u._id}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleToggle(u._id, u.isActive);
                        }}
                      >
                        {togglingId === u._id ? <Loader2 className="h-3 w-3 animate-spin" /> : u.isActive ? "Khóa" : "Mở khóa"}
                      </Button>
                    </div>
                  </div>
                );
              })}
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

      {/* ── Dialog: Tạo tài khoản bác sĩ ── */}
      <UserDetailDialog
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />

      <Dialog open={showCreateDoctor} onOpenChange={setShowCreateDoctor}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo tài khoản bác sĩ mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Họ và tên <span className="text-destructive">*</span></Label>
                <Input value={doctorForm.fullName}
                  onChange={(e) => setDoctorForm({ ...doctorForm, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A" />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input type="email" value={doctorForm.email}
                  onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                  placeholder="doctor@dentacare.vn" />
              </div>
              <div className="space-y-2">
                <Label>Mật khẩu <span className="text-destructive">*</span></Label>
                <Input type="password" value={doctorForm.password}
                  onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                  placeholder="Tối thiểu 6 ký tự" />
              </div>
              <div className="space-y-2">
                <Label>Số điện thoại</Label>
                <Input value={doctorForm.phone}
                  onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                  placeholder="0901234567" />
              </div>
              <div className="space-y-2">
                <Label>Chuyên khoa <span className="text-destructive">*</span></Label>
                <Input value={doctorForm.specialty}
                  onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                  placeholder="Nha khoa tổng quát" />
              </div>
              <div className="space-y-2">
                <Label>Số năm kinh nghiệm</Label>
                <Input type="number" min={0} value={doctorForm.experience}
                  onChange={(e) => setDoctorForm({ ...doctorForm, experience: e.target.value })}
                  placeholder="5" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Giới thiệu ngắn</Label>
                <Input value={doctorForm.bio}
                  onChange={(e) => setDoctorForm({ ...doctorForm, bio: e.target.value })}
                  placeholder="Tốt nghiệp ĐH Y Dược TP.HCM..." />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Trường có dấu <span className="text-destructive">*</span> là bắt buộc.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDoctor(false)}>Hủy</Button>
            <Button onClick={handleCreateDoctor} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
