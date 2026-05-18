import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Clock, DollarSign, Eye, Pencil, Plus, Search, Trash2, Upload, Wrench } from "lucide-react";
import { AdminEmptyState, AdminLoadingState, AdminPageHeader } from "@/components/admin/AdminUI";
import axiosInstance from "@/api/httpClient";
import { toast } from "sonner";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";
import { getUploadUrl } from "@/utils/getMediaUrl";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const emptyForm = {
  name: "",
  description: "",
  price: 0,
  duration: 30,
  category: "",
};

const statusOptions = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Tạm ngưng" },
];

const formatPrice = (price) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(price) || 0);

const buildServiceFormData = (formData, imageFile) => {
  const payload = new FormData();
  payload.append("name", formData.name);
  payload.append("description", formData.description || "");
  payload.append("price", Number(formData.price) || 0);
  payload.append("duration", Number(formData.duration) || 30);
  payload.append("category", formData.category || "");
  if (imageFile) payload.append("image", imageFile);
  return payload;
};

const normalizeImagePath = (value) =>
  typeof value === "string" ? value.trim() : "";

const getServiceImageUrl = (path, cacheKey) => {
  const imagePath = normalizeImagePath(path);
  if (!imagePath) return "";
  if (imagePath.startsWith("blob:") || imagePath.startsWith("data:")) return imagePath;
  return getUploadUrl(imagePath, cacheKey);
};

function ServiceThumbnail({ service, size = "table" }) {
  const imagePath = normalizeImagePath(service?.image);
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed ? "" : getServiceImageUrl(imagePath, service?.updatedAt);
  const classes = size === "form" ? "h-32 w-full rounded-xl" : "h-12 w-12 rounded-lg";

  useEffect(() => {
    setImageFailed(false);
  }, [imagePath, service?.updatedAt]);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={service?.name || "Ảnh dịch vụ"}
        className={`${classes} object-cover`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className={`${classes} flex items-center justify-center bg-primary/10 text-primary`}>
      <Wrench className={size === "form" ? "h-8 w-8" : "h-5 w-5"} />
    </div>
  );
}

function ServiceDescription({ children }) {
  const text = children || "Chưa có mô tả";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <p className="line-clamp-2 max-w-[420px] whitespace-normal text-sm leading-5 text-muted-foreground">
          {text}
        </p>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-normal leading-5" side="top" sideOffset={6}>
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function ServiceStatusSwitch({ service, disabled, onToggle }) {
  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={!!service.isActive}
        disabled={disabled}
        onCheckedChange={(checked) => onToggle(service, checked)}
        aria-label={service.isActive ? "Tạm ngưng dịch vụ" : "Kích hoạt dịch vụ"}
      />
      <span className={`text-sm font-medium ${service.isActive ? "text-green-700" : "text-orange-700"}`}>
        {service.isActive ? "Hoạt động" : "Tạm ngưng"}
      </span>
    </div>
  );
}

function ServiceDetailDialog({ service, open, onClose }) {
  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="modal-scroll max-h-[85vh] rounded-[28px] border-white/80 bg-white/95 shadow-2xl shadow-cyan-950/12 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chi tiết dịch vụ</DialogTitle>
          <DialogDescription>Thông tin dịch vụ nha khoa đang hiển thị trong hệ thống.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="overflow-hidden rounded-2xl border border-primary/10 bg-primary/5">
            <ServiceThumbnail service={service} size="form" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground">Tên dịch vụ</p>
              <p className="mt-1 font-semibold text-slate-950">{service.name || "Chưa cập nhật"}</p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground">Danh mục</p>
              <p className="mt-1 font-semibold text-slate-950">{service.category || "Khác"}</p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground">Giá</p>
              <p className="mt-1 font-semibold text-primary">{formatPrice(service.price)}</p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white p-4">
              <p className="text-xs font-medium text-muted-foreground">Thời gian</p>
              <p className="mt-1 font-semibold text-slate-950">{service.duration || 30} phút</p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-white p-4 sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">Trạng thái</p>
              <p className="mt-1 font-semibold text-slate-950">{service.isActive ? "Hoạt động" : "Tạm ngưng"}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-white p-4">
            <p className="text-xs font-medium text-muted-foreground">Mô tả</p>
            <p className="mt-2 leading-6 text-slate-800">{service.description || "Chưa có mô tả"}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ServiceStatCard({ title, value, description, icon: Icon, color, tone, barClass, progress, active, onClick }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      className={`stat-card cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${active ? "ring-2 ring-primary/30" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${barClass}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminServicesPage() {
  const refreshKey = useRealtimeRefresh(["service:changed"]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [detailService, setDetailService] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    fetchServices();
  }, [refreshKey]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return undefined;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const fetchServices = async () => {
    try {
      const res = await axiosInstance.get("/services");
      setServices(res.data.data || res.data.services || []);
    } catch (error) {
      console.error("Error fetching services:", error);
      toast.error("Lỗi khi tải danh sách dịch vụ");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedService(null);
    setImageFile(null);
    setImagePreview("");
  };

  const openAddDialog = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh không được vượt quá 5MB");
      event.target.value = "";
      return;
    }

    setImageFile(file);
  };

  const handleAddService = async () => {
    try {
      await axiosInstance.post("/services", buildServiceFormData(formData, imageFile), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Đã thêm dịch vụ mới");
      setShowAddDialog(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error("Error adding service:", error);
      toast.error(error.response?.data?.message || "Lỗi khi thêm dịch vụ");
    }
  };

  const handleEditService = async () => {
    if (!selectedService) return;

    try {
      await axiosInstance.put(`/services/${selectedService._id}`, buildServiceFormData(formData, imageFile), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Đã cập nhật dịch vụ");
      setShowEditDialog(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error("Error updating service:", error);
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật dịch vụ");
    }
  };

  const handleDeleteService = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa dịch vụ này?")) return;

    try {
      await axiosInstance.delete(`/services/${id}`);
      toast.success("Đã xóa dịch vụ");
      fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      toast.error("Lỗi khi xóa dịch vụ");
    }
  };

  const handleStatusChange = async (service, nextActive = !service.isActive) => {
    if (updatingStatusId) return;
    const previousServices = services;
    setUpdatingStatusId(service._id);
    setServices((current) =>
      current.map((item) =>
        item._id === service._id ? { ...item, isActive: nextActive } : item
      )
    );

    try {
      await axiosInstance.put(`/services/${service._id}`, { isActive: nextActive });
      toast.success(`Đã ${nextActive ? "bật" : "tắt"} dịch vụ`);
      await fetchServices();
    } catch (error) {
      console.error("Error toggling status:", error);
      setServices(previousServices);
      toast.error("Lỗi khi cập nhật trạng thái");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const openEditDialog = (service) => {
    setSelectedService(service);
    setFormData({
      name: service.name || "",
      description: service.description || "",
      price: service.price || 0,
      duration: service.duration || 30,
      category: service.category || "",
    });
    setImageFile(null);
    setShowEditDialog(true);
  };

  const categories = useMemo(() => {
    return [...new Set(services.map((service) => service.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "vi"));
  }, [services]);

  const activeServices = services.filter((service) => service.isActive).length;
  const inactiveServices = services.length - activeServices;

  const filteredServices = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return services.filter((service) => {
      const matchesSearch =
        !term ||
        (service.name || "").toLowerCase().includes(term) ||
        (service.category || "").toLowerCase().includes(term) ||
        (service.description || "").toLowerCase().includes(term);
      const matchesCategory = categoryFilter === "all" || service.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && service.isActive) ||
        (statusFilter === "inactive" && !service.isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, searchTerm, services, statusFilter]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const statusCounts = {
    all: services.length,
    active: activeServices,
    inactive: inactiveServices,
  };

  const renderForm = (mode) => {
    const currentImage = imagePreview || normalizeImagePath(selectedService?.image);
    const previewService = currentImage
      ? {
          name: formData.name || selectedService?.name,
          image: currentImage,
          updatedAt: imagePreview ? undefined : selectedService?.updatedAt,
        }
      : selectedService;

    return (
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor={`${mode}-image`}>Ảnh dịch vụ</Label>
          <div className="overflow-hidden rounded-xl border bg-muted/20">
            <ServiceThumbnail service={previewService} size="form" />
          </div>
          <div className="flex items-center gap-3">
            <Input
              id={`${mode}-image`}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageChange}
            />
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Hỗ trợ jpg, png, gif, webp. Tối đa 5MB.</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${mode}-name`}>Tên dịch vụ</Label>
          <Input
            id={`${mode}-name`}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Khám tổng quát"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${mode}-description`}>Mô tả</Label>
          <Textarea
            id={`${mode}-description`}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Mô tả chi tiết dịch vụ..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`${mode}-price`}>Giá (VND)</Label>
            <Input
              id={`${mode}-price`}
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
              placeholder="500000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${mode}-duration`}>Thời gian (phút)</Label>
            <Input
              id={`${mode}-duration`}
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) || 30 })}
              placeholder="30"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${mode}-category`}>Danh mục</Label>
          <Input
            id={`${mode}-category`}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="Khám và tư vấn"
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return <AdminLoadingState label="Đang tải danh sách dịch vụ..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản lý dịch vụ"
        titleClassName="text-primary"
        description="Quản lý dịch vụ nha khoa, ảnh hiển thị, giá và trạng thái hoạt động."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <ServiceStatCard
          title="Tổng dịch vụ"
          value={services.length}
          description="trong danh mục"
          icon={Wrench}
          color="text-primary"
          tone="bg-primary/10"
          barClass="bg-primary"
          progress={100}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <ServiceStatCard
          title="Đang hoạt động"
          value={activeServices}
          description={`${services.length ? Math.round((activeServices / services.length) * 100) : 0}% hiển thị`}
          icon={Activity}
          color="text-green-600"
          tone="bg-green-50"
          barClass="bg-green-500"
          progress={services.length ? (activeServices / services.length) * 100 : 0}
          active={statusFilter === "active"}
          onClick={() => setStatusFilter("active")}
        />
        <ServiceStatCard
          title="Tạm ngưng"
          value={inactiveServices}
          description={`${services.length ? Math.round((inactiveServices / services.length) * 100) : 0}% không nhận lịch`}
          icon={Clock}
          color="text-orange-600"
          tone="bg-orange-50"
          barClass="bg-orange-500"
          progress={services.length ? (inactiveServices / services.length) * 100 : 0}
          active={statusFilter === "inactive"}
          onClick={() => setStatusFilter("inactive")}
        />
      </div>

      <Card className="soft-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full sm:w-[360px] md:w-[400px] lg:w-[420px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, mô tả, danh mục..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="field-input h-11 rounded-xl pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-12 w-full rounded-lg bg-background px-4 shadow-sm lg:w-[200px]">
                <SelectValue placeholder="Tất cả danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả danh mục</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full lg:ml-auto lg:w-auto" onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm dịch vụ
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="soft-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Danh sách dịch vụ
          </CardTitle>
          <CardDescription>Tổng cộng {filteredServices.length} dịch vụ</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-5">
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
              {statusOptions.map((option) => (
                <TabsTrigger key={option.value} value={option.value} className="gap-2">
                  {option.label}
                  <span className="rounded-full bg-background px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    {statusCounts[option.value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="hidden overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[48%]">Dịch vụ</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead className="text-right">Giá</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                        <Wrench className="mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="text-lg font-medium">Không tìm thấy dịch vụ nào</p>
                        <p className="mt-1 max-w-md text-sm text-muted-foreground">
                          Thử đổi từ khóa, bộ lọc hoặc thêm dịch vụ mới cho danh mục này.
                        </p>
                        <Button className="mt-4" onClick={openAddDialog}>
                          <Plus className="mr-2 h-4 w-4" />
                          Thêm dịch vụ mới
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedServices.map((service) => (
                    <TableRow
                      key={service._id}
                      className="cursor-pointer hover:bg-primary/5"
                      onClick={() => setDetailService(service)}
                    >
                      <TableCell className="whitespace-normal">
                        <div className="flex items-center gap-3">
                          <ServiceThumbnail service={service} />
                          <div className="min-w-0">
                            <p className="font-medium">{service.name}</p>
                            <ServiceDescription>{service.description}</ServiceDescription>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{service.category || "Khác"}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatPrice(service.price)}
                      </TableCell>
                      <TableCell>{service.duration || 30} phút</TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <ServiceStatusSwitch
                          service={service}
                          disabled={updatingStatusId === service._id}
                          onToggle={handleStatusChange}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Xem chi tiết"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDetailService(service);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditDialog(service);
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
                              handleDeleteService(service._id);
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

          <div className="grid gap-3 md:hidden">
            {filteredServices.length === 0 ? (
              <AdminEmptyState
                icon={Wrench}
                title="Không tìm thấy dịch vụ nào"
                description="Thử đổi từ khóa, bộ lọc hoặc thêm dịch vụ mới."
                action={(
                  <Button onClick={openAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm dịch vụ mới
                  </Button>
                )}
              />
            ) : (
              paginatedServices.map((service) => (
              <div key={service._id} className="admin-list-card transition-colors hover:bg-slate-50/80">
                <div className="flex gap-3">
                  <ServiceThumbnail service={service} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{service.name}</p>
                        <ServiceDescription>{service.description}</ServiceDescription>
                      </div>
                      <ServiceStatusSwitch
                        service={service}
                        disabled={updatingStatusId === service._id}
                        onToggle={handleStatusChange}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline">{service.category || "Khác"}</Badge>
                      <span className="flex items-center gap-1 font-bold text-primary">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatPrice(service.price)}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {service.duration || 30} phút
                      </span>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(service)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleDeleteService(service._id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Xóa
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )))}
          </div>
        </CardContent>
      </Card>

      <ServiceDetailDialog
        service={detailService}
        open={!!detailService}
        onClose={() => setDetailService(null)}
      />

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Thêm dịch vụ mới</DialogTitle>
            <DialogDescription>Nhập thông tin dịch vụ nha khoa mới</DialogDescription>
          </DialogHeader>
          {renderForm("add")}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleAddService}>Thêm dịch vụ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa dịch vụ</DialogTitle>
            <DialogDescription>Cập nhật thông tin dịch vụ</DialogDescription>
          </DialogHeader>
          {renderForm("edit")}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Hủy
            </Button>
            <Button onClick={handleEditService}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
