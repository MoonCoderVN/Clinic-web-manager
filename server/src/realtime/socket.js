import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";
import User from "../modules/user/user.model.js";
import Doctor from "../modules/doctor/doctor.model.js";

let io;

const publicPayload = (extra = {}) => ({
  at: new Date().toISOString(),
  ...extra,
});

export const configureSocket = (server, allowedOrigins) => {
  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      socket.join("public");

      if (!token) return next();

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id role isActive");
      if (!user || user.isActive === false) {
        return next(new Error("Unauthorized"));
      }

      socket.user = {
        id: user._id.toString(),
        role: user.role,
      };
      socket.join(`user:${socket.user.id}`);
      socket.join(`role:${socket.user.role}`);

      if (user.role === "doctor") {
        const doctor = await Doctor.findOne({ userId: user._id }).select("_id");
        if (doctor?._id) socket.join(`doctor:${doctor._id.toString()}`);
      }

      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // Kiểm tra isActive định kỳ mỗi 5 phút
    const checkInterval = setInterval(async () => {
      if (!socket.user?.id) return;
      
      try {
        const user = await User.findById(socket.user.id).select("isActive");
        if (!user || !user.isActive) {
          logger.info(`[Socket] Disconnecting deactivated user: ${socket.user.id}`);
          socket.disconnect(true);
          clearInterval(checkInterval);
        }
      } catch (err) {
        logger.error(`[Socket] Error checking user status: ${err.message}`);
      }
    }, 5 * 60 * 1000); // 5 phút

    socket.on("disconnect", () => {
      clearInterval(checkInterval);
    });
  });

  return io;
};

export const getIo = () => io;

export const emitToUser = (userId, event, payload = {}) => {
  if (!io || !userId) return;
  io.to(`user:${userId.toString()}`).emit(event, publicPayload(payload));
};

export const emitToRole = (role, event, payload = {}) => {
  if (!io || !role) return;
  io.to(`role:${role}`).emit(event, publicPayload(payload));
};

export const emitToDoctor = (doctorId, event, payload = {}) => {
  if (!io || !doctorId) return;
  io.to(`doctor:${doctorId.toString()}`).emit(event, publicPayload(payload));
};

export const emitPublic = (event, payload = {}) => {
  if (!io) return;
  io.to("public").emit(event, publicPayload(payload));
};

export const emitEntityChanged = (entity, payload = {}) => {
  const event = `${entity}:changed`;
  emitToRole("admin", event, payload);
  return event;
};

export const emitAppointmentChanged = async (appointment, action = "changed") => {
  if (!appointment) return;
  const appointmentId = appointment._id?.toString();
  const patientId = appointment.patientId?._id || appointment.patientId;
  const doctorId = appointment.doctorId?._id || appointment.doctorId;
  const payload = {
    action,
    appointmentId,
    patientId: patientId?.toString(),
    doctorId: doctorId?.toString(),
  };

  emitToRole("admin", "appointment:changed", payload);
  emitToUser(patientId, "appointment:changed", payload);
  emitToDoctor(doctorId, "appointment:changed", payload);

  const doctor = doctorId ? await Doctor.findById(doctorId).select("userId") : null;
  if (doctor?.userId) emitToUser(doctor.userId, "appointment:changed", payload);

  emitPublic("slots:changed", {
    action,
    doctorId: doctorId?.toString(),
    serviceId: appointment.serviceId?.toString(),
    date: appointment.appointmentDate || appointment.date,
  });
};
