import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileText,
  Calendar,
  User,
  Pill,
  ClipboardX,
  CalendarClock,
  Stethoscope,
  ArrowRight,
  Clock,
  RefreshCw,
  Eye,
  ExternalLink,
  Image,
  Paperclip,
  Search,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { useRef } from "react";
import axiosInstance from "@/api/httpClient";
import { toast } from "sonner";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";
import { getUploadUrl } from "@/utils/getMediaUrl";

const normalizeHistoryResponse = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data?.records)) return payload.data.records;
  if (Array.isArray(payload)) return payload;
  return [];
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Đang cập nhật";

const formatShortDate = (value) => (value ? new Date(value).toLocaleDateString("vi-VN") : "-");

const getFetchMessage = (error) =>
  error?.response?.data?.message || error?.message || "Không thể tải lịch sử khám bệnh";

const getRecordDate = (record) => record.date || formatShortDate(record.appointmentDate || record.createdAt);
const getRecordTime = (record) => record.time || "-";
const getRecordDoctor = (record) => record.doctorName || "Bác sĩ DentaCare";
const getRecordDiagnosis = (record) => record.diagnosis || "Chưa có kết quả chi tiết";
const getRecordService = (record) => record.serviceName || "Đang cập nhật";
const getRecordTreatment = (record) => record.treatment || "Chưa có thông tin";

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
  file?.originalName || file?.fileName || fallback;

const getAttachmentTypeLabel = (file) => (file?.type === "xray" ? "X-quang" : "Ảnh lâm sàng");

export default function PatientHistoryPage() {
  const refreshKey = useRealtimeRefresh(["exam-result:changed", "appointment:changed"]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const itemsPerPage = 10;

  const fetchRecords = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setFetchError("");
    try {
      const response = await axiosInstance.get("/patients/me/exam-results");
      setRecords(normalizeHistoryResponse(response.data));
    } catch (error) {
      console.error("Failed to fetch exam history:", error);
      const message = getFetchMessage(error);
      setFetchError(message);
      setRecords([]);
      if (!silent) toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords, refreshKey]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;

    return records.filter((record) => {
      const searchable = [
        record.doctorName || "",
        record.serviceName || "",
        record.diagnosis || "",
        record.treatment || "",
      ].join(" ").toLowerCase();

      if (term && !searchable.includes(term)) return false;

      const rawDate = record.appointmentDate || record.createdAt;
      if (rawDate) {
        const recordDate = new Date(rawDate);
        if (from && recordDate < from) return false;
        if (to && recordDate > to) return false;
      }

      return true;
    });
  }, [records, searchTerm, dateFrom, dateTo]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo]);

  const openDetail = (record) => {
    setSelectedRecord(record);
    setShowDetailDialog(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-heading">
          <div className="space-y-2">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-8 w-52" />
            <div className="skeleton h-4 w-80" />
          </div>
          <div className="skeleton h-9 w-36 rounded-full" />
        </div>
        <div className="soft-card overflow-hidden">
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const completedResults = records.filter((record) => record.hasExamResult).length;
  const recallCount = records.filter((record) => record.nextDate).length;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,#f7fdfe_0%,#e9f8fb_48%,#ffffff_100%)] p-5 shadow-xl shadow-cyan-950/8 sm:p-6 lg:p-7">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-primary/12 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="mb-4 inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
              Hồ sơ chăm sóc
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Lịch sử khám bệnh của bạn</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Theo dõi chẩn đoán, điều trị, đơn thuốc và lịch tái khám được bác sĩ đề nghị trong một hồ sơ rõ ràng.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            <HeroMetric icon={FileText} label="Lần khám" value={records.length} />
            <HeroMetric icon={ShieldCheck} label="Có kết quả" value={completedResults} />
            <HeroMetric icon={CalendarClock} label="Tái khám" value={recallCount} />
          </div>
        </div>
      </div>

      {fetchError && (
        <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <span>{fetchError}</span>
          <Button variant="outline" size="sm" onClick={() => fetchRecords()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
        </div>
      )}

      {records.length === 0 ? (
        <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ClipboardX className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">Chưa có lịch sử khám bệnh</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Lịch sử sẽ hiển thị sau khi lịch hẹn của bạn được hoàn thành hoặc bác sĩ nhập kết quả khám.
            </p>
            <Button className="mt-5" asChild>
              <Link to="/patient/book">Đặt lịch khám</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative w-full sm:max-w-md">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Tìm kiếm theo bác sĩ, dịch vụ, chẩn đoán..."
                    className="h-11 rounded-xl pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-11 w-40 rounded-xl"
                    title="Từ ngày"
                  />
                  <span className="shrink-0 text-sm text-muted-foreground">—</span>
                  <Input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-11 w-40 rounded-xl"
                    title="Đến ngày"
                  />
                  {(dateFrom || dateTo) && (
                    <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
                      Xóa
                    </Button>
                  )}
                </div>
                <Button className="w-full lg:ml-auto lg:w-auto" asChild>
                  <Link to="/patient/book">
                    Đặt lịch tái khám
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="soft-card border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Danh sách lịch sử khám
              </CardTitle>
              <CardDescription>Hiển thị {filteredRecords.length} / {records.length} lần khám trong hồ sơ của bạn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
                  <ClipboardX className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">Không tìm thấy lịch sử khám phù hợp</p>
                  <p className="mt-1 text-sm text-muted-foreground">Thử đổi từ khóa tìm kiếm.</p>
                </div>
              ) : (
              <>
              <div className="appointment-table-scroll hidden max-h-[520px] overflow-auto rounded-xl border p-1 pr-2 md:block">
                <Table className="min-w-[1000px]">
                  <TableHeader>
                    <TableRow className="sticky top-0 z-10 bg-background">
                      <TableHead>Lần khám</TableHead>
                      <TableHead>Chẩn đoán</TableHead>
                      <TableHead>Dịch vụ</TableHead>
                      <TableHead>Ngày giờ</TableHead>
                      <TableHead>Bác sĩ</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.map((record, index) => {
                      const visitNumber = records.length - ((currentPage - 1) * itemsPerPage + index);
                      return (
                        <TableRow
                          key={record._id || record.appointmentId || index}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openDetail(record)}
                        >
                          <TableCell>
                            <Badge variant="secondary">#{visitNumber}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[240px]">
                            <p className="truncate font-medium">{getRecordDiagnosis(record)}</p>
                          </TableCell>
                          <TableCell className="max-w-[220px]">
                            <span className="block truncate">{getRecordService(record)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p>{getRecordDate(record)}</p>
                              <p className="text-sm text-muted-foreground">{getRecordTime(record)}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getRecordDoctor(record)}</TableCell>
                          <TableCell>
                            <HistoryStatus record={record} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                openDetail(record);
                              }}
                              title="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {paginatedRecords.map((record, index) => {
                  const visitNumber = records.length - ((currentPage - 1) * itemsPerPage + index);
                  return (
                    <div key={record._id || record.appointmentId || index} className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">Lần khám #{visitNumber}</Badge>
                            <HistoryStatus record={record} />
                          </div>
                          <p className="truncate font-semibold">{getRecordDiagnosis(record)}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{getRecordService(record)}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          {getRecordDate(record)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {getRecordTime(record)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-primary" />
                          {getRecordDoctor(record)}
                        </span>
                      </div>
                      <div className="mt-3 flex justify-end border-t pt-3">
                        <Button variant="outline" size="sm" onClick={() => openDetail(record)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Chi tiết
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
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

          <HistoryDetailDialog
            open={showDetailDialog}
            onOpenChange={setShowDetailDialog}
            record={selectedRecord}
          />
        </>
      )}
    </div>
  );
}

function HistoryStatus({ record }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge
        variant={record.hasExamResult ? "default" : "outline"}
        className={!record.hasExamResult ? "border-slate-200 bg-slate-50 text-slate-700" : ""}
      >
        {record.hasExamResult ? "Đã có kết quả" : "Đã hoàn thành"}
      </Badge>
      {record.nextDate && (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
          Tái khám
        </Badge>
      )}
    </div>
  );
}

function HistoryDetailDialog({ open, onOpenChange, record }) {
  const printRef = useRef(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  if (!record) return null;

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=800,height=600");
    win.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>Kết quả khám — DentaCare</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
          h2 { margin: 0 0 4px; font-size: 18px; }
          .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .block { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
          .block.full { grid-column: span 2; }
          .block-label { font-size: 11px; color: #888; margin-bottom: 4px; }
          .block-value { font-size: 14px; }
          .reminder { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; margin-top: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const printContent = `
    <h2>${getRecordDiagnosis(record)}</h2>
    <div class="meta">
      ${record.date || formatDate(record.appointmentDate || record.createdAt)}
      &nbsp;·&nbsp; ${getRecordTime(record)}
      &nbsp;·&nbsp; ${getRecordDoctor(record)}
    </div>
    <div class="grid">
      <div class="block"><div class="block-label">Dịch vụ</div><div class="block-value">${getRecordService(record)}</div></div>
      <div class="block"><div class="block-label">Chẩn đoán</div><div class="block-value">${getRecordDiagnosis(record)}</div></div>
      <div class="block full"><div class="block-label">Phương pháp điều trị</div><div class="block-value">${getRecordTreatment(record)}</div></div>
      ${record.prescription ? `<div class="block full"><div class="block-label">Đơn thuốc</div><div class="block-value" style="white-space:pre-wrap">${record.prescription}</div></div>` : ""}
      ${(record.note || record.notes) ? `<div class="block full"><div class="block-label">Ghi chú của bác sĩ</div><div class="block-value">${record.note || record.notes}</div></div>` : ""}
    </div>
    ${record.nextDate ? `<div class="reminder"><strong>Ngày tái khám được đề nghị:</strong> ${formatDate(record.nextDate)}</div>` : ""}
  `;
  const attachments = record.attachments || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="modal-scroll max-h-[85vh] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{getRecordDiagnosis(record)}</DialogTitle>
            <DialogDescription className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {record.date || formatDate(record.appointmentDate || record.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {getRecordTime(record)}
              </span>
              <span className="inline-flex items-center gap-1">
                <User className="h-4 w-4" />
                {getRecordDoctor(record)}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div ref={printRef} style={{ display: "none" }} dangerouslySetInnerHTML={{ __html: printContent }} />

          <div className="grid gap-4 sm:grid-cols-2">
            <HistoryBlock icon={Stethoscope} title="Dịch vụ" content={getRecordService(record)} />
            <HistoryBlock icon={Stethoscope} title="Chẩn đoán" content={getRecordDiagnosis(record)} />
            <HistoryBlock icon={FileText} title="Phương pháp điều trị" content={getRecordTreatment(record)} />
            {record.prescription && (
              <HistoryBlock icon={Pill} title="Đơn thuốc" content={record.prescription} className="sm:col-span-2" preWrap />
            )}
            {(record.note || record.notes) && (
              <HistoryBlock title="Ghi chú của bác sĩ" content={record.note || record.notes} className="sm:col-span-2" />
            )}
            {attachments.length > 0 && (
              <div className="rounded-xl border bg-background p-4 sm:col-span-2">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  Tệp đính kèm / X-quang
                </div>
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
              </div>
            )}
            {!record.hasExamResult && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:col-span-2">
                Lịch hẹn này đã hoàn thành nhưng chưa có phiếu kết quả khám chi tiết.
              </div>
            )}
            {record.nextDate && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:col-span-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-900">Ngày tái khám được đề nghị</p>
                    <p className="mt-1 text-sm font-semibold text-amber-800">{formatDate(record.nextDate)}</p>
                    <p className="mt-1 text-xs text-amber-700">Bạn nên đặt lịch trước để được ưu tiên phục vụ.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              In / Xuất PDF
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewAttachment} onOpenChange={(value) => !value && setPreviewAttachment(null)}>
        <DialogContent className="modal-scroll max-h-[90vh] sm:max-w-3xl">
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

function HistoryBlock({ icon: Icon = FileText, title, content, className = "", preWrap = false }) {
  return (
    <div className={`rounded-xl border bg-background p-4 ${className}`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <p className={`text-sm leading-6 ${preWrap ? "whitespace-pre-wrap" : ""}`}>
        {content || "Chưa có thông tin"}
      </p>
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
