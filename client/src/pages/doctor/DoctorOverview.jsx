import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  Loader2,
  Stethoscope,
  Users,
} from "lucide-react";
import axiosInstance from "@/api/httpClient";
import { toast } from "sonner";
import { usePageFocus } from "@/hooks/usePageFocus";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";
import { isAppointmentOverdue } from "@/utils/appointmentStatus";
import { getStatusBadge } from "@/utils/statusBadge";
import NotificationDropdown from "@/components/common/NotificationDropdown";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      })
    : "Chưa có ngày";

const getAppointmentDateTime = (appointment) => {
  const date = appointment?.appointmentDate || appointment?.date;
  const time = appointment?.startTime || appointment?.timeSlot || "";
  if (!date) return null;

  const [hours = 0, minutes = 0] = String(time).split(":").map(Number);
  const value = new Date(date);
  value.setHours(hours || 0, minutes || 0, 0, 0);
  return value;
};

const getPatientName = (appointment) =>
  appointment?.patientId?.fullName || appointment?.patientName || "Bệnh nhân";

const getServiceName = (appointment) =>
  appointment?.serviceId?.name || appointment?.serviceName || "Dịch vụ nha khoa";

export default function DoctorOverview() {
  const { user } = useAuth();
  const refreshKey = useRealtimeRefresh(["appointment:changed", "exam-result:changed"]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axiosInstance.get("/appointments");
      setAppointments(res.data.data || []);
    } catch (error) {
      console.error("Failed to fetch appointments:", error);
      if (!silent) toast.error("Không thể tải dữ liệu dashboard");
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

  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  const tomorrow = useMemo(() => {
    const value = new Date(today);
    value.setDate(value.getDate() + 1);
    return value;
  }, [today]);

  const activeAppointments = appointments.filter((item) => !["cancelled", "completed"].includes(item.status));
  const todayAppointments = appointments.filter((item) => {
    const date = new Date(item.appointmentDate || item.date || 0);
    return date >= today && date < tomorrow && item.status !== "cancelled";
  });

  const nextAppointment = [...activeAppointments]
    .map((item) => ({ item, dateTime: getAppointmentDateTime(item) }))
    .filter(({ dateTime }) => dateTime && dateTime >= new Date())
    .sort((a, b) => a.dateTime - b.dateTime)[0]?.item;

  const stats = [
    {
      title: "Lịch hôm nay",
      value: todayAppointments.length,
      description: "ca khám trong ngày",
      icon: Clock,
      tone: "text-primary",
    },
    {
      title: "Chờ khám",
      value: appointments.filter((item) => ["pending", "confirmed", "rescheduled"].includes(item.status)).length,
      description: "cần theo dõi",
      icon: Calendar,
      tone: "text-yellow-600",
    },
    {
      title: "Đang khám",
      value: appointments.filter((item) => item.status === "in_progress").length,
      description: "đang xử lý",
      icon: Stethoscope,
      tone: "text-indigo-600",
    },
    {
      title: "Hoàn thành",
      value: appointments.filter((item) => item.status === "completed").length,
      description: "đã có kết quả",
      icon: CheckCircle,
      tone: "text-green-600",
    },
    {
      title: "Bệnh nhân",
      value: new Set(
        appointments
          .filter((item) => item.patientId?._id || item.patientId)
          .map((item) => (item.patientId?._id || item.patientId).toString())
      ).size,
      description: "đã từng khám",
      icon: Users,
      tone: "text-slate-700",
    },
  ];

  const recentAppointments = [...appointments]
    .sort((a, b) => {
      const dateA = getAppointmentDateTime(a) || new Date(a.appointmentDate || a.date || 0);
      const dateB = getAppointmentDateTime(b) || new Date(b.appointmentDate || b.date || 0);
      return dateB - dateA;
    })
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 rounded-2xl border skeleton" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="soft-card space-y-3 p-5">
            <div className="skeleton h-6 w-40" />
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
          <div className="soft-card space-y-3 p-5">
            <div className="skeleton h-6 w-32" />
            {[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="page-heading">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Không gian làm việc</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Xin chào, BS. {user?.fullName || "DentaCare"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Theo dõi ca khám trong ngày, xử lý lịch hẹn và cập nhật kết quả khám.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationDropdown />
        </div>
      </div>

      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/10 via-background to-sky-50 shadow-sm">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_360px] lg:p-8">
          <div className="min-w-0">
            <Badge variant="secondary" className="mb-3 w-fit">Trung tâm thao tác</Badge>
            <p className="max-w-2xl text-muted-foreground">
              Xử lý lịch hẹn, theo dõi bệnh nhân và cập nhật kết quả khám từ một màn hình làm việc rõ ràng.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/doctor/schedule/today">
                  <Calendar className="mr-2 h-4 w-4" />
                  Xem lịch hôm nay
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/doctor/results">Nhập kết quả khám</Link>
              </Button>
            </div>
          </div>

          {nextAppointment ? (
            <Link
              to="/doctor/schedule/today"
              aria-label="Xem lịch hẹn"
              className="block cursor-pointer rounded-2xl border bg-background/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <p className="text-sm font-medium text-muted-foreground">Lịch khám tiếp theo</p>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-lg font-semibold">{getPatientName(nextAppointment)}</p>
                  <p className="text-sm text-muted-foreground">{getServiceName(nextAppointment)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline">{formatDate(nextAppointment.appointmentDate || nextAppointment.date)}</Badge>
                  <Badge variant="outline">{nextAppointment.startTime || nextAppointment.timeSlot || "Chưa có giờ"}</Badge>
                  {getStatusBadge(nextAppointment)}
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border bg-background/90 p-4 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">Lịch khám tiếp theo</p>
              <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Chưa có lịch sắp tới cần xử lý.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((item) => {
          const Icon = item.icon;
          const accentMap = {
            "text-primary":    "bg-primary/10",
            "text-yellow-600": "bg-yellow-50",
            "text-indigo-600": "bg-indigo-50",
            "text-green-600":  "bg-green-50",
            "text-slate-700":  "bg-slate-100",
          };
          const bg = accentMap[item.tone] || "bg-muted";
          return (
            <Card key={item.title} className="stat-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-5 w-5 ${item.tone}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{item.title}</p>
                  <p className={`text-2xl font-bold tabular-nums ${item.tone}`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card className="soft-card">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle>Lịch khám gần đây</CardTitle>
                <CardDescription>Các cuộc hẹn cần theo dõi và xử lý</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/doctor/schedule/today">Xem tất cả</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentAppointments.length > 0 ? (
              <div className="space-y-3">
                {recentAppointments.map((appointment) => (
                  <div
                    key={appointment._id}
                    className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-white p-4 transition-colors hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">{getPatientName(appointment)}</p>
                      <p className="text-sm text-muted-foreground">{getServiceName(appointment)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(appointment.appointmentDate || appointment.date)}
                        {(appointment.startTime || appointment.timeSlot) && ` lúc ${appointment.startTime || appointment.timeSlot}`}
                      </p>
                    </div>
                    {getStatusBadge(appointment)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
                <AlertCircle className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Chưa có lịch hẹn nào</p>
                <p className="mt-1 text-sm text-muted-foreground">Lịch mới sẽ xuất hiện tại đây khi bệnh nhân đặt khám.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="soft-card">
          <CardHeader>
            <CardTitle>Truy cập nhanh</CardTitle>
            <CardDescription>Các luồng bác sĩ dùng thường xuyên</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                to: "/doctor/schedule/today",
                title: "Lịch khám hôm nay",
                desc: "Xem lịch hẹn, ca làm việc và cập nhật trạng thái",
                icon: Calendar,
              },
              {
                to: "/doctor/patients",
                title: "Bệnh nhân của tôi",
                desc: "Tra cứu hồ sơ, lịch hẹn và lịch sử khám",
                icon: Users,
              },
              {
                to: "/doctor/results",
                title: "Kết quả khám",
                desc: "Nhập chẩn đoán, điều trị và lịch tái khám",
                icon: ClipboardList,
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.to} to={action.to} className="interactive-row flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
