import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Clock,
  User,
  FileText,
  Image,
  Loader2,
  CheckCircle,
  ClipboardList,
  ExternalLink,
  Filter,
  Eye,
  Paperclip,
  Pencil,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import axiosInstance from "@/api/httpClient";
import { usePageFocus } from "@/hooks/usePageFocus";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";
import { isAppointmentOverdue } from "@/utils/appointmentStatus";
import { getUploadUrl } from "@/utils/getMediaUrl";

// ── Status badge helper ──────────────────────────────────────────
const STATUS_MAP = {
  pending:     { label: "Chờ xác nhận", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  confirmed:   { label: "Đã xác nhận",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
  rescheduled: { label: "Đổi lịch",     cls: "bg-purple-50 text-purple-700 border-purple-200" },
  in_progress: { label: "Đang khám",    cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  completed:   { label: "Hoàn thành",   cls: "bg-green-50 text-green-700 border-green-200" },
  cancelled:   { label: "Đã hủy",       cls: "bg-red-50 text-red-700 border-red-200" },
};

function StatusBadge({ status, appointment }) {
  if (appointment && isAppointmentOverdue(appointment))
    return <span className="badge-status-overdue">Quá hạn</span>;
  const MAP = {
    pending:     <span className="badge-status-pending">Chờ xác nhận</span>,
    confirmed:   <span className="badge-status-confirmed">Đã xác nhận</span>,
    rescheduled: <span className="badge-status-pending">Đổi lịch</span>,
    in_progress: <span className="badge-status-confirmed">Đang khám</span>,
    completed:   <span className="badge-status-completed">Hoàn thành</span>,
    cancelled:   <span className="badge-status-cancelled">Đã hủy</span>,
  };
  return MAP[status] ?? <span className="badge-status-pending">{status}</span>;
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

const getPatientName = (appointment) =>
  appointment?.patientId?.fullName ||
  appointment?.patientId?.name ||
  appointment?.patientName ||
  "Bệnh nhân";

const getServiceName = (appointment) =>
  appointment?.serviceId?.name ||
  appointment?.serviceName ||
  "Dịch vụ";

const getServiceKey = (appointment) =>
  appointment?.serviceId?._id ||
  appointment?.serviceId?.id ||
  appointment?.serviceName ||
  getServiceName(appointment);

const getSearchText = (appointment, includeResultFields = false) => {
  const patient = appointment?.patientId || {};
  const values = [
    getPatientName(appointment),
    patient.phone,
    appointment?.patientPhone,
    patient.email,
    appointment?.patientEmail,
    getServiceName(appointment),
    appointment?.status,
  ];

  if (includeResultFields) {
    values.push(
      appointment?.diagnosis,
      appointment?.treatment,
      appointment?.prescription,
      appointment?.note,
      appointment?.result?.diagnosis,
      appointment?.result?.treatment,
      appointment?.result?.prescription,
      appointment?.result?.note
    );
  }

  return values.filter(Boolean).join(" ").toLowerCase();
};

const XRAY_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const XRAY_MAX_SIZE = 10 * 1024 * 1024;

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

const getAttachmentLabel = (file, fallback = "Tệp đính kèm") =>
  file?.originalName || file?.fileName || file?.name || fallback;

const getAttachmentTypeLabel = (file) => (file?.type === "xray" ? "X-quang" : "Ảnh lâm sàng");

// ── Result Form Dialog ───────────────────────────────────────────
function ResultDialog({ appointment, open, onClose, onSaved }) {
  const [form, setForm] = useState({ diagnosis: "", treatment: "", prescription: "", note: "", nextDate: "" });
  const [xrayFiles, setXrayFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [existingResult, setExistingResult] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState(null);

  // Load kết quả hiện có (nếu đã nhập trước đó)
  useEffect(() => {
    if (!open || !appointment) return;
    setForm({ diagnosis: "", treatment: "", prescription: "", note: "", nextDate: "" });
    setXrayFiles([]);
    setExistingResult(null);
    setDeletingAttachmentId(null);
    setLoadingResult(true);

    axiosInstance.get(`/exam-results/appointment/${appointment._id}`)
      .then(res => {
        const r = res.data.data;
        if (r) {
          setExistingResult(r);
          setForm({
            diagnosis:    r.diagnosis || "",
            treatment:    r.treatment || "",
            prescription: r.prescription || "",
            note:         r.note || "",
            nextDate:     r.nextDate ? new Date(r.nextDate).toISOString().split("T")[0] : "",
          });
        }
      })
      .catch(() => { /* Chưa có kết quả — bình thường */ })
      .finally(() => setLoadingResult(false));
  }, [open, appointment]);

  const existingXrays = useMemo(
    () => (existingResult?.attachments || []).filter((file) => isImageAttachment(file)),
    [existingResult]
  );

  const handleXrayChange = (event) => {
    const files = Array.from(event.target.files || []);
    const validFiles = [];

    files.forEach((file) => {
      if (!XRAY_ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} không phải định dạng ảnh X-quang hợp lệ`);
        return;
      }
      if (file.size > XRAY_MAX_SIZE) {
        toast.error(`${file.name} vượt quá giới hạn 10MB`);
        return;
      }
      validFiles.push(file);
    });

    setXrayFiles((current) => [...current, ...validFiles]);
    event.target.value = "";
  };

  const removePendingXray = (index) => {
    setXrayFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const uploadXrays = async (resultId) => {
    if (!resultId || xrayFiles.length === 0) return [];

    const failed = [];
    for (const file of xrayFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "xray");

      try {
        await axiosInstance.post(`/exam-results/${resultId}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch (error) {
        failed.push(file.name);
      }
    }
    return failed;
  };

  const handleDeleteExistingXray = async (file) => {
    if (!existingResult?._id || !file?._id) {
      toast.error("Không tìm thấy ảnh X-quang để xoá");
      return;
    }

    const fileLabel = getAttachmentLabel(file, "ảnh X-quang");
    const confirmed = window.confirm(`Xoá ${fileLabel} khỏi hồ sơ kết quả khám?`);
    if (!confirmed) return;

    setDeletingAttachmentId(file._id);
    try {
      const res = await axiosInstance.delete(`/exam-results/${existingResult._id}/attachments/${file._id}`);
      setExistingResult(res.data.data || {
        ...existingResult,
        attachments: (existingResult.attachments || []).filter((item) => item._id !== file._id),
      });
      toast.success("Đã xoá ảnh X-quang");
    } catch (err) {
      toast.error(err.response?.data?.message || "Xoá ảnh X-quang thất bại");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handleSubmit = async () => {
    if (!form.diagnosis.trim() || !form.treatment.trim()) {
      toast.error("Vui lòng nhập chẩn đoán và phương pháp điều trị");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.nextDate) delete payload.nextDate;
      let savedResult = existingResult;
      if (existingResult) {
        // Cập nhật kết quả đã có
        const res = await axiosInstance.put(`/exam-results/${existingResult._id}`, payload);
        savedResult = res.data.data || existingResult;
      } else {
        // Tạo mới
        const res = await axiosInstance.post("/exam-results", {
          appointmentId: appointment._id,
          ...payload,
        });
        savedResult = res.data.data;
      }

      const failedUploads = await uploadXrays(savedResult?._id);
      if (failedUploads.length > 0) {
        toast.warning(`Đã lưu kết quả, nhưng upload lỗi: ${failedUploads.join(", ")}`);
      } else if (xrayFiles.length > 0) {
        toast.success(`Đã lưu kết quả và upload ${xrayFiles.length} ảnh X-quang`);
      } else {
        toast.success(existingResult ? "Cập nhật kết quả khám thành công!" : "Lưu kết quả khám thành công!");
      }

      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lưu kết quả thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const patientName =
    appointment?.patientId?.fullName || appointment?.patientName || "Bệnh nhân";
  const serviceName =
    appointment?.serviceId?.name || appointment?.serviceName || "Dịch vụ";

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="modal-scroll max-h-[90vh] max-w-2xl rounded-[28px] border-white/80 bg-white/95 shadow-2xl shadow-cyan-950/12"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {existingResult ? "Cập nhật kết quả khám" : "Nhập kết quả khám"}
          </DialogTitle>
          <DialogDescription>
            Bệnh nhân: <strong>{patientName}</strong> — Dịch vụ: {serviceName}
          </DialogDescription>
        </DialogHeader>

        {loadingResult ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {existingResult && (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Đã có kết quả — bạn đang chỉnh sửa
              </div>
            )}
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Thông tin cuộc hẹn</p>
              <p className="mt-2 font-bold text-slate-950">{patientName}</p>
              <p className="mt-1 text-sm text-muted-foreground">{serviceName}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-diagnosis">Chẩn đoán <span className="text-destructive">*</span></Label>
              <input id="res-diagnosis" type="text" value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                placeholder="Nhập chẩn đoán bệnh" className="field-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-treatment">Phương pháp điều trị <span className="text-destructive">*</span></Label>
              <textarea id="res-treatment" value={form.treatment} rows={3}
                onChange={(e) => setForm({ ...form, treatment: e.target.value })}
                placeholder="Mô tả phương pháp điều trị" className="field-input resize-none" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-prescription">Đơn thuốc</Label>
              <textarea id="res-prescription" value={form.prescription} rows={3}
                onChange={(e) => setForm({ ...form, prescription: e.target.value })}
                placeholder="Kê đơn thuốc (tên thuốc, liều lượng, cách dùng)" className="field-input resize-none" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-note">Ghi chú / Lời dặn bệnh nhân</Label>
              <textarea id="res-note" value={form.note} rows={2}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Ghi chú thêm hoặc lời dặn cho bệnh nhân" className="field-input resize-none" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="res-nextdate">Ngày tái khám đề nghị</Label>
              <input id="res-nextdate" type="date" value={form.nextDate}
                min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                onChange={(e) => setForm({ ...form, nextDate: e.target.value })}
                className="field-input" />
              <p className="text-xs text-muted-foreground">Nếu điền, bệnh nhân sẽ nhận thông báo và email nhắc nhở tái khám.</p>
            </div>
            <div className="space-y-3 rounded-2xl border border-primary/10 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Label htmlFor={`xray-upload-${appointment._id}`} className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-primary" />
                    Ảnh X-quang
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Có thể chọn nhiều ảnh JPG, PNG, GIF hoặc WebP. Tối đa 10MB mỗi ảnh.
                  </p>
                </div>
                <label
                  htmlFor={`xray-upload-${appointment._id}`}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
                >
                  <Upload className="h-4 w-4" />
                  Chọn ảnh
                </label>
                <input
                  id={`xray-upload-${appointment._id}`}
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleXrayChange}
                />
              </div>

              {existingXrays.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Đã lưu trong hồ sơ
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {existingXrays.map((file, index) => {
                      const fileUrl = resolveAttachmentUrl(file);
                      const isDeleting = deletingAttachmentId === file._id;
                      return (
                        <div key={file._id || `${fileUrl}-${index}`} className="group relative overflow-hidden rounded-xl border border-primary/10 bg-muted/20">
                          {fileUrl ? (
                            <img src={fileUrl} alt={getAttachmentLabel(file, `X-quang ${index + 1}`)} className="h-20 w-full object-cover" />
                          ) : (
                            <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">Không có ảnh</div>
                          )}
                          <button
                            type="button"
                            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-destructive shadow-sm ring-1 ring-red-100 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Xoá ảnh X-quang"
                            aria-label={`Xoá ${getAttachmentLabel(file, `X-quang ${index + 1}`)}`}
                            disabled={isDeleting || submitting}
                            onClick={() => handleDeleteExistingXray(file)}
                          >
                            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                          <div className="px-2 py-1.5">
                            <span className="badge-status-confirmed">X-quang</span>
                            <p className="mt-1 truncate text-xs font-medium text-slate-700">{getAttachmentLabel(file, `X-quang ${index + 1}`)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {xrayFiles.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Chờ upload
                  </p>
                  <div className="space-y-2">
                    {xrayFiles.map((file, index) => (
                      <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button type="button" className="text-xs font-medium text-destructive" onClick={() => removePendingXray(index)}>
                          Bỏ chọn
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} disabled={submitting} className="btn-ghost">Hủy</button>
              <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary">
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Đang lưu...</>
                  : <><CheckCircle className="h-4 w-4" />{existingResult ? "Cập nhật" : "Lưu kết quả"}</>}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultDetailDialog({ appointment, open, onClose }) {
  const [detailResult, setDetailResult] = useState(null);
  const [loadingDetailResult, setLoadingDetailResult] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  useEffect(() => {
    if (!open || !appointment?._id) {
      setDetailResult(null);
      setPreviewAttachment(null);
      return;
    }

    const localResult = appointment.result || (appointment.attachments ? appointment : null);
    setDetailResult(localResult);
    setLoadingDetailResult(true);
    axiosInstance
      .get(`/exam-results/appointment/${appointment._id}`)
      .then((res) => setDetailResult(res.data.data || localResult))
      .catch(() => setDetailResult(localResult))
      .finally(() => setLoadingDetailResult(false));
  }, [open, appointment]);

  if (!appointment) return null;

  const patientName = getPatientName(appointment);
  const serviceName = getServiceName(appointment);
  const apptDate = appointment.appointmentDate || appointment.date;
  const apptTime = appointment.startTime || appointment.timeSlot || "";
  const sourceResult = detailResult || appointment.result || appointment;
  const diagnosis = sourceResult?.diagnosis || appointment.diagnosis || "Chưa có chẩn đoán";
  const treatment = sourceResult?.treatment || appointment.treatment || "Chưa có thông tin điều trị";
  const prescription = sourceResult?.prescription || appointment.prescription || "Chưa có đơn thuốc";
  const note = sourceResult?.note || sourceResult?.notes || appointment.note || "Chưa có ghi chú";
  const attachments = sourceResult?.attachments || [];

  return (
    <>
      <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
        <DialogContent className="modal-scroll max-h-[85vh] rounded-[28px] border-white/80 bg-white/95 shadow-2xl shadow-cyan-950/12 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết kết quả khám</DialogTitle>
            <DialogDescription>Thông tin lịch khám và kết quả đã ghi nhận.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <p className="text-xs font-medium text-muted-foreground">Bệnh nhân</p>
                <p className="mt-1 font-semibold text-slate-950">{patientName}</p>
                <p className="mt-1 text-sm text-muted-foreground">{appointment.patientId?.phone || appointment.patientPhone || "Chưa có SĐT"}</p>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <p className="text-xs font-medium text-muted-foreground">Trạng thái</p>
                <div className="mt-2"><StatusBadge status={appointment.status} appointment={appointment} /></div>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <p className="text-xs font-medium text-muted-foreground">Dịch vụ</p>
                <p className="mt-1 font-semibold text-slate-950">{serviceName}</p>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <p className="text-xs font-medium text-muted-foreground">Thời gian</p>
                <p className="mt-1 font-semibold text-slate-950">
                  {apptDate ? new Date(apptDate).toLocaleDateString("vi-VN") : "Chưa có ngày"}{apptTime ? ` · ${apptTime}` : ""}
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              <div className="rounded-2xl border border-primary/10 bg-white p-4">
                <p className="text-xs font-medium text-muted-foreground">Chẩn đoán</p>
                <p className="mt-2 leading-6 text-slate-800">{diagnosis}</p>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-white p-4">
                <p className="text-xs font-medium text-muted-foreground">Điều trị</p>
                <p className="mt-2 leading-6 text-slate-800">{treatment}</p>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-white p-4">
                <p className="text-xs font-medium text-muted-foreground">Đơn thuốc</p>
                <p className="mt-2 leading-6 text-slate-800">{prescription}</p>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-white p-4">
                <p className="text-xs font-medium text-muted-foreground">Ghi chú</p>
                <p className="mt-2 leading-6 text-slate-800">{note}</p>
              </div>
            </div>
            {(loadingDetailResult || attachments.length > 0) && (
              <div className="rounded-2xl border border-primary/10 bg-white p-4">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <Paperclip className="h-3.5 w-3.5" />
                  Tệp đính kèm / X-quang
                </p>
                {loadingDetailResult ? (
                  <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                    Đang tải ảnh X-quang...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {attachments.map((file, index) => {
                      const fileUrl = resolveAttachmentUrl(file);
                      const isImage = isImageAttachment(file);
                      const fileLabel = getAttachmentLabel(file, `Tệp ${index + 1}`);

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
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Đóng</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewAttachment} onOpenChange={(value) => !value && setPreviewAttachment(null)}>
        <DialogContent className="modal-scroll max-h-[90vh] rounded-[28px] border-white/80 bg-white/95 shadow-2xl shadow-cyan-950/12 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              {previewAttachment?.label || "Ảnh X-quang"}
            </DialogTitle>
            <DialogDescription>{getAttachmentTypeLabel(previewAttachment || {})}</DialogDescription>
          </DialogHeader>
          {previewAttachment?.fileUrl && (
            <div className="overflow-hidden rounded-2xl border border-primary/10 bg-muted/20">
              <img
                src={previewAttachment.fileUrl}
                alt={previewAttachment.label || "Ảnh X-quang"}
                className="max-h-[68vh] w-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function DoctorResultsPage() {
  const refreshKey = useRealtimeRefresh(["appointment:changed", "exam-result:changed"]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [appointments, setAppointments] = useState([]);
  const [overdueAppointmentsCount, setOverdueAppointmentsCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pendingEditorOpenId, setPendingEditorOpenId] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [selectedResultDetail, setSelectedResultDetail] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  
  // Pagination
  const [currentPagePending, setCurrentPagePending] = useState(1);
  const [currentPageHistory, setCurrentPageHistory] = useState(1);
  const itemsPerPage = 10;
  
  // Initialize tab from URL or default to pending
  const initialTab = searchParams.get("tab") || "pending";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync state back to URL when tab changes
  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
    // Reset pagination when tab changes
    setCurrentPagePending(1);
    setCurrentPageHistory(1);
  };

  // Auto-open dialog if openId is in URL
  useEffect(() => {
    const openId = searchParams.get("openId");
    if (openId) {
      setPendingEditorOpenId(openId);
      setSearchParams(prev => {
        prev.delete("openId");
        return prev;
      });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!pendingEditorOpenId) return;
    const appointment = [...appointments, ...history].find((item) => item._id === pendingEditorOpenId);
    if (!appointment) return;
    setSelectedResultDetail(null);
    setEditingAppointment(appointment);
    setPendingEditorOpenId(null);
  }, [appointments, history, pendingEditorOpenId]);

  // ── Fetch appointments cần nhập kết quả ──────────────────────
  const fetchAppointments = useCallback(async () => {
    try {
      // Lấy tất cả lịch hẹn (không lọc status) rồi filter phía client
      const res = await axiosInstance.get("/appointments");
      const all = res.data.data || [];
      // Chỉ hiện những lịch hẹn chưa huỷ
      const active = all.filter(a =>
        ["pending", "confirmed", "rescheduled", "in_progress"].includes(a.status)
      );
      setOverdueAppointmentsCount(active.filter((item) => isAppointmentOverdue(item)).length);
      setAppointments(active.filter((item) => !isAppointmentOverdue(item)));
      setCurrentPagePending(1);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách lịch hẹn");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch lịch sử kết quả đã nhập ────────────────────────────
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await axiosInstance.get("/appointments?status=completed");
      setHistory(res.data.data || []);
      setCurrentPageHistory(1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchHistory();
  }, [fetchAppointments, fetchHistory, refreshKey]);

  // Refetch khi quay lại tab
  usePageFocus(useCallback(() => {
    fetchAppointments();
    fetchHistory();
  }, [fetchAppointments, fetchHistory]));

  const handleSaved = () => {
    fetchAppointments();
    fetchHistory();
    // Chuyển sang tab Đã hoàn thành
    handleTabChange("history");
  };

  const openResultEditor = (appointment) => {
    setSelectedResultDetail(null);
    setEditingAppointment(appointment);
  };

  const handleDeleteResult = async (appointment) => {
    if (!appointment?._id) return;
    const confirmed = window.confirm("Bạn có chắc muốn xoá kết quả khám này? Lịch hẹn sẽ quay lại trạng thái Đang khám để nhập lại kết quả.");
    if (!confirmed) return;

    setDeletingId(appointment._id);
    try {
      const resultRes = await axiosInstance.get(`/exam-results/appointment/${appointment._id}`);
      const resultId = resultRes.data.data?._id;
      if (!resultId) {
        toast.error("Không tìm thấy kết quả khám để xoá");
        return;
      }
      await axiosInstance.delete(`/exam-results/${resultId}`);
      toast.success("Đã xoá kết quả khám");
      if (editingAppointment?._id === appointment._id) setEditingAppointment(null);
      fetchAppointments();
      fetchHistory();
      handleTabChange("pending");
    } catch (err) {
      toast.error(err.response?.data?.message || "Xoá kết quả khám thất bại");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPendingAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return appointments.filter((appointment) => {
      const matchesSearch = !query || getSearchText(appointment).includes(query);
      const matchesService = serviceFilter === "all" || getServiceKey(appointment) === serviceFilter;
      return matchesSearch && matchesService;
    });
  }, [appointments, search, serviceFilter]);

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();
    return history.filter((appointment) => {
      const matchesSearch = !query || getSearchText(appointment, true).includes(query);
      const matchesService = serviceFilter === "all" || getServiceKey(appointment) === serviceFilter;
      return matchesSearch && matchesService;
    });
  }, [history, search, serviceFilter]);

  const serviceOptions = useMemo(() => {
    const serviceMap = new Map();
    [...appointments, ...history].forEach((appointment) => {
      const value = getServiceKey(appointment);
      const label = getServiceName(appointment);
      if (value && !serviceMap.has(value)) {
        serviceMap.set(value, label);
      }
    });

    return [...serviceMap.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }, [appointments, history]);

  useEffect(() => {
    setCurrentPagePending(1);
    setCurrentPageHistory(1);
  }, [search, serviceFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-heading">
          <div className="space-y-2"><div className="skeleton h-4 w-28" /><div className="skeleton h-8 w-48" /><div className="skeleton h-4 w-80" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1,2,3].map(i=><div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="grid gap-4">
          {[1,2,3].map(i=>(
            <div key={i} className="soft-card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5"><div className="skeleton h-5 w-40" /><div className="skeleton h-4 w-28" /></div>
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
              <div className="flex gap-4">
                <div className="skeleton h-4 w-32" /><div className="skeleton h-4 w-20" />
              </div>
              <div className="skeleton h-9 w-32 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const paginatedPending = filteredPendingAppointments.slice((currentPagePending - 1) * itemsPerPage, currentPagePending * itemsPerPage);
  const totalPagesPending = Math.ceil(filteredPendingAppointments.length / itemsPerPage);

  const paginatedHistory = filteredHistory.slice((currentPageHistory - 1) * itemsPerPage, currentPageHistory * itemsPerPage);
  const totalPagesHistory = Math.ceil(filteredHistory.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div className="max-w-2xl">
          <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
            Kết quả khám
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Kết quả khám bệnh</h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Nhập chẩn đoán, phương pháp điều trị, đơn thuốc và lịch tái khám cho từng lịch hẹn một cách rõ ràng.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[420px]">
          <HeroMetric icon={ClipboardList} label="Chờ nhập" value={appointments.length} />
          <HeroMetric icon={CheckCircle} label="Đã hoàn thành" value={history.length} tone="text-green-600" bg="bg-green-50" />
          <HeroMetric icon={Clock} label="Quá hạn" value={overdueAppointmentsCount} tone="text-orange-600" bg="bg-orange-50" />
        </div>
      </div>

      <div className="hidden gap-4 sm:grid-cols-3">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Chờ nhập</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardList className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-primary">{appointments.length}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">lịch cần cập nhật kết quả</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Đã hoàn thành</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">{history.length}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">lịch đã hoàn tất</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Quá hạn</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold text-orange-600">{overdueAppointmentsCount}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">cần kiểm tra lại</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-primary/8 p-1 sm:w-auto">
          <TabsTrigger value="pending" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Chờ nhập kết quả
            {appointments.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-xs font-bold">
                {appointments.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Đã hoàn thành
            {history.length > 0 && (
              <span className="ml-1 rounded-full bg-green-100 text-green-700 px-1.5 py-0.5 text-xs font-bold">
                {history.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Chờ nhập kết quả ── */}
        <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm kiếm tên bệnh nhân, dịch vụ, chẩn đoán..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="field-input h-11 rounded-xl pl-10"
                />
              </div>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="h-11 w-full rounded-full bg-white px-4 shadow-sm sm:w-auto sm:min-w-[180px]">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Tất cả dịch vụ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả dịch vụ</SelectItem>
                  {serviceOptions.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="pending" className="mt-0">
          {appointments.length === 0 ? (
            <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Không có lịch hẹn cần xử lý</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Chỉ hiển thị lịch chưa quá hạn cần nhập kết quả khám
                </p>
              </CardContent>
            </Card>
          ) : filteredPendingAppointments.length === 0 ? (
            <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">Không tìm thấy kết quả phù hợp</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Thử đổi từ khóa hoặc chọn dịch vụ khác
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[200px]">Bệnh nhân</TableHead>
                      <TableHead>Dịch vụ</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPending.map((appt) => {
                      const patientName = appt.patientId?.fullName || appt.patientName || "Bệnh nhân";
                      const serviceName = appt.serviceId?.name || appt.serviceName || "Dịch vụ";
                      const apptDate = appt.appointmentDate || appt.date;
                      const apptTime = appt.startTime || appt.timeSlot || "";

                      return (
                        <TableRow
                          key={appt._id}
                          className="cursor-pointer transition-colors hover:bg-primary/5"
                          onClick={() => setSelectedResultDetail(appt)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {patientName}
                            </div>
                          </TableCell>
                          <TableCell>{serviceName}</TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {apptDate ? new Date(apptDate).toLocaleDateString("vi-VN") : "—"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {apptTime || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={appt.status} appointment={appt} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Xem chi tiết"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedResultDetail(appt);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={(event) => {
                                event.stopPropagation();
                                openResultEditor(appt);
                              }}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Nhập kết quả
                            </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPagesPending > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPagePending(p => Math.max(1, p - 1))}
                          disabled={currentPagePending === 1}
                          className={currentPagePending === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {[...Array(totalPagesPending)].map((_, i) => (
                        <PaginationItem key={i + 1}>
                          <PaginationLink 
                            onClick={() => setCurrentPagePending(i + 1)}
                            isActive={currentPagePending === i + 1}
                            className="cursor-pointer"
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPagePending(p => Math.min(totalPagesPending, p + 1))}
                          disabled={currentPagePending === totalPagesPending}
                          className={currentPagePending === totalPagesPending ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Đã hoàn thành ── */}
        <TabsContent value="history" className="mt-0">
          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Chưa có lịch hẹn hoàn thành</p>
              </CardContent>
            </Card>
          ) : filteredHistory.length === 0 ? (
            <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">Không tìm thấy kết quả phù hợp</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Thử đổi từ khóa hoặc chọn dịch vụ khác
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[200px]">Bệnh nhân</TableHead>
                      <TableHead>Dịch vụ</TableHead>
                      <TableHead>Ngày khám</TableHead>
                      <TableHead>Chẩn đoán</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHistory.map((appt) => {
                      const patientName = appt.patientId?.fullName || appt.patientName || "Bệnh nhân";
                      const serviceName = appt.serviceId?.name || appt.serviceName || "Dịch vụ";
                      const apptDate = appt.appointmentDate || appt.date;

                      return (
                        <TableRow
                          key={appt._id}
                          className="cursor-pointer transition-colors hover:bg-primary/5"
                          onClick={() => setSelectedResultDetail(appt)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {patientName}
                            </div>
                          </TableCell>
                          <TableCell>{serviceName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {apptDate ? new Date(apptDate).toLocaleDateString("vi-VN") : "—"}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground line-clamp-1 max-w-[200px]" title={appt.diagnosis}>
                              {appt.diagnosis || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Xem chi tiết"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedResultDetail(appt);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openResultEditor(appt);
                                }}
                                title="Sửa kết quả"
                              >
                                <Pencil className="h-4 w-4 text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:bg-destructive/10"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteResult(appt);
                                }}
                                disabled={deletingId === appt._id}
                                title="Xoá kết quả"
                              >
                                {deletingId === appt._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPagesHistory > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPageHistory(p => Math.max(1, p - 1))}
                          disabled={currentPageHistory === 1}
                          className={currentPageHistory === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {[...Array(totalPagesHistory)].map((_, i) => (
                        <PaginationItem key={i + 1}>
                          <PaginationLink 
                            onClick={() => setCurrentPageHistory(i + 1)}
                            isActive={currentPageHistory === i + 1}
                            className="cursor-pointer"
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPageHistory(p => Math.min(totalPagesHistory, p + 1))}
                          disabled={currentPageHistory === totalPagesHistory}
                          className={currentPageHistory === totalPagesHistory ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      <ResultDetailDialog
        appointment={selectedResultDetail}
        open={!!selectedResultDetail}
        onClose={() => setSelectedResultDetail(null)}
      />
      <ResultDialog
        appointment={editingAppointment}
        open={!!editingAppointment}
        onClose={() => setEditingAppointment(null)}
        onSaved={handleSaved}
      />
    </div>
  );
}
