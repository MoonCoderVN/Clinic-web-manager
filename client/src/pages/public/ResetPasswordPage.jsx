import { useState, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Lock, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import axiosInstance from "@/api/httpClient"
import { toast } from "sonner"

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get("token")
    const navigate = useNavigate()

    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (!token) {
            toast.error("Liên kết đặt lại mật khẩu không hợp lệ")
            navigate("/forgot-password")
        }
    }, [token, navigate])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")

        if (!newPassword || !confirmPassword) {
            setError("Vui lòng nhập đầy đủ thông tin")
            return
        }

        if (newPassword !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp")
            return
        }

        if (newPassword.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự")
            return
        }

        setIsLoading(true)

        try {
            await axiosInstance.post("/auth/reset-password", { 
                token, 
                newPassword 
            })
            setIsSuccess(true)
            toast.success("Đặt lại mật khẩu thành công")
            
            // Redirect after 3 seconds
            setTimeout(() => {
                navigate("/login")
            }, 3000)
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "Có lỗi xảy ra, vui lòng thử lại"
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    if (!token) return null

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="container mx-auto px-4 py-4">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="w-6 h-6 text-primary-foreground"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M12 2C8.5 2 6 4.5 6 8c0 2.5 1.5 4.5 3 6l3 4 3-4c1.5-1.5 3-3.5 3-6 0-3.5-2.5-6-6-6z" />
                                <circle cx="12" cy="8" r="2" fill="currentColor" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-foreground">DentaCare</span>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">
                    {!isSuccess ? (
                        <Card className="border-border shadow-lg">
                            <CardHeader className="text-center pb-2">
                                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Lock className="w-8 h-8 text-primary" />
                                </div>
                                <CardTitle className="text-2xl font-bold text-foreground">
                                    Đặt mật khẩu mới
                                </CardTitle>
                                <CardDescription className="text-muted-foreground mt-2">
                                    Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2 text-left relative">
                                            <label htmlFor="newPassword" className="text-sm font-medium leading-none">Mật khẩu mới</label>
                                            <div className="relative">
                                                <Input
                                                    id="newPassword"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={newPassword}
                                                    onChange={(e) => {
                                                        setNewPassword(e.target.value)
                                                        setError("")
                                                    }}
                                                    className="h-12 pr-10"
                                                    disabled={isLoading}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-left relative">
                                            <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">Xác nhận mật khẩu</label>
                                            <div className="relative">
                                                <Input
                                                    id="confirmPassword"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={confirmPassword}
                                                    onChange={(e) => {
                                                        setConfirmPassword(e.target.value)
                                                        setError("")
                                                    }}
                                                    className="h-12 pr-10"
                                                    disabled={isLoading}
                                                />
                                            </div>
                                            {error && <p className="text-[0.8rem] font-medium text-destructive mt-1">{error}</p>}
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-12 text-base font-semibold"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                Đang xử lý...
                                            </>
                                        ) : (
                                            "Xác nhận đặt lại"
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-border shadow-lg">
                            <CardContent className="pt-8 pb-8 text-center">
                                <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground mb-3">
                                    Đặt lại mật khẩu thành công!
                                </h2>
                                <p className="text-muted-foreground mb-6">
                                    Mật khẩu của bạn đã được cập nhật. Bạn sẽ được chuyển hướng về trang đăng nhập trong giây lát...
                                </p>

                                <Link to="/login" className="block">
                                    <Button className="w-full h-12">
                                        Đến trang đăng nhập ngay
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border bg-card py-6">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        © 2024 DentaCare. Tất cả quyền được bảo lưu.
                    </p>
                </div>
            </footer>
        </div>
    )
}
