import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/api/httpClient";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "@/components/common/UserAvatar";

/**
 * AvatarUpload — component tái sử dụng để upload/thay đổi avatar
 *
 * Props:
 *   - size: "sm" | "md" | "lg"  (default "md")
 *   - onSuccess: (newAvatarUrl: string) => void  — callback sau khi upload thành công
 */
export default function AvatarUpload({ size = "md", onSuccess }) {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null); // local blob URL for instant preview

  // ── Kích thước avatar theo prop size ─────────────────────────────
  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  };
  const avatarSize = sizeClasses[size] || sizeClasses.md;

  // ── Avatar URL hiện tại (ưu tiên preview local, rồi user.avatar, rồi fallback chữ cái) ──
  const currentAvatar = preview;

  // ── Xử lý khi chọn file ──────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate phía client trước
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Chỉ chấp nhận file ảnh (jpg, png, gif, webp)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước file không được vượt quá 5MB");
      return;
    }

    // Hiển thị preview ngay lập tức (optimistic UI)
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Upload lên server
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await axiosInstance.post("/users/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newAvatarUrl = res.data.data?.avatar;

      // Cập nhật user trong AuthContext để toàn app thấy avatar mới ngay
      if (res.data.data?.user) {
        setUser(res.data.data.user);
      }
      setPreview(null);

      toast.success("Cập nhật ảnh đại diện thành công!");
      onSuccess?.(newAvatarUrl);
    } catch (error) {
      // Rollback preview nếu lỗi
      setPreview(null);
      const msg = error.response?.data?.message || "Tải ảnh lên thất bại";
      toast.error(msg);
    } finally {
      setUploading(false);
      // Giải phóng object URL tạm sau khi UI đã chuyển sang URL server hoặc rollback.
      URL.revokeObjectURL(objectUrl);
      // Reset input để có thể chọn lại cùng file
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearPreview = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="relative inline-block group">
      {/* Avatar image */}
      {currentAvatar ? (
        <img
          src={currentAvatar}
          alt={user?.fullName || "Avatar"}
          className={`${avatarSize} rounded-full object-cover bg-muted ring-2 ring-border transition-all duration-200 group-hover:ring-primary`}
        />
      ) : (
        <UserAvatar
          avatar={user?.avatar}
          name={user?.fullName}
          email={user?.email}
          cacheKey={user?.updatedAt}
          size={size === "lg" ? "2xl" : size === "sm" ? "lg" : "xl"}
          className="bg-muted transition-all duration-200 group-hover:ring-primary"
        />
      )}

      {/* Upload overlay — hiện khi hover */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
        title="Thay đổi ảnh đại diện"
        aria-label="Thay đổi ảnh đại diện"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        ) : (
          <>
            <Camera className="h-5 w-5 text-white" />
            <span className="text-white text-[10px] mt-1 font-medium">Thay ảnh</span>
          </>
        )}
      </button>

      {/* Nút xóa preview (chỉ hiện khi đang preview local) */}
      {preview && !uploading && (
        <button
          type="button"
          onClick={handleClearPreview}
          className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:scale-110 transition-transform"
          title="Hủy"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Uploading badge */}
      {uploading && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground whitespace-nowrap shadow">
          Đang tải...
        </span>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileChange}
        id="avatar-upload-input"
      />
    </div>
  );
}
