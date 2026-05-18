import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  Download,
  ArrowUpRight,
  RefreshCw,
  Stethoscope,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { AdminPageHeader, AdminStatCard, AdminToolbar, AdminSearchBox, AdminEmptyState, AdminLoadingState } from "@/components/admin/AdminUI";
import axiosInstance from "@/api/httpClient";
import { toast } from "sonner";
import { useRealtimeRefresh } from "@/hooks/useRealtimeEvent";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

const statusLabels = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  rescheduled: "Đổi lịch",
};

statusLabels.in_progress = "Đang khám";

const MONTH_NAMES = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

export default function AdminReportsPage() {
  const refreshKey = useRealtimeRefresh([
    "appointment:changed",
    "service:changed",
    "doctor:changed",
    "patient:changed",
    "exam-result:changed",
  ]);
  const now = new Date();

  // Filters
  const [period, setPeriod] = useState("month"); // week | month | quarter | year
  const [reportType, setReportType] = useState("month"); // day | month
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  // Data
  const [reportData, setReportData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      notation: "compact",
    }).format(value);

  // ────────────────────────────────────────────────────
  // Fetch reports and stats
  // ────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [reportsResult, statsResult] = await Promise.allSettled([
        axiosInstance.get(
          `/admin/reports?type=${reportType}&year=${year}&month=${month}&period=${period}`
        ),
        axiosInstance.get("/admin/stats"),
      ]);

      const errors = [];

      if (reportsResult.status === "fulfilled") {
        setReportData(reportsResult.value.data.data || null);
      } else {
        console.error("Error fetching admin reports:", reportsResult.reason);
        errors.push("Không tải được dữ liệu biểu đồ báo cáo.");
      }

      if (statsResult.status === "fulfilled") {
        setStatsData(statsResult.value.data.data || null);
      } else {
        console.error("Error fetching admin stats:", statsResult.reason);
        errors.push("Không tải được thống kê tổng quan.");
      }

      if (errors.length > 0) {
        const message = errors.join(" ");
        setErrorMessage(message);
        if (isRefresh) toast.error(message);
      } else {
        setErrorMessage("");
      }

      setLoading(false);
      setRefreshing(false);
    },
    [reportType, year, month, period]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // ────────────────────────────────────────────────────
  // Derived chart data
  // ────────────────────────────────────────────────────
  const monthlyAppointments = reportData?.monthlyAppointments || [];
  const serviceDistribution = reportData?.serviceDistribution || [];
  const appointmentsByStatus = (reportData?.appointmentsByStatus || []).map((s) => ({
    ...s,
    name: statusLabels[s.status] || s.status,
  }));
  const patientGrowth = reportData?.patientGrowth || [];
  const weeklyTrend = reportData?.weeklyTrend || [];
  const operationalSummary = reportData?.operationalSummary || {};
  const topDoctors = reportData?.topDoctors || [];
  const topServices = reportData?.topServices || [];

  // Day-by-day chart data (when reportType === "day")
  const dailyData = (reportData?.data || []).map((item) => ({
    label: `Ng ${item._id}`,
    total: item.total || 0,
    completed: item.completed || 0,
    cancelled: item.cancelled || 0,
    pending: item.pending || 0,
    confirmed: item.confirmed || 0,
    inProgress: item.inProgress || 0,
  }));

  // Summary stats
  const totalRevenue = operationalSummary.estimatedRevenue ?? monthlyAppointments.reduce((s, m) => s + (m.revenue || 0), 0);
  const totalAppts = monthlyAppointments.reduce((s, m) => s + (m.count || 0), 0);
  const latestPatients = patientGrowth[patientGrowth.length - 1]?.patients || 0;
  const prevPatients = patientGrowth[patientGrowth.length - 2]?.patients || 0;
  const growthRate =
    prevPatients > 0 ? (((latestPatients - prevPatients) / prevPatients) * 100).toFixed(1) : 0;
  const completedCount = appointmentsByStatus.find((s) => s.status === "completed")?.count || 0;
  const totalStatusCount = appointmentsByStatus.reduce((s, i) => s + (i.count || 0), 0);
  const completionRate =
    totalStatusCount > 0 ? ((completedCount / totalStatusCount) * 100).toFixed(1) : 0;
  const cancellationRate = operationalSummary.cancellationRate ?? 0;
  const topDoctor = topDoctors[0];
  const topService = topServices[0];

  // Export CSV
  const handleExport = () => {
    const data = reportType === "day" ? dailyData : monthlyAppointments;
    if (!data || data.length === 0) {
      toast.warning("Không có dữ liệu để xuất");
      return;
    }
    const rows = [
      ["Tháng/Ngày", "Tổng lịch hẹn", "Hoàn thành", "Đã hủy", "Chờ xác nhận"],
      ...data.map((row) => [
        row.label || row.month || row._id,
        row.total || row.count || 0,
        row.completed || 0,
        row.cancelled || 0,
        row.pending || 0,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bao-cao-${year}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await axiosInstance.get(
        `/admin/reports/export.pdf?type=${reportType}&year=${year}&month=${month}&period=${period}`,
        { responseType: "blob" }
      );
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `bao-cao-${year}-${month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed:", err);
      toast.error("Xuat PDF that bai");
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return <AdminLoadingState label="Đang tải dữ liệu báo cáo..." />;
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Báo cáo & Thống kê"
        titleClassName="text-primary"
        description="Theo dõi lịch hẹn, doanh thu ước tính và hiệu suất hoạt động phòng khám."
        action={(
        <div className="ml-auto flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
          {/* Report type */}
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Theo tháng</SelectItem>
              <SelectItem value="day">Theo ngày</SelectItem>
            </SelectContent>
          </Select>

          {/* Year */}
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month (only for day view) */}
          {reportType === "day" && (
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Period (only for month view) */}
          {reportType === "month" && (
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">7 ngày qua</SelectItem>
                <SelectItem value="month">30 ngày qua</SelectItem>
                <SelectItem value="quarter">Quý này</SelectItem>
                <SelectItem value="year">Năm nay</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Xuất CSV
            </Button>
            <Button onClick={handleExportPdf} disabled={exportingPdf}>
              {exportingPdf ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Xuất PDF
            </Button>
          </div>
        </div>
        )}
      />

      {errorMessage && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 text-sm text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng lịch hẹn</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData?.totalAppointments ?? totalAppts}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Hôm nay: {statsData?.todayAppointments ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Doanh thu ước tính</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <ArrowUpRight className="h-3 w-3" />
              <span>Dựa trên lịch hoàn thành</span>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bệnh nhân</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsData?.totalPatients ?? latestPatients}
            </div>
            {growthRate > 0 && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <ArrowUpRight className="h-3 w-3" />
                <span>+{growthRate}% so với kỳ trước</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tỷ lệ hoàn thành</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <div className="text-xs text-muted-foreground">Lịch hẹn hoàn thành thành công</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          title="Doanh thu kỳ này"
          value={formatCurrency(totalRevenue)}
          description="ước tính từ lịch hoàn thành"
          icon={DollarSign}
          color="text-emerald-600"
          tone="bg-emerald-50"
        />
        <AdminStatCard
          title="Tỷ lệ hủy"
          value={`${cancellationRate}%`}
          description={`${operationalSummary.cancelledAppointments || 0} lịch đã hủy`}
          icon={TrendingUp}
          color="text-orange-600"
          tone="bg-orange-50"
        />
        <AdminStatCard
          title="Bác sĩ nhiều lịch nhất"
          value={topDoctor?.name || "Chưa có"}
          description={topDoctor ? `${topDoctor.count} lịch hẹn` : "chưa có dữ liệu"}
          icon={Stethoscope}
          color="text-blue-600"
          tone="bg-blue-50"
        />
        <AdminStatCard
          title="Dịch vụ phổ biến"
          value={topService?.name || "Chưa có"}
          description={topService ? `${topService.count} lượt đặt` : "chưa có dữ liệu"}
          icon={BarChart3}
          color="text-primary"
          tone="bg-primary/10"
        />
      </div>

      {/* Main Chart: Daily or Monthly */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {reportType === "day"
              ? `Lịch hẹn theo ngày - Tháng ${month}/${year}`
              : `Lịch hẹn theo tháng - ${year}`}
          </CardTitle>
          <CardDescription>
            {reportType === "day"
              ? "Phân bố lịch hẹn từng ngày trong tháng"
              : "Tổng quan lịch hẹn từng tháng trong năm"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(reportType === "day" ? dailyData : monthlyAppointments).length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              Không có dữ liệu cho kỳ này
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              {reportType === "day" ? (
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill="#00C49F" name="Hoàn thành" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="inProgress" fill="#0088FE" name="Đang khám" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="pending" fill="#FFBB28" name="Chờ xác nhận" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="cancelled" fill="#FF8042" name="Đã hủy" radius={[2, 2, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={monthlyAppointments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "revenue" ? formatCurrency(value) : value,
                      name === "revenue" ? "Doanh thu" : "Lịch hẹn",
                    ]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Lịch hẹn" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Doanh thu" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Patient Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tăng trưởng bệnh nhân
            </CardTitle>
            <CardDescription>Số lượng bệnh nhân tích lũy theo tháng</CardDescription>
          </CardHeader>
          <CardContent>
            {patientGrowth.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Không có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={patientGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="patients"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name="Bệnh nhân"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Xu hướng tuần</CardTitle>
            <CardDescription>Lịch hẹn theo ngày trong tuần hiện tại</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyTrend.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Không có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="appointments"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ fill: "#8884d8" }}
                    name="Lịch hẹn"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Service Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bố dịch vụ</CardTitle>
            <CardDescription>Tỷ lệ sử dụng các dịch vụ</CardDescription>
          </CardHeader>
          <CardContent>
            {serviceDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Không có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={serviceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {serviceDistribution.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Appointment Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Trạng thái lịch hẹn</CardTitle>
            <CardDescription>Phân bố theo trạng thái toàn hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentsByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Không có dữ liệu
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={appointmentsByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="count"
                    label={({ name, count }) => `${name}: ${count}`}
                  >
                    {appointmentsByStatus.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
