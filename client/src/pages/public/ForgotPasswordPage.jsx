

import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import axiosInstance from "@/api/httpClient"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
    const [searchParams] = useSearchParams()
    const initialEmail = searchParams.get("email") || ""
    const [email, setEmail] = useState(initialEmail)
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [error, setError] = useState("")

    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return regex.test(email)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")

        if (!email.trim()) {
            setError("Vui lòng nhập địa chỉ email")
            return
        }

        if (!validateEmail(email)) {
            setError("Địa chỉ email không hợp lệ")
            return
        }

        setIsLoading(true)

        try {
            await axiosInstance.post("/auth/forgot-password", { email })
            setIsSubmitted(true)
            toast.success("Đã gửi email hướng dẫn đặt lại mật khẩu")
        } catch (err) {
            const serverMessage = err.response?.data?.message || err.message || ""
            const errorMessage = /gửi email|send email|mail|smtp|MAIL_USER|MAIL_PASS/i.test(serverMessage)
                ? "Không thể gửi email đặt lại mật khẩu. Vui lòng liên hệ quản trị viên hoặc thử lại sau."
                : serverMessage || "Có lỗi xảy ra, vui lòng thử lại"
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

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
                    {!isSubmitted ? (
                        <Card className="border-border shadow-lg">
                            <CardHeader className="text-center pb-2">
                                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Mail className="w-8 h-8 text-primary" />
                                </div>
                                <CardTitle className="text-2xl font-bold text-foreground">
                                    Quên mật khẩu?
                                </CardTitle>
                                <CardDescription className="text-muted-foreground mt-2">
                                    Đừng lo lắng! Nhập địa chỉ email đã đăng ký và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu cho bạn.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2 text-left">
                                        <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Địa chỉ email</label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="example@email.com"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value)
                                                setError("")
                                            }}
                                            className="h-12"
                                            disabled={isLoading}
                                        />
                                        {error && <p className="text-[0.8rem] font-medium text-destructive">{error}</p>}
                                        <p className="text-[0.8rem] text-muted-foreground">
                                            Nhập email bạn đã sử dụng để đăng ký tài khoản DentaCare
                                        </p>
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
                                            "Gửi hướng dẫn đặt lại"
                                        )}
                                    </Button>
                                </form>

                                <div className="mt-6 text-center">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Quay lại đăng nhập
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-border shadow-lg">
                            <CardContent className="pt-8 pb-8 text-center">
                                <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground mb-3">
                                    Kiểm tra hộp thư của bạn
                                </h2>
                                <p className="text-muted-foreground mb-2">
                                    Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến:
                                </p>
                                <p className="font-semibold text-foreground mb-6">{email}</p>
                                <p className="text-sm text-muted-foreground mb-8">
                                    Nếu không thấy email, vui lòng kiểm tra thư mục spam hoặc thử lại sau vài phút.
                                </p>

                                <div className="space-y-3">
                                    <Button
                                        variant="outline"
                                        className="w-full h-12"
                                        onClick={() => {
                                            setIsSubmitted(false)
                                            setEmail("")
                                        }}
                                    >
                                        Gửi lại email
                                    </Button>
                                    <Link to="/login" className="block">
                                        <Button className="w-full h-12">
                                            Quay lại đăng nhập
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Help Section */}
                    {/* <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Cần hỗ trợ?{" "}
              <Link href="/lien-he" className="text-primary hover:underline font-medium">
                Liên hệ với chúng tôi
              </Link>
            </p>
          </div> */}
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
