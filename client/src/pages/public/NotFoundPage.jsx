import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 text-center">
      {/* 404 Illustration / Text */}
      <div className="space-y-4">
        <h1 className="text-8xl font-extrabold text-primary tracking-tighter">404</h1>
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Không tìm thấy trang
        </h2>
        <p className="max-w-[600px] text-muted-foreground text-lg mx-auto">
          Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
          Vui lòng kiểm tra lại đường dẫn hoặc quay về trang chủ.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Button asChild size="lg">
          <Link to="/">
            <Home className="mr-2 h-5 w-5" />
            Về trang chủ
          </Link>
        </Button>
        <Button variant="outline" size="lg" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-5 w-5" />
          Quay lại trang trước
        </Button>
      </div>

      {/* Decorative background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 opacity-10 blur-3xl pointer-events-none">
          <div className="aspect-[1/1] w-[600px] rounded-full bg-primary/30"></div>
        </div>
      </div>
    </div>
  );
}
