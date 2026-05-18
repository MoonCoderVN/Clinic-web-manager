import { isAppointmentOverdue } from "@/utils/appointmentStatus";

export function getStatusBadge(appointment) {
  if (isAppointmentOverdue(appointment)) return <span className="badge-status-overdue">Quá hạn</span>;
  const MAP = {
    pending:     <span className="badge-status-pending">Chờ xác nhận</span>,
    confirmed:   <span className="badge-status-confirmed">Đã xác nhận</span>,
    in_progress: <span className="badge-status-in-progress">Đang khám</span>,
    completed:   <span className="badge-status-completed">Đã khám</span>,
    cancelled:   <span className="badge-status-cancelled">Đã hủy</span>,
    rescheduled: <span className="badge-status-pending">Đã đổi lịch</span>,
  };
  return MAP[appointment?.status] ?? <span className="badge-status-pending">{appointment?.status || "Không rõ"}</span>;
}
