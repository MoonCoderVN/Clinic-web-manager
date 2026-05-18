import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  Loader2,
  CalendarClock,
  ClipboardList,
  History,
} from "lucide-react";
import NotificationDropdown from "@/components/common/NotificationDropdown";
import axiosInstance from "@/api/httpClient";
import { toast } from "sonner";
import { usePageFocus } from "@/hooks/usePageFocus";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";
import { getAppointmentDateTime, isAppointmentOverdue } from "@/utils/appointmentStatus";
import { getStatusBadge } from "@/utils/statusBadge";
import { formatDateMedium } from "@/utils/formatDate";

const normalizeAppointments = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.appointments)) return payload.appointments;
  if (Array.isArray(payload?.data?.appointments)) return payload.data.appointments;
  return [];
};

const normalizeExamResults = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data?.records)) return payload.data.records;
  return [];
};

export default function PatientOverview() {
  const { user } = useAuth();
  const refreshKey = useRealtimeRefresh(["appointment:changed", "exam-result:changed"]);
  const [appointments, setAppointments] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [apptResult, historyResult] = await Promise.allSettled([
        axiosInstance.get("/appointments"),
        axiosInstance.get("/patients/me/exam-results"),
      ]);

      if (apptResult.status === "fulfilled") {
        setAppointments(normalizeAppointments(apptResult.value.data));
      } else {
        console.error("Failed to fetch patient appointments:", apptResult.reason);
        setAppointments([]);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const historyRecords =
        historyResult.status === "fulfilled"
          ? normalizeExamResults(historyResult.value.data)
          : [];

      if (historyResult.status === "rejected") {
        console.error("Failed to fetch patient exam results:", historyResult.reason);
      }

      const reminders = historyRecords
        .filter((record) => record.nextDate && new Date(record.nextDate) >= today)
        .sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));
      setUpcomingReminders(reminders);

      if ((apptResult.status === "rejected" || historyResult.status === "rejected") && !silent) {
        toast.error("Không thể tải dữ liệu tổng quan");
      }
    } catch (error) {
      console.error("Failed to fetch patient dashboard data:", error);
      if (!silent) toast.error("Không thể tải dữ liệu tổng quan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60_000);
    return () => clearInterval(interval);
  }, [fetchData, refreshKey]);

  usePageFocus(useCallback(() => fetchData(true), [fetchData]));

  const activeAppointments = useMemo(
    () => appointments.filter((item) => ["pending", "confirmed", "rescheduled"].includes(item.status) && !isAppointmentOverdue(item)),
    [appointments]
  );

  const nextAppointment = useMemo(() => {
    return [...activeAppointments]
      .map((item) => ({ item, dateTime: getAppointmentDateTime(item) }))
      .filter(({ dateTime }) => dateTime && dateTime >= new Date())
      .sort((a, b) => a.dateTime - b.dateTime)[0]?.item;
  }, [activeAppointments]);

  const stats = [
    {
      label: "Sắp tới",
      value: activeAppointments.length,
      note: "lịch cần theo dõi",
      icon: Clock,
      cls: "text-blue-600 bg-blue-50",
    },
    {
      label: "Chờ xác nhận",
      value: appointments.filter((item) => item.status === "pending" && !isAppointmentOverdue(item)).length,
      note: "đang chờ phòng khám",
      icon: CalendarClock,
      cls: "text-amber-600 bg-amber-50",
    },
    {
      label: "Đã khám",
      value: appointments.filter((item) => item.status === "completed").length,
      note: "lịch đã hoàn thành",
      icon: CheckCircle,
      cls: "text-green-600 bg-green-50",
    },
    {
      label: "Tái khám",
      value: upcomingReminders.length,
      note: "lời nhắc từ bác sĩ",
      icon: History,
      cls: "text-purple-600 bg-purple-50",
    },
  ];

  const recentAppointments = [...appointments]
    .sort((a, b) => {
      const dateA = getAppointmentDateTime(a) || new Date(a.createdAt || 0);
      const dateB = getAppointmentDateTime(b) || new Date(b.createdAt || 0);
      return dateB - dateA;
    })
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-heading">
          <div className="space-y-2">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-8 w-56" />
            <div className="skeleton h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-9 w-9 rounded-xl" />
            <div className="skeleton h-9 w-28 rounded-full" />
          </div>
        </div>
        <div className="skeleton h-48 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="soft-card flex items-center gap-4 p-5">
              <div className="skeleton h-11 w-11 rounded-xl" />
              <div className="space-y-2">
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-7 w-10" />
                <div className="skeleton h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="page-heading">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Xin chào, {user?.fullName || "bạn"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Theo dõi lịch khám, tái khám và hồ sơ chăm sóc răng miệng của bạn.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationDropdown />
          <Button asChild>
            <Link to="/patient/book">
              <Calendar className="mr-2 h-4 w-4" />
              Đặt lịch
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Hero card ── */}
      <Card className="dash-hero overflow-hidden">
        <CardContent className="grid gap-6 p-5 lg:grid-cols-[1.5fr_1fr] lg:p-6">
          <div className="space-y-4">
            <span className="badge-status-confirmed">Chăm sóc chủ động</span>
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {nextAppointment ? "Lịch khám gần nhất của bạn" : "Bạn chưa có lịch khám sắp tới"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {nextAppointment
                  ? "Hãy kiểm tra thời gian, bác sĩ và dịch vụ để chuẩn bị trước khi đến phòng khám."
                  : "Đặt lịch mới để được tư vấn và chăm sóc răng miệng đúng thời điểm."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/patient/book">
                  Đặt lịch mới
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/patient/appointments">Đổi lịch hẹn</Link>
              </Button>
            </div>
          </div>

          {nextAppointment ? (
            <Link
              to="/patient/appointments"
              aria-label="Xem lịch hẹn"
              className="block cursor-pointer rounded-xl border bg-white/80 p-4 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Dịch vụ</p>
                    <p className="font-semibold">{nextAppointment.serviceId?.name || "Dịch vụ nha khoa"}</p>
                  </div>
                  {getStatusBadge(nextAppointment)}
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Thời gian</p>
                    <p className="font-medium">{formatDateMedium(nextAppointment.appointmentDate || nextAppointment.date)}</p>
                    <p className="text-primary text-xs font-medium">{nextAppointment.startTime || nextAppointment.timeSlot || "Chưa có giờ"}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Bác sĩ</p>
                    <p className="font-medium text-sm">
                      BS. {nextAppointment.doctorId?.userId?.fullName || nextAppointment.doctorId?.name || "Đang cập nhật"}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-xl border bg-white/80 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex h-full min-h-36 flex-col items-center justify-center text-center">
                <CalendarClock className="mb-3 h-10 w-10 text-primary" />
                <p className="font-medium">Sẵn sàng đặt lịch mới</p>
                <p className="mt-1 text-sm text-muted-foreground">Chọn dịch vụ, thời gian và bác sĩ phù hợp với bạn.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label} className="soft-card">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.cls}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.note}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="soft-card">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Lịch hẹn gần đây</CardTitle>
                <CardDescription>Các lịch khám mới nhất trong tài khoản của bạn</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/patient/appointments">Xem tất cả</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentAppointments.length > 0 ? (
              <div className="space-y-3">
                {recentAppointments.map((appt) => {
                  const serviceName = appt.serviceId?.name || "Dịch vụ nha khoa";
                  const doctorName = appt.doctorId?.userId?.fullName || appt.doctorId?.name || "Đang cập nhật";
                  const apptDate = appt.appointmentDate || appt.date;
                  const apptTime = appt.startTime || appt.timeSlot || "";
                  return (
                    <Link
                      key={appt._id}
                      to="/patient/appointments"
                      className="flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{serviceName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          BS. {doctorName} · {formatDateMedium(apptDate)}
                          {apptTime && ` lúc ${apptTime}`}
                        </p>
                      </div>
                      {getStatusBadge(appt)}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
                <AlertCircle className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Chưa có lịch hẹn nào</p>
                <p className="mt-1 text-sm text-muted-foreground">Lịch hẹn của bạn sẽ xuất hiện tại đây sau khi đặt.</p>
                <Button className="mt-4" asChild>
                  <Link to="/patient/book">Đặt lịch ngay</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {upcomingReminders.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-amber-800">
                  <CalendarClock className="h-5 w-5" />
                  Tái khám sắp tới
                </CardTitle>
                <CardDescription className="text-amber-700">
                  Bác sĩ đã đề nghị lịch tái khám cho bạn.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingReminders.slice(0, 3).map((record) => {
                  const daysLeft = Math.ceil((new Date(record.nextDate) - new Date()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={record._id} className="rounded-xl border bg-background p-3">
                      <p className="line-clamp-1 text-sm font-medium">{record.diagnosis}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{formatDateMedium(record.nextDate)}</span>
                        <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-800">
                          {daysLeft <= 0 ? "Hôm nay" : `Còn ${daysLeft} ngày`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                <Button className="w-full" size="sm" asChild>
                  <Link to="/patient/book">Đặt lịch tái khám</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="soft-card">
            <CardHeader>
              <CardTitle>Truy cập nhanh</CardTitle>
              <CardDescription>Các thao tác thường dùng</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { to: "/patient/book", title: "Đặt lịch hẹn", desc: "Chọn dịch vụ và thời gian khám", icon: Calendar },
                { to: "/patient/appointments", title: "Quản lý lịch hẹn", desc: "Xem, đổi lịch hoặc hủy lịch", icon: ClipboardList },
                { to: "/patient/history", title: "Lịch sử khám", desc: "Xem kết quả khám và đơn thuốc", icon: History },
                { to: "/patient/chat", title: "Tư vấn AI", desc: "Hỏi nhanh về chăm sóc răng miệng", icon: MessageSquare },
              ].map((item) => (
                <Link key={item.to} to={item.to} className="interactive-row flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
