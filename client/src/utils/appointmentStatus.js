const OVERDUE_STATUSES = new Set(["pending", "confirmed", "rescheduled"]);

const parseTimeParts = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return { hours: value.getHours(), minutes: value.getMinutes() };
  }

  const raw = String(value).trim();
  const directMatch = raw.match(/^(\d{1,2})[:hH](\d{1,2})/);
  const embeddedMatch = raw.match(/[T\s](\d{1,2}):(\d{1,2})/);
  const match = directMatch || embeddedMatch;
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
};

export const getAppointmentDateTime = (appointment) => {
  const rawDate = appointment?.appointmentDate || appointment?.date;
  const rawTime = appointment?.startTime || appointment?.timeSlot;
  if (!rawDate) return null;

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return null;

  const parsedTime = parseTimeParts(rawTime) || parseTimeParts(rawDate);
  if (!parsedTime) {
    const hasTimeInDate = date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
    return hasTimeInDate ? date : null;
  }

  date.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
  return date;
};

export const isAppointmentOverdue = (appointment, now = new Date()) => {
  const status = String(appointment?.status || "").toLowerCase();
  if (!OVERDUE_STATUSES.has(status)) return false;
  const appointmentDateTime = getAppointmentDateTime(appointment);
  return appointmentDateTime ? appointmentDateTime < now : false;
};

export const isAppointmentWithinHours = (appointment, hours = 2, now = new Date()) => {
  const appointmentDateTime = getAppointmentDateTime(appointment);
  if (!appointmentDateTime) return false;
  return appointmentDateTime.getTime() - now.getTime() < hours * 60 * 60 * 1000;
};

export const canPatientModifyAppointment = (appointment, now = new Date()) => {
  const status = String(appointment?.status || "").toLowerCase();
  if (!["pending", "confirmed", "rescheduled"].includes(status)) return false;
  if (isAppointmentOverdue(appointment, now)) return false;
  return !isAppointmentWithinHours(appointment, 2, now);
};
