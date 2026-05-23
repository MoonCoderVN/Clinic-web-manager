import nodemailer from "nodemailer";
import logger from "./logger.js";

const getSmtpErrorDetails = (err) => ({
    code: err?.code,
    command: err?.command,
    responseCode: err?.responseCode,
    response: err?.response,
    message: err?.message,
});

export const sendEmail = async (to, subject, html) => {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
        logger.warn("[Email] MAIL_USER / MAIL_PASS chưa được cấu hình.");
        throw new Error("Email chưa được cấu hình (thiếu MAIL_USER hoặc MAIL_PASS)");
    }

    // Tạo transporter tại đây, lúc này env đã được load đầy đủ
    const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.MAIL_PORT || "587"),
        secure: false,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || `"DentaCare" <${process.env.MAIL_USER}>`,
            to,
            subject,
            html,
        });
        logger.info(`[Email] Đã gửi "${subject}" → ${to}`);
        return true;
    } catch (err) {
        const details = getSmtpErrorDetails(err);
        logger.error(`[Email] Gửi thất bại (${to}): ${JSON.stringify(details)}`);

        // Phân loại lỗi để thông báo rõ ràng
        if (details.code === "EAUTH" || details.responseCode === 535) {
            logger.error(
                "[Email] Gmail từ chối xác thực — cần App Password 16 ký tự (không dùng mật khẩu Gmail thường)"
            );
            throw new Error("SMTP xác thực thất bại — App Password Gmail không hợp lệ hoặc đã bị thu hồi");
        }

        if (details.code === "ECONNECTION" || details.code === "ETIMEDOUT") {
            throw new Error(`Không kết nối được đến SMTP server (${details.code}) — kiểm tra kết nối mạng`);
        }

        throw new Error(`Gửi email thất bại: ${details.message || details.response || "Lỗi không xác định"}`);
    }
};
