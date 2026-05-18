import React from "react";
import { AlertCircle } from "lucide-react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Error caught by boundary:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-red-50">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                            <h1 className="text-xl font-bold text-red-600">Có lỗi xảy ra</h1>
                        </div>
                        <p className="text-gray-600 mb-4">
                            Ứng dụng gặp sự cố. Vui lòng tải lại trang hoặc liên hệ hỗ trợ.
                        </p>
                        {process.env.NODE_ENV !== "production" && (
                            <details className="mb-4">
                                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                                    Chi tiết lỗi
                                </summary>
                                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                                    {this.state.error?.toString()}
                                </pre>
                            </details>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                        >
                            Tải lại trang
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
