import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";

const UnauthorizedPage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4 text-center">
            <h1 className="text-6xl font-black text-slate-900">403</h1>
            <h2 className="text-2xl font-bold mt-4">Truy cập bị từ chối</h2>
            <p className="text-slate-500 mt-2 max-w-md">
                Bạn không có quyền truy cập vào trang này. Nếu bạn tin rằng đây là một sự nhầm lẫn, vui lòng liên hệ với quản trị viên.
            </p>
            <Button className="mt-8" asChild>
                <Link to="/">Quay lại trang chủ</Link>
            </Button>
        </div>
    );
};

export default UnauthorizedPage;
