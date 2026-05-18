import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Calendar,
    Users,
    Stethoscope,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    AlertCircle,
    BarChart3,
    Database,
    Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import axiosInstance from "@/api/httpClient";
import { toast } from "sonner";
import { usePageFocus } from "@/hooks/usePageFocus";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";
import { isAppointmentOverdue } from "@/utils/appointmentStatus";
import { getStatusBadge } from "@/utils/statusBadge";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import NotificationDropdown from "@/components/common/NotificationDropdown";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

const normalizeAppointments = (responseData) => {
    if (Array.isArray(responseData?.data)) return responseData.data;
    if (Array.isArray(responseData?.appointments)) return responseData.appointments;
    if (Array.isArray(responseData)) return responseData;
    return [];
};

const AdminOverview = () => {
    const refreshKey = useRealtimeRefresh([
        "appointment:changed",
        "service:changed",
        "doctor:changed",
        "patient:changed",
        "user:changed",
        "exam-result:changed",
    ]);
    const [stats, setStats] = useState(null);
    const [recentAppointments, setRecentAppointments] = useState([]);
    const [overdueCount, setOverdueCount] = useState(0);
    const [weeklyTrend, setWeeklyTrend] = useState([]);
    const [topDoctors, setTopDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const now = new Date();
            const [statsRes, apptsRes, reportRes] = await Promise.allSettled([
                axiosInstance.get("/admin/stats"),
                axiosInstance.get("/appointments/all"),
                axiosInstance.get(`/admin/reports?type=month&year=${now.getFullYear()}&month=${now.getMonth() + 1}&period=week`),
            ]);

            if (statsRes.status === "fulfilled") {
                setStats(statsRes.value.data.data);
            }

            if (apptsRes.status === "fulfilled") {
                const allAppts = normalizeAppointments(apptsRes.value.data);
                const recent = [...allAppts]
                    .sort((a, b) => new Date(b.createdAt || b.appointmentDate) - new Date(a.createdAt || a.appointmentDate))
                    .slice(0, 5);
                setRecentAppointments(recent);
                setOverdueCount(allAppts.filter(isAppointmentOverdue).length);
            } else {
                setRecentAppointments([]);
                setOverdueCount(0);
            }

            if (reportRes.status === "fulfilled") {
                const rd = reportRes.value.data?.data || reportRes.value.data || {};
                setWeeklyTrend(Array.isArray(rd.weeklyTrend) ? rd.weeklyTrend : []);
                setTopDoctors(Array.isArray(rd.topDoctors) ? rd.topDoctors : []);
            }
        } catch (error) {
            console.error("Failed to fetch admin overview data:", error);
            if (!silent) toast.error("Không thể tải dữ liệu tổng quan");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(() => fetchDashboardData(true), 60_000);
        return () => clearInterval(interval);
    }, [fetchDashboardData, refreshKey]);

    usePageFocus(useCallback(() => fetchDashboardData(true), [fetchDashboardData]));

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="page-heading">
                    <div className="space-y-2">
                        <div className="skeleton h-8 w-48" />
                        <div className="skeleton h-4 w-64" />
                    </div>
                    <div className="skeleton h-9 w-32 rounded-full" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="stat-card p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="skeleton h-4 w-24" />
                                <div className="skeleton h-10 w-10 rounded-xl" />
                            </div>
                            <div className="skeleton h-9 w-20" />
                            <div className="skeleton h-3 w-32" />
                        </div>
                    ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="soft-card lg:col-span-2 p-5 space-y-3">
                        <div className="skeleton h-5 w-32" />
                        <div className="skeleton h-48 w-full rounded-xl" />
                    </div>
                    <div className="soft-card p-5 space-y-3">
                        <div className="skeleton h-5 w-28" />
                        {[1,2,3].map(i => <div key={i} className="skeleton h-12 w-full rounded-lg" />)}
                    </div>
                </div>
            </div>
        );
    }

    const total = stats?.totalAppointments || 0;
    const completed = stats?.completedAppointments || 0;
    const pending = stats?.pendingAppointments || 0;
    const cancelled = stats?.cancelledAppointments || 0;
    const confirmed = stats?.confirmedAppointments || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const kpiCards = [
        {
            title: "Lịch hẹn hôm nay",
            value: stats?.todayAppointments || 0,
            icon: Calendar,
            accent: "bg-blue-50 text-blue-600",
            breakdown: `${confirmed} đã xác nhận · ${pending} chờ`,
            trend: null,
        },
        {
            title: "Bệnh nhân",
            value: stats?.totalPatients || 0,
            icon: Users,
            accent: "bg-violet-50 text-violet-600",
            breakdown: `${stats?.totalDoctors || 0} bác sĩ · ${stats?.totalServices || 0} dịch vụ`,
            trend: null,
        },
        {
            title: "Tỷ lệ hoàn thành",
            value: `${completionRate}%`,
            icon: CheckCircle2,
            accent: "bg-amber-50 text-amber-600",
            breakdown: `${completed} hoàn thành · ${cancelled} đã hủy · ${overdueCount} quá hạn`,
            trend: completionRate >= 70 ? 1 : -1,
        },
    ];

    return (
        <div className="space-y-5 animate-fade-in-up">
            <AdminPageHeader
                title="Tổng quan quản trị"
                description="Tổng quan hệ thống phòng khám nha khoa"
                action={
                    <div className="flex items-center gap-2">
                        <NotificationDropdown />
                        <Button asChild>
                            <Link to="/admin/reports">
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Xem báo cáo
                            </Link>
                        </Button>
                    </div>
                }
            />

            {/* ── 4 KPI cards ── */}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {kpiCards.map((kpi) => (
                    <Card key={kpi.title} className="stat-card min-h-[132px] overflow-hidden py-0">
                        <CardContent className="p-3.5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                                    <div className="mt-1.5 flex items-end gap-2">
                                        <span className="text-3xl font-bold tabular-nums leading-none">
                                            {kpi.value}
                                        </span>
                                        {kpi.trend !== null && (
                                            <span className={`mb-0.5 flex items-center gap-0.5 text-xs font-semibold ${kpi.trend > 0 ? "text-emerald-600" : "text-red-500"}`}>
                                                {kpi.trend > 0
                                                    ? <TrendingUp className="h-3.5 w-3.5" />
                                                    : <TrendingDown className="h-3.5 w-3.5" />}
                                                {kpi.trend > 0 ? `+${kpi.trend}%` : `${kpi.trend}%`}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{kpi.breakdown}</p>
                                </div>
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${kpi.accent}`}>
                                    <kpi.icon className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                <Card className="soft-card py-0">
                    <CardHeader className="px-4 pb-1 pt-4">
                        <CardTitle className="text-base">Bác sĩ nổi bật</CardTitle>
                        <CardDescription>Theo số lịch hoàn thành</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 px-4 pb-3">
                        {topDoctors.length === 0 ? (
                            <p className="py-3 text-center text-sm text-muted-foreground">Chưa có dữ liệu</p>
                        ) : (
                            topDoctors.slice(0, 4).map((doc, i) => {
                                const name = doc.doctorName || doc.name || "Bác sĩ";
                                const count = doc.appointmentCount || doc.count || 0;
                                return (
                                    <div key={doc._id || i} className="flex items-center gap-2.5">
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                            {i + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">{name}</p>
                                            <p className="text-xs text-muted-foreground">{count} lịch hoàn thành</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Chart + Quick actions ── */}
            <div className="grid gap-5 lg:grid-cols-3">
                <Card className="soft-card py-0 lg:col-span-2">
                    <CardHeader className="px-5 pb-1 pt-4">
                        <CardTitle>Xu hướng lịch hẹn (Tuần này)</CardTitle>
                        <CardDescription>Số lịch hẹn theo từng ngày trong tuần này</CardDescription>
                    </CardHeader>
                    <CardContent className="px-5 pb-4 pt-0">
                        {weeklyTrend.length === 0 ? (
                            <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
                                Chưa có dữ liệu
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={170}>
                                <AreaChart data={weeklyTrend} margin={{ top: 0, right: 8, left: -24, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#1a9eac" stopOpacity={0.18} />
                                            <stop offset="95%" stopColor="#1a9eac" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                        tickLine={false}
                                        axisLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: "hsl(var(--card))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "0.75rem",
                                            fontSize: 12,
                                        }}
                                        formatter={(v) => [v, "Lịch hẹn"]}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="appointments"
                                        stroke="#1a9eac"
                                        strokeWidth={2.5}
                                        fill="url(#areaGrad)"
                                        dot={{ r: 3, fill: "#1a9eac" }}
                                        activeDot={{ r: 5 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-5">
                    <Card className="soft-card self-start py-0">
                        <CardHeader className="px-5 pb-2 pt-5">
                            <CardTitle className="text-base">Thao tác nhanh</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 px-4 pb-4 pt-0">
                            {[
                                { to: "/admin/appointments", label: "Quản lý lịch hẹn",  icon: Calendar,    bg: "bg-blue-50",   iconCls: "text-blue-600" },
                                { to: "/admin/doctors",      label: "Quản lý bác sĩ",    icon: Stethoscope, bg: "bg-violet-50", iconCls: "text-violet-600" },
                                { to: "/admin/services",     label: "Quản lý dịch vụ",   icon: TrendingUp,  bg: "bg-amber-50",  iconCls: "text-amber-600" },
                                { to: "/admin/knowledge",    label: "Kiến thức AI",       icon: Database,    bg: "bg-emerald-50",iconCls: "text-emerald-600" },
                            ].map(item => (
                                <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-card/95 px-4 py-2 text-sm transition-colors hover:bg-muted/50">
                                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                                        <item.icon className={`h-4 w-4 ${item.iconCls}`} />
                                    </div>
                                    <span className="text-sm font-medium">{item.label}</span>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Recent appointments ── */}
            <Card className="soft-card">
                <CardHeader>
                    <CardTitle>Lịch hẹn gần đây</CardTitle>
                    <CardDescription>5 lịch hẹn mới nhất trong hệ thống</CardDescription>
                </CardHeader>
                <CardContent>
                    {recentAppointments.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground">Chưa có lịch hẹn nào</p>
                    ) : (
                        <div className="space-y-4">
                            {recentAppointments.map((apt) => {
                                const patientName = apt.patientId?.fullName || "-";
                                const doctorName = apt.doctorId?.userId?.fullName || "-";
                                const serviceName = apt.serviceId?.name || "-";
                                const date = apt.appointmentDate || apt.date;
                                const time = apt.startTime || apt.timeSlot;
                                return (
                                    <div key={apt._id} className="interactive-row flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold">{patientName}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {serviceName} · BS. {doctorName}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                                            <p className="text-xs font-medium">
                                                {date ? new Date(date).toLocaleDateString("vi-VN") : "-"}{time ? ` lúc ${time}` : ""}
                                            </p>
                                            {getStatusBadge(apt)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <Button className="mt-4 h-11 w-full rounded-full bg-primary font-semibold text-white shadow-sm hover:bg-primary/90" asChild>
                        <Link to="/admin/appointments">Xem tất cả lịch hẹn</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminOverview;

