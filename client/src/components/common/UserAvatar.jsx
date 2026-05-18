import { cn } from "@/lib/utils";
import { getAvatarUrl } from "@/utils/getMediaUrl";
import { useEffect, useState } from "react";

const sizeClasses = {
  xs: "h-8 w-8 text-xs",
  sm: "h-9 w-9 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
  "2xl": "h-32 w-32 text-4xl",
};

export const getAvatarInitial = (name, email) => {
  const source = String(name || email || "U").trim();
  const cleaned = source.replace(/^BS\.\s*/i, "").trim();
  return (cleaned[0] || source[0] || "U").toUpperCase();
};

export default function UserAvatar({
  avatar,
  name,
  email,
  size = "md",
  cacheKey,
  className,
  fallbackClassName,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = getAvatarUrl(avatar, email || name, cacheKey);
  const classes = cn(
    "shrink-0 rounded-full object-cover ring-2 ring-border",
    sizeClasses[size] || sizeClasses.md,
    className
  );

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  if (avatarUrl && !imageFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name || email || "Avatar"}
        className={classes}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        classes,
        "flex items-center justify-center bg-primary/10 font-bold text-primary",
        fallbackClassName
      )}
      aria-label={name || email || "Avatar"}
    >
      {getAvatarInitial(name, email)}
    </div>
  );
}
