import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Pencil, Trash2, Database, FileText,
  MessageSquare, BookOpen, Upload, File, CheckCircle2,
  XCircle, Clock, Loader2, FileSpreadsheet, FileType2, Eye, Search,
  AlertCircle, RefreshCw, ChevronLeft, ChevronRight
} from "lucide-react";
import { AdminPageHeader, AdminStatCard, AdminToolbar, AdminSearchBox, AdminEmptyState, AdminLoadingState } from "@/components/admin/AdminUI";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { knowledgeApi } from "@/api";
import { toast } from "sonner";

const categories = [
  { value: "general",    label: "Thông tin chung" },
  { value: "services",   label: "Dịch vụ" },
  { value: "procedures", label: "Quy trình điều trị" },
  { value: "aftercare",  label: "Chăm sóc sau điều trị" },
  { value: "faq",        label: "Câu hỏi thường gặp" },
  { value: "pricing",    label: "Bảng giá" },
];

const STATUS_CONFIG = {
  pending:    { label: "Chờ xử lý",  icon: Clock,        cls: "text-yellow-500" },
  processing: { label: "Đang xử lý", icon: Loader2,      cls: "text-blue-500 animate-spin" },
  completed:  { label: "Hoàn thành", icon: CheckCircle2, cls: "text-green-500" },
  failed:     { label: "Thất bại",   icon: XCircle,      cls: "text-red-500" },
};

const safeText = (value) => (typeof value === "string" ? value : "");
const normalizeInlineText = (value) => safeText(value).replace(/\s+/g, " ").trim();
const safeKeywords = (value) => Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
const getResponseList = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
};

const getApiErrorMessage = (error, fallback) => {
  const message = error?.response?.data?.message || error?.message;
  return message ? `${fallback}: ${message}` : fallback;
};

const normalizeKnowledgeItem = (item) => ({
  ...item,
  _id: item?._id || item?.id,
  title: normalizeInlineText(item?.title),
  content: normalizeInlineText(item?.content),
  category: safeText(item?.category) || "general",
  keywords: safeKeywords(item?.keywords).map(normalizeInlineText).filter(Boolean),
  source: safeText(item?.source) || "manual",
  isActive: item?.isActive !== false,
});

const splitKnowledgeTitle = (title) => {
  const text = safeText(title).trim();
  const match = text.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (!match) return { collection: "—", title: text || "Chưa có tiêu đề" };
  return {
    collection: match[1],
    title: match[2] || text,
  };
};

const normalizeDocument = (doc) => ({
  ...doc,
  _id: doc?._id || doc?.id,
  sourceType: safeText(doc?.sourceType) || "file",
  fileName: safeText(doc?.fileName),
  fileUrl: safeText(doc?.fileUrl),
  sourceUrl: safeText(doc?.sourceUrl),
  status: safeText(doc?.status) || "pending",
  fileSize: Number.isFinite(doc?.fileSize) ? doc.fileSize : Number.isFinite(doc?.size) ? doc.size : null,
  uploadedBy: doc?.uploadedBy && typeof doc.uploadedBy === "object" ? doc.uploadedBy : null,
  chunksCreated: Number.isFinite(doc?.chunksCreated) ? doc.chunksCreated : 0,
  errorMessage: safeText(doc?.errorMessage),
});

function FileIcon({ name }) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (ext === "pdf")                        return <FileType2     className="h-4 w-4 text-red-500" />;
  if (["xlsx","xls","csv"].includes(ext))   return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  return <File className="h-4 w-4 text-blue-500" />;
}

function DataSourceIcon({ doc }) {
  if (doc?.sourceType === "google_sheet") return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  return <FileIcon name={doc?.fileName} />;
}

export default function AdminKnowledgePage() {
  // ── Knowledge entries state ──────────────────────────────────────
  const [items,          setItems]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [fetchError,     setFetchError]     = useState("");
  const [searchTerm,     setSearchTerm]     = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter,   setSourceFilter]   = useState("all");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [currentPage,    setCurrentPage]    = useState(1);
  const [previewItem,    setPreviewItem]    = useState(null);
  const [testQuery,      setTestQuery]      = useState("");
  const [testLoading,    setTestLoading]    = useState(false);
  const [testResult,     setTestResult]     = useState(null);
  const [showAddDialog,  setShowAddDialog]  = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedItem,   setSelectedItem]   = useState(null);
  const [formData, setFormData] = useState({ title: "", content: "", category: "general", keywords: "" });

  // ── Upload state (inside Add dialog) ────────────────────────────
  const [addMode,        setAddMode]        = useState("manual"); // "manual" | "upload" | "sheet"
  const [uploadFile,     setUploadFile]     = useState(null);
  const [uploadCategory, setUploadCategory] = useState("general");
  const [uploading,      setUploading]      = useState(false);
  const [dragOver,       setDragOver]       = useState(false);
  const [sheetUrl,       setSheetUrl]       = useState("");
  const [sheetCategory,  setSheetCategory]  = useState("general");
  const [sheetLoading,   setSheetLoading]   = useState(false);
  const fileInputRef = useRef(null);

  // ── Documents list state ─────────────────────────────────────────
  const [documents,      setDocuments]      = useState([]);

  // ── API calls ───────────────────────────────────────────────────
  const fetchKnowledge = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const params = {};
      if (categoryFilter !== "all") params.category = categoryFilter;
      if (sourceFilter !== "all") params.source = sourceFilter;
      const res = await knowledgeApi.getItems(params);
      setItems(getResponseList(res.data, ["items", "knowledge"]).map(normalizeKnowledgeItem));
    } catch (error) {
      const message = getApiErrorMessage(error, "Không thể tải dữ liệu kiến thức");
      setFetchError(message);
      toast.error(message);
    }
    finally { setLoading(false); }
  }, [categoryFilter, sourceFilter]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await knowledgeApi.getDocuments();
      setDocuments(getResponseList(res.data, ["documents"]).map(normalizeDocument));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchKnowledge(); }, [fetchKnowledge]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, categoryFilter, sourceFilter, statusFilter]);
  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  const handleAddItem = async () => {
    if (!formData.title || !formData.content) { toast.error("Vui lòng nhập tiêu đề và nội dung"); return; }
    try {
      await knowledgeApi.createItem({
        ...formData,
        keywords: formData.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      });
      toast.success("Đã thêm mục kiến thức mới");
      setShowAddDialog(false);
      resetForm();
      fetchKnowledge();
    } catch { toast.error("Lỗi khi thêm"); }
  };

  const handleEditItem = async () => {
    if (!selectedItem) return;
    try {
      await knowledgeApi.updateItem(selectedItem._id, {
        ...formData,
        keywords: formData.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      });
      toast.success("Đã cập nhật"); setShowEditDialog(false); resetForm(); fetchKnowledge();
    } catch { toast.error("Lỗi khi cập nhật"); }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm("Xóa mục kiến thức này?")) return;
    try { await knowledgeApi.deleteItem(id); toast.success("Đã xóa"); fetchKnowledge(); }
    catch { toast.error("Lỗi khi xóa"); }
  };

  const toggleItemStatus = async (item) => {
    try { await knowledgeApi.updateItem(item._id, { isActive: !item.isActive }); fetchKnowledge(); }
    catch { toast.error("Lỗi khi cập nhật"); }
  };

  const resetForm = () => {
    setFormData({ title: "", content: "", category: "general", keywords: "" });
    setSelectedItem(null);
  };

  const openEditDialog = (item) => {
    const normalized = normalizeKnowledgeItem(item);
    setSelectedItem(normalized);
    setFormData({
      title: normalized.title,
      content: normalized.content,
      category: normalized.category,
      keywords: normalized.keywords.join(", "),
    });
    setShowEditDialog(true);
  };

  // ── File upload helpers ─────────────────────────────────────────
  const handleFileSelect = (file) => {
    const allowed = [".pdf",".doc",".docx",".xls",".xlsx",".csv",".txt"];
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) { toast.error("Chỉ chấp nhận: PDF, Word, Excel, CSV, TXT"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("File tối đa 20MB"); return; }
    setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile) { toast.error("Vui lòng chọn file"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("category", uploadCategory);
      await knowledgeApi.uploadDocument(fd);
      toast.success("Upload thành công! File đang được xử lý...");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocuments();
      // Tự refresh danh sách sau 3s để stat cards cập nhật khi xử lý xong
      setTimeout(fetchKnowledge, 3000);
      setTimeout(fetchKnowledge, 8000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleAddSheet = async () => {
    if (!sheetUrl.trim()) {
      toast.error("Vui lòng nhập link Google Sheet");
      return;
    }
    setSheetLoading(true);
    try {
      await knowledgeApi.createSheetSource({
        url: sheetUrl.trim(),
        category: sheetCategory,
      });
      toast.success("Đã thêm Google Sheet. Đang đồng bộ dữ liệu...");
      setSheetUrl("");
      fetchDocuments();
      setTimeout(fetchDocuments, 3000);
      setTimeout(fetchKnowledge, 8000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể thêm Google Sheet");
    } finally {
      setSheetLoading(false);
    }
  };

  const handleDeleteDoc = async (id, fileName) => {
    if (!confirm(`Xóa nguồn "${fileName}" và toàn bộ nội dung đã trích xuất?`)) return;
    try {
      const res = await knowledgeApi.deleteDocument(id);
      toast.success(res.data.message || "Đã xóa tài liệu");
      fetchDocuments();
    } catch { toast.error("Xóa thất bại"); }
  };

  const handleReindexDoc = async (id) => {
    try {
      await knowledgeApi.reindexDocument(id);
      toast.success("Đang đồng bộ lại nguồn dữ liệu");
      fetchDocuments();
      setTimeout(fetchDocuments, 3000);
      setTimeout(fetchKnowledge, 8000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Re-index thất bại");
    }
  };

  const handleTestQuery = async () => {
    if (!testQuery.trim()) {
      toast.error("Vui lòng nhập câu hỏi cần kiểm thử");
      return;
    }
    setTestLoading(true);
    try {
      const res = await knowledgeApi.testQuery({ query: testQuery.trim() });
      setTestResult(res.data.data || { sources: [], contexts: [] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể kiểm thử RAG");
    } finally {
      setTestLoading(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────
  const getCategoryLabel = (v) => categories.find((c) => c.value === v)?.label || safeText(v) || "general";
  const normalizedItems = items.map(normalizeKnowledgeItem).filter((item) => item._id);
  const normalizedDocuments = documents.map(normalizeDocument).filter((doc) => doc._id);
  const collectionNames = Array.from(new Set(normalizedItems.map((item) => splitKnowledgeTitle(item.title).collection).filter(Boolean)));
  const hasSingleCollection = collectionNames.length === 1;
  const sharedCollection = hasSingleCollection ? collectionNames[0] : "";
  const knowledgeTableColSpan = hasSingleCollection ? 5 : 6;
  const documentByFileName = new Map(normalizedDocuments.map((doc) => [doc.fileName, doc]));
  const hasDocumentFileSize = normalizedDocuments.some((doc) => Number.isFinite(doc.fileSize) && doc.fileSize > 0);
  const hasDocumentUploader = normalizedDocuments.some((doc) => doc.uploadedBy?.fullName || doc.uploadedBy?.name || doc.uploadedBy?.email);
  const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "—";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };
  const getUploaderLabel = (doc) => doc.uploadedBy?.fullName || doc.uploadedBy?.name || doc.uploadedBy?.email || "—";
  const getTrainingState = (item) => {
    if (item.embeddedAt || item.embeddingProvider || item.embeddingModel) return "indexed";
    if (item.source?.startsWith("file:")) {
      const fileName = item.source.replace(/^file:/, "");
      const doc = documentByFileName.get(fileName);
      if (doc?.status === "failed") return "failed";
      if (doc?.status === "pending" || doc?.status === "processing") return "training";
      if (doc?.status === "completed") return "indexed";
    }
    if (item.source?.startsWith("sheet:")) {
      const docId = item.source.replace(/^sheet:/, "");
      const doc = normalizedDocuments.find((document) => document._id === docId);
      if (doc?.status === "failed") return "failed";
      if (doc?.status === "pending" || doc?.status === "processing") return "training";
      if (doc?.status === "completed") return "indexed";
    }
    return "unknown";
  };
  const getTrainingBadge = (state) => {
    const config = {
      indexed:  { label: "Đã học",    className: "border-blue-200 bg-blue-50 text-blue-700",       icon: CheckCircle2 },
      training: { label: "Đang học",  className: "border-amber-200 bg-amber-50 text-amber-700",    icon: Loader2 },
      failed:   { label: "Lỗi",       className: "border-red-200 bg-red-50 text-red-700",          icon: XCircle },
      unknown:  { label: "Chưa rõ",   className: "border-slate-200 bg-slate-50 text-slate-600",    icon: Clock },
    }[state] || {};
    const Icon = config.icon || Clock;
    return (
      <Badge variant="outline" className={`gap-1.5 whitespace-nowrap ${config.className || ""}`}>
        <Icon className={`h-3.5 w-3.5 ${state === "training" ? "animate-spin" : ""}`} />
        {config.label || "Chưa rõ"}
      </Badge>
    );
  };
  const getStatusBadge = (item) => (
    <button
      type="button"
      className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold transition hover:shadow-sm ${
        item.isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
      onClick={(event) => {
        event.stopPropagation();
        toggleItemStatus(item);
      }}
    >
      {item.isActive ? "Hoạt động" : "Tạm tắt"}
    </button>
  );
  const searchText = searchTerm.trim().toLowerCase();
  const filteredItems = normalizedItems.filter((item) => {
    if (statusFilter === "active" && !item.isActive) return false;
    if (statusFilter === "inactive" && item.isActive) return false;
    if (!searchText) return true;
    const displayTitle = splitKnowledgeTitle(item.title);
    return (
      item.title.toLowerCase().includes(searchText) ||
      displayTitle.collection.toLowerCase().includes(searchText) ||
      displayTitle.title.toLowerCase().includes(searchText) ||
      item.content.toLowerCase().includes(searchText) ||
      item.keywords.some((keyword) => keyword.toLowerCase().includes(searchText))
    );
  });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = filteredItems.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, filteredItems.length);
  const paginatedItems = filteredItems.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const manualCount = normalizedItems.filter((i) => !i.source || i.source === "manual").length;
  const fileCount   = normalizedItems.filter((i) => (i.source || "").startsWith("file:")).length;
  const sheetCount  = normalizedItems.filter((i) => (i.source || "").startsWith("sheet:")).length;

  // ── Shared form fields ───────────────────────────────────────────
  const KnowledgeFormFields = ({ idPrefix = "" }) => (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}title`}>Tiêu đề <span className="text-destructive">*</span></Label>
        <Input id={`${idPrefix}title`} value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Quy trình niềng răng" />
      </div>
      <div className="grid gap-2">
        <Label>Danh mục</Label>
        <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}content`}>Nội dung <span className="text-destructive">*</span></Label>
        <Textarea id={`${idPrefix}content`} value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Nội dung chi tiết về kiến thức nha khoa..." rows={5} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}keywords`}>Từ khóa <span className="text-muted-foreground text-xs">(phân cách bằng dấu phẩy)</span></Label>
        <Input id={`${idPrefix}keywords`} value={formData.keywords}
          onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
          placeholder="niềng răng, chỉnh nha, invisalign" />
      </div>
    </div>
  );

  if (loading) return <AdminLoadingState label="Đang tải dữ liệu kiến thức..." />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Kho tri thức AI"
        titleClassName="text-primary"
        description="Quản lý nguồn tri thức để chatbot tư vấn nhất quán và chính xác hơn."
        action={(
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) { resetForm(); setUploadFile(null); setSheetUrl(""); setAddMode("manual"); }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setUploadFile(null); setSheetUrl(""); setAddMode("manual"); }}>
              <Plus className="mr-2 h-4 w-4" />Thêm kiến thức mới
            </Button>
          </DialogTrigger>
          <DialogContent className="modal-scroll sm:max-w-[600px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Thêm kiến thức mới</DialogTitle>
              <DialogDescription>Chọn cách thêm nội dung vào knowledge base</DialogDescription>
            </DialogHeader>

            {/* Mode toggle */}
            <div className="flex rounded-lg border p-1 gap-1 bg-muted/40">
              <button
                onClick={() => setAddMode("manual")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors
                  ${addMode === "manual"
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"}`}
              >
                <BookOpen className="h-4 w-4" />Nhập nội dung
              </button>
              <button
                onClick={() => setAddMode("upload")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors
                  ${addMode === "upload"
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"}`}
              >
                <Upload className="h-4 w-4" />Upload file
              </button>
              <button
                onClick={() => setAddMode("sheet")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors
                  ${addMode === "sheet"
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"}`}
              >
                <FileSpreadsheet className="h-4 w-4" />Google Sheet
              </button>
            </div>

            {/* ── Mode: Nhập thủ công ── */}
            {addMode === "manual" && (
              <div className="space-y-1">
                <KnowledgeFormFields idPrefix="add-" />
                <DialogFooter className="pt-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Hủy</Button>
                  <Button onClick={handleAddItem}><Plus className="mr-2 h-4 w-4" />Thêm mục</Button>
                </DialogFooter>
              </div>
            )}

            {/* ── Mode: Upload file ── */}
            {addMode === "upload" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Hỗ trợ PDF, Word (.doc/.docx), Excel (.xls/.xlsx), CSV, TXT — tối đa 20MB.
                  Nội dung sẽ được tự động trích xuất và chia thành các đoạn ngắn.
                </p>

                {/* Drag & drop zone */}
                <div
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer
                    ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  {uploadFile ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                      <FileIcon name={uploadFile.name} />
                      <span>{uploadFile.name}</span>
                      <span className="text-muted-foreground text-xs">({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium">Kéo thả file vào đây, hoặc click để chọn</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF • Word • Excel • CSV • TXT</p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    onChange={(e) => { if (e.target.files[0]) handleFileSelect(e.target.files[0]); }} />
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Danh mục</Label>
                    <Select value={uploadCategory} onValueChange={setUploadCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Hủy</Button>
                  <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
                    {uploading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang upload...</>
                      : <><Upload className="mr-2 h-4 w-4" />Upload file</>}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {addMode === "sheet" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Dùng link Google Sheet public, link share có gid hoặc link publish CSV. Sheet cần các cột: title, content, category, keywords.
                  Khi nội dung thay đổi, bấm Re-index để đồng bộ lại kho kiến thức AI.
                </p>
                <div className="grid gap-2">
                  <Label htmlFor="sheet-url">Link Google Sheet</Label>
                  <Input
                    id="sheet-url"
                    value={sheetUrl}
                    onChange={(event) => setSheetUrl(event.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Danh mục mặc định</Label>
                  <Select value={sheetCategory} onValueChange={setSheetCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Hủy</Button>
                  <Button onClick={handleAddSheet} disabled={!sheetUrl.trim() || sheetLoading}>
                    {sheetLoading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang đồng bộ...</>
                      : <><FileSpreadsheet className="mr-2 h-4 w-4" />Thêm Google Sheet</>}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
        )}
      />

      {fetchError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Không tải được dữ liệu kiến thức</p>
                <p className="text-sm text-muted-foreground">{fetchError}</p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchKnowledge} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Thử lại
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard title="Tổng mục" value={normalizedItems.length} description="nguồn tri thức" icon={Database} />
        <AdminStatCard title="Đang hoạt động" value={normalizedItems.filter((i) => i.isActive).length} description="đang dùng cho chatbot" icon={FileText} color="text-emerald-600" tone="bg-emerald-50" />
        <AdminStatCard title="Thủ công" value={manualCount} description="mục nhập trực tiếp" icon={BookOpen} color="text-amber-600" tone="bg-amber-50" />
        <AdminStatCard title="Từ file" value={fileCount} description="mục nhập từ tài liệu" icon={Upload} color="text-blue-600" tone="bg-blue-50" />
        <AdminStatCard title="Google Sheet" value={sheetCount} description="mục đồng bộ từ sheet" icon={FileSpreadsheet} color="text-green-600" tone="bg-green-50" />
      </div>

      <Card className="soft-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-primary" />
            Test RAG Query
          </CardTitle>
          <CardDescription>Nhập câu hỏi để xem nguồn tri thức nào sẽ được dùng, không gọi LLM.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleTestQuery(); }}
              placeholder="Ví dụ: niềng răng mất bao lâu?"
              className="md:flex-1"
            />
            <Button onClick={handleTestQuery} disabled={testLoading}>
              {testLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Kiểm thử
            </Button>
          </div>

          {testResult && (
            <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="rounded-xl border bg-muted/20 p-3">
                <p className="text-sm font-medium">Nguồn tìm được</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(testResult.sources || []).length === 0 ? (
                    <span className="text-sm text-muted-foreground">Không tìm thấy nguồn phù hợp.</span>
                  ) : (
                    testResult.sources.map((source, index) => (
                      <Badge key={`${source.knowledgeId || source.title || source.source}-${index}`} variant="secondary">
                        {source.title || source.source || source.category}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {(testResult.contexts || []).slice(0, 5).map((context, index) => (
                  <div key={`${context.metadata?.knowledgeId || index}`} className="rounded-xl border p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{context.metadata?.category || "general"}</Badge>
                      <span className="text-sm font-medium">{context.metadata?.title || context.metadata?.source}</span>
                    </div>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{context.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main table */}
      <Card className="soft-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Danh sách kiến thức</CardTitle>
          <CardDescription>
            Dữ liệu sẽ được sử dụng bởi chatbot RAG để trả lời câu hỏi
            {sharedCollection && (
              <span className="ml-2 inline-flex max-w-[260px] align-middle text-xs font-medium text-muted-foreground">
                Bộ sưu tập: <span className="ml-1 truncate" title={sharedCollection}>{sharedCollection}</span>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <AdminToolbar
            className="mb-7"
            contentClassName="!grid gap-3 p-4 sm:!grid sm:p-5 lg:grid-cols-[minmax(260px,1fr)_170px_170px_170px]"
          >
            <AdminSearchBox
              className="min-w-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo tiêu đề, nội dung, từ khóa..."
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Lọc danh mục" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Lọc nguồn" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nguồn</SelectItem>
                <SelectItem value="manual">Nhập thủ công</SelectItem>
                <SelectItem value="file">File upload</SelectItem>
                <SelectItem value="sheet">Google Sheet</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Tạm tắt</SelectItem>
              </SelectContent>
            </Select>
          </AdminToolbar>

          <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
            <Table className="table-fixed">
              <colgroup>
                {!hasSingleCollection && <col style={{ width: "9rem" }} />}
                <col style={{ width: hasSingleCollection ? "54%" : "44%" }} />
                <col style={{ width: "6.75rem" }} />
                <col style={{ width: "10.5rem" }} />
                <col style={{ width: "7.75rem" }} />
                <col style={{ width: "7.25rem" }} />
              </colgroup>
              <TableHeader>
                <TableRow>
                  {!hasSingleCollection && <TableHead className="align-middle px-5">Bộ sưu tập</TableHead>}
                  <TableHead className="align-middle px-5">Nội dung</TableHead>
                  <TableHead className="align-middle px-5">Nguồn</TableHead>
                  <TableHead className="align-middle px-5">Danh mục</TableHead>
                  <TableHead className="align-middle px-5">Trạng thái</TableHead>
                  <TableHead className="align-middle px-5 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={knowledgeTableColSpan} className="px-5 py-12">
                      <div className="flex flex-col items-center justify-center gap-2 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Search className="h-5 w-5" />
                        </div>
                        <p className="font-semibold text-foreground">Không tìm thấy dữ liệu</p>
                        <p className="max-w-sm text-sm text-muted-foreground">
                          Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc để xem thêm kết quả.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedItems.map((item) => {
                  const isFromFile = item.source?.startsWith("file:");
                  const isFromSheet = item.source?.startsWith("sheet:");
                  const titleParts = splitKnowledgeTitle(item.title);
                  return (
                    <TableRow
                      key={item._id}
                      className="cursor-pointer hover:bg-primary/5"
                      onClick={() => setPreviewItem(normalizeKnowledgeItem(item))}
                    >
                      {!hasSingleCollection && (
                      <TableCell className="align-middle px-5 py-4">
                        <Badge
                          variant="secondary"
                          className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs"
                          title={titleParts.collection}
                        >
                          {titleParts.collection}
                        </Badge>
                      </TableCell>
                      )}
                      <TableCell className="min-w-0 align-middle px-5 py-4">
                        <div className="min-w-0 space-y-1.5">
                          <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-bold leading-6 text-foreground" title={titleParts.title}>
                            {titleParts.title}
                          </p>
                          <p className="line-clamp-2 text-sm leading-5 text-muted-foreground" title={item.content}>
                            {item.content}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle px-5 py-4">
                        {isFromFile || isFromSheet
                          ? <Badge variant="secondary" className="gap-1 text-xs"><Upload className="h-3 w-3" />File</Badge>
                          : <Badge variant="outline" className="gap-1 text-xs"><BookOpen className="h-3 w-3" />Thủ công</Badge>}
                      </TableCell>
                      <TableCell className="align-middle px-5 py-4">
                        <Badge variant="outline" className="inline-flex w-fit" title={getCategoryLabel(item.category)}>
                          {getCategoryLabel(item.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-middle px-5 py-4">{getStatusBadge(item)}</TableCell>
                      <TableCell className="align-middle px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            title="Xem nội dung"
                            onClick={(event) => {
                              event.stopPropagation();
                              setPreviewItem(normalizeKnowledgeItem(item));
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!isFromFile && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9"
                              title="Chỉnh sửa"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditDialog(item);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            title="Xóa"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteItem(item._id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground order-2 sm:order-1">
              Đang hiển thị <strong>{pageStart}-{pageEnd}</strong> trong tổng số <strong>{filteredItems.length}</strong> mục
            </span>
            
            {totalPages > 1 && (
              <div className="order-1 sm:order-2">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={safeCurrentPage === 1}
                        className={safeCurrentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      // Logic hiển thị số trang (1, ..., current-1, current, current+1, ..., last)
                      if (
                        pageNum === 1 || 
                        pageNum === totalPages || 
                        (pageNum >= safeCurrentPage - 1 && pageNum <= safeCurrentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={safeCurrentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      
                      if (
                        (pageNum === 2 && safeCurrentPage > 3) || 
                        (pageNum === totalPages - 1 && safeCurrentPage < totalPages - 2)
                      ) {
                        return (
                          <PaginationItem key={pageNum}>
                            <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">...</span>
                          </PaginationItem>
                        );
                      }
                      
                      return null;
                    })}

                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={safeCurrentPage === totalPages}
                        className={safeCurrentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
          <div className="hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Nguồn</TableHead>
                  <TableHead>Danh mục</TableHead>
                  <TableHead>Từ khóa</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Không tìm thấy mục nào</TableCell></TableRow>
                ) : filteredItems.map((item) => {
                  const isFromFile = item.source?.startsWith("file:");
                  return (
                    <TableRow key={item._id}>
                      <TableCell>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{item.content}</p>
                      </TableCell>
                      <TableCell>
                        {isFromFile
                          ? <Badge variant="secondary" className="text-xs gap-1"><Upload className="h-3 w-3" />File</Badge>
                          : <Badge variant="outline"   className="text-xs gap-1"><BookOpen className="h-3 w-3" />Thủ công</Badge>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{getCategoryLabel(item.category)}</Badge></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.keywords.slice(0, 3).map((k, i) => <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>)}
                          {item.keywords.length > 3 && <Badge variant="secondary" className="text-xs">+{item.keywords.length - 3}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`cursor-pointer ${item.isActive ? 'badge-status-completed' : 'badge-status-cancelled'}`}
                          onClick={() => toggleItemStatus(item)}
                        >
                          {item.isActive ? "Hoạt động" : "Tạm tắt"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setPreviewItem(normalizeKnowledgeItem(item))}><Eye className="h-4 w-4" /></Button>
                          {!isFromFile && (
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}><Pencil className="h-4 w-4" /></Button>
                          )}
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteItem(item._id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded documents status card */}
      {normalizedDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />Nguồn dữ liệu đã nạp ({normalizedDocuments.length})
            </CardTitle>
            <CardDescription>Trạng thái xử lý file và Google Sheet vào knowledge base</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-lg shadow-cyan-950/6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4">Nguồn dữ liệu</TableHead>
                    <TableHead className="px-4">Trạng thái</TableHead>
                    <TableHead className="px-4">Mục kiến thức</TableHead>
                    {hasDocumentFileSize && <TableHead className="px-4">Kích thước</TableHead>}
                    {hasDocumentUploader && <TableHead className="px-4">Người upload</TableHead>}
                    <TableHead className="px-4">Ngày upload</TableHead>
                    <TableHead className="px-4 text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {normalizedDocuments.map((doc) => {
                    const s = STATUS_CONFIG[doc.status] || STATUS_CONFIG.pending;
                    const StatusIcon = s.icon;
                    return (
                      <TableRow key={doc._id}>
                        <TableCell className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <DataSourceIcon doc={doc} />
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-medium">{doc.fileName}</span>
                              {doc.sourceType === "google_sheet" && (
                                <span className="block max-w-[320px] truncate text-xs text-muted-foreground">{doc.sourceUrl}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-sm">
                              <StatusIcon className={`h-4 w-4 ${s.cls}`} />
                              <span>{s.label}</span>
                            </div>
                            {doc.status === "failed" && doc.errorMessage && (
                              <span className="text-xs text-red-500 max-w-[200px] truncate" title={doc.errorMessage}>
                                {doc.errorMessage}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4">
                          {doc.chunksCreated > 0
                            ? <Badge variant="secondary">{doc.chunksCreated} mục</Badge>
                            : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        {hasDocumentFileSize && (
                          <TableCell className="px-4 py-4 text-sm text-muted-foreground">
                            {formatFileSize(doc.fileSize)}
                          </TableCell>
                        )}
                        {hasDocumentUploader && (
                          <TableCell className="px-4 py-4 text-sm text-muted-foreground">
                            {getUploaderLabel(doc)}
                          </TableCell>
                        )}
                        <TableCell className="px-4 py-4 text-sm text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            title="Đồng bộ lại từ nguồn"
                            disabled={doc.status === "processing"}
                            onClick={() => handleReindexDoc(doc._id)}
                          >
                            <RefreshCw className={`h-4 w-4 ${doc.status === "processing" ? "animate-spin" : ""}`} />
                          </Button>
                          <Button variant="ghost" size="icon"
                            className="h-9 w-9 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => handleDeleteDoc(doc._id, doc.fileName)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="modal-scroll sm:max-w-[720px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{previewItem?.title || "Nội dung knowledge"}</DialogTitle>
            <DialogDescription>
              {previewItem?.source?.startsWith("file:")
                ? "Nguồn file upload"
                : previewItem?.source?.startsWith("sheet:")
                  ? "Nguồn Google Sheet"
                  : "Nguồn nhập thủ công"} · {getCategoryLabel(previewItem?.category)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {(previewItem?.keywords || []).map((keyword, index) => (
                <Badge key={`${keyword}-${index}`} variant="secondary">{keyword}</Badge>
              ))}
            </div>
            <div className="whitespace-pre-wrap rounded-xl border bg-muted/20 p-4 text-sm leading-6">
              {previewItem?.content}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa mục kiến thức</DialogTitle>
            <DialogDescription>Cập nhật nội dung kiến thức</DialogDescription>
          </DialogHeader>
          <KnowledgeFormFields idPrefix="edit-" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Hủy</Button>
            <Button onClick={handleEditItem}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
