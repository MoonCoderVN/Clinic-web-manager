/**
 * emailTemplates.js
 * Tất cả HTML template email của DentaCare.
 * Mỗi function trả về { subject, html }.
 */

// ── Màu thương hiệu ────────────────────────────────────────────────
const BRAND = "#2563EB";   // blue-600
const AMBER = "#f59e0b";
const GREEN = "#22c55e";
const RED = "#ef4444";

// ── Layout wrapper chung ───────────────────────────────────────────
const wrap = (accentColor, iconEmoji, title, bodyHtml) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(37,99,235,.10);">

        <!-- Logo bar -->
        <tr>
          <td style="background:#ffffff;padding:20px 40px 0;text-align:center;border-bottom:none;">
            <p style="margin:0;font-size:20px;font-weight:800;color:#1e3a8a;letter-spacing:-.5px;">
              Denta<span style="color:${BRAND};">Care</span>
            </p>
          </td>
        </tr>

        <!-- Header -->
        <tr>
          <td style="background:${accentColor};padding:28px 40px;text-align:center;">
            <p style="margin:0;font-size:36px;">${iconEmoji}</p>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">${title}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 40px 24px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              © DentaCare — Hệ thống quản lý phòng khám nha khoa<br/>
              📍 123 Đường Nha Khoa, TP. Hồ Chí Minh &nbsp;|&nbsp; 📞 1900 xxxx<br/>
              <span style="margin-top:6px;display:inline-block;">Email này được gửi tự động, vui lòng không reply.</span>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;

// ── Helper box ─────────────────────────────────────────────────────
const infoBox = (color, label, value) => `
  <tr>
    <td style="padding:6px 0;">
      <table width="100%" style="background:#f8fafc;border:1.5px solid ${color};
             border-radius:10px;padding:10px 14px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:#64748b;text-transform:uppercase;
                     letter-spacing:.5px;">${label}</td>
        </tr>
        <tr>
          <td style="font-size:15px;color:#1e293b;font-weight:600;
                     padding-top:2px;">${value}</td>
        </tr>
      </table>
    </td>
  </tr>
`;

const btn = (color, href, text) => `
  <p style="text-align:center;margin:28px 0 0;">
    <a href="${href}"
       style="display:inline-block;background:${color};color:#fff;
              padding:12px 32px;border-radius:8px;font-size:15px;
              font-weight:600;text-decoration:none;">${text}</a>
  </p>
`;

const hi = (name) =>
  `<p style="margin:0 0 20px;font-size:16px;color:#334155;">
       Xin chào <strong>${name}</strong>,
     </p>`;

// ══════════════════════════════════════════════════════════════════
// 1. Nhắc tái khám (gửi trước 3 ngày)
// ══════════════════════════════════════════════════════════════════
/**
 * @param {object} p
 * @param {string} p.patientName
 * @param {string} p.diagnosis     - Chẩn đoán lần khám trước
 * @param {string} p.nextDateStr   - Ví dụ: "Thứ Hai, 05/05/2025"
 * @param {number} p.daysLeft      - Số ngày còn lại
 * @param {string} p.bookingUrl    - URL trang đặt lịch
 */
export const nextDateReminderTemplate = ({ patientName, diagnosis, nextDateStr, daysLeft, bookingUrl }) => {
  const urgencyColor = daysLeft <= 1 ? RED : daysLeft <= 3 ? AMBER : BRAND;
  const urgencyText = daysLeft === 0 ? "Hôm nay!" : daysLeft === 1 ? "Ngày mai!" : `Còn ${daysLeft} ngày`;

  return {
    subject: `⏰ Nhắc tái khám — ${urgencyText} — DentaCare`,
    html: wrap(urgencyColor, "🦷", "Nhắc lịch tái khám", `
            ${hi(patientName)}
            <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
                Bác sĩ đã đề nghị bạn <strong>tái khám định kỳ</strong>. Đừng bỏ lỡ lịch hẹn
                quan trọng này để đảm bảo sức khỏe răng miệng tốt nhất!
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 6px;">
                ${infoBox(BRAND, "Chẩn đoán lần trước", diagnosis)}
                ${infoBox(urgencyColor, "Ngày tái khám", nextDateStr)}
                ${infoBox(urgencyColor, "Thời gian còn lại", urgencyText)}
            </table>

            <div style="margin:24px 0;padding:14px 18px;background:#fef9c3;border-radius:8px;
                        border:1px solid #fde047;font-size:14px;color:#713f12;">
                💡 <strong>Lưu ý:</strong> Đặt lịch sớm để được chọn giờ phù hợp.
                Phòng khám mở từ <strong>08:00 – 17:00</strong>, Thứ 2 đến Thứ 7.
            </div>

            ${btn(urgencyColor, bookingUrl, "Đặt lịch tái khám ngay →")}
        `),
  };
};

// ══════════════════════════════════════════════════════════════════
// 2. Xác nhận đặt lịch thành công
// ══════════════════════════════════════════════════════════════════
export const appointmentConfirmedTemplate = ({ patientName, serviceName, doctorName, dateStr, timeStr, bookingUrl }) => ({
  subject: `✅ Xác nhận lịch hẹn — ${dateStr} — DentaCare`,
  html: wrap(GREEN, "✅", "Lịch hẹn đã được xác nhận", `
        ${hi(patientName)}
        <p style="margin:0 0 20px;font-size:15px;color:#475569;">
            Lịch hẹn của bạn đã được phòng khám xác nhận. Vui lòng đến đúng giờ.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 6px;">
            ${infoBox(GREEN, "Dịch vụ", serviceName)}
            ${infoBox(GREEN, "Bác sĩ", doctorName)}
            ${infoBox(GREEN, "Ngày khám", dateStr)}
            ${infoBox(GREEN, "Giờ khám", timeStr)}
        </table>
        <div style="margin:24px 0;padding:14px 18px;background:#f0fdf4;border-radius:8px;
                    border:1px solid #86efac;font-size:14px;color:#14532d;">
            📍 Vui lòng đến trước <strong>10 phút</strong> để làm thủ tục check-in tại quầy lễ tân.
        </div>
        ${btn(GREEN, bookingUrl, "Xem chi tiết lịch hẹn")}
    `),
});

// ══════════════════════════════════════════════════════════════════
// 3. Thông báo đổi lịch — gửi cho bệnh nhân
// ══════════════════════════════════════════════════════════════════
export const appointmentRescheduledTemplate = ({ patientName, newDateStr, newTimeStr, bookingUrl }) => ({
  subject: `📅 Lịch hẹn đã được đổi — DentaCare`,
  html: wrap(AMBER, "📅", "Lịch hẹn đã được đổi", `
        ${hi(patientName)}
        <p style="margin:0 0 20px;font-size:15px;color:#475569;">
            Lịch hẹn của bạn đã được dời sang thời gian mới. Chờ phòng khám xác nhận lại.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 6px;">
            ${infoBox(AMBER, "Ngày mới", newDateStr)}
            ${infoBox(AMBER, "Giờ mới", newTimeStr)}
        </table>
        ${btn(AMBER, bookingUrl, "Xem lịch hẹn của tôi")}
    `),
});

// ══════════════════════════════════════════════════════════════════
// 4. Đặt lịch thành công — gửi ngay khi bệnh nhân đặt lịch (status: pending)
// ══════════════════════════════════════════════════════════════════
export const appointmentBookedTemplate = ({ patientName, serviceName, doctorName, dateStr, timeStr, bookingUrl }) => ({
  subject: `📋 Đặt lịch thành công — chờ xác nhận — DentaCare`,
  html: wrap(BRAND, "📋", "Đặt lịch thành công", `
        ${hi(patientName)}
        <p style="margin:0 0 20px;font-size:15px;color:#475569;">
            Yêu cầu đặt lịch của bạn đã được ghi nhận. Phòng khám sẽ xác nhận lịch hẹn trong thời gian sớm nhất.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 6px;">
            ${infoBox(BRAND, "Dịch vụ", serviceName)}
            ${infoBox(BRAND, "Bác sĩ", doctorName)}
            ${infoBox(BRAND, "Ngày khám", dateStr)}
            ${infoBox(BRAND, "Giờ khám", timeStr)}
        </table>
        <div style="margin:24px 0;padding:14px 18px;background:#f0f9ff;border-radius:8px;
                    border:1px solid #7dd3fc;font-size:14px;color:#0c4a6e;">
            ⏳ Trạng thái hiện tại: <strong>Chờ xác nhận</strong>. Bạn sẽ nhận được email xác nhận khi phòng khám duyệt lịch hẹn.
        </div>
        ${btn(BRAND, bookingUrl, "Xem lịch hẹn của tôi")}
    `),
});

// ══════════════════════════════════════════════════════════════════
// 5. Chào mừng đăng ký tài khoản thành công
// ══════════════════════════════════════════════════════════════════
export const welcomeRegisterTemplate = ({ fullName, loginUrl }) => ({
  subject: `🎉 Chào mừng bạn đến với DentaCare!`,
  html: wrap(BRAND, "🦷", "Đăng ký tài khoản thành công!", `
        ${hi(fullName)}
        <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">
            Chúc mừng! Tài khoản DentaCare của bạn đã được tạo thành công.
            Bạn có thể bắt đầu đặt lịch hẹn, theo dõi lịch sử khám và nhận
            tư vấn nha khoa trực tuyến ngay bây giờ.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 6px;">
            ${infoBox(BRAND, "Họ và tên", fullName)}
        </table>

        <div style="margin:24px 0;padding:14px 18px;background:#f0f9ff;border-radius:8px;
                    border:1px solid #7dd3fc;font-size:14px;color:#0c4a6e;">
            💡 <strong>Mẹo:</strong> Đặt lịch hẹn sớm để được chọn bác sĩ và khung giờ phù hợp.
            Phòng khám phục vụ từ <strong>08:00 – 17:00</strong>, Thứ 2 đến Thứ 7.
        </div>

        ${btn(BRAND, loginUrl, "Đăng nhập ngay →")}
    `),
});

// ══════════════════════════════════════════════════════════════════
// 6. Nhắc lịch hẹn trước 1 tiếng
// ══════════════════════════════════════════════════════════════════
export const appointmentHourReminderTemplate = ({ patientName, serviceName, doctorName, dateStr, timeStr, bookingUrl }) => ({
  subject: `⏰ Nhắc lịch hẹn — Còn 1 tiếng nữa — DentaCare`,
  html: wrap("#f59e0b", "⏰", "Lịch hẹn sắp đến!", `
        ${hi(patientName)}
        <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
            Lịch hẹn của bạn tại <strong>DentaCare</strong> sẽ bắt đầu sau <strong>1 tiếng nữa</strong>.
            Hãy chuẩn bị để đến đúng giờ nhé!
        </p>
 
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 6px;">
            ${infoBox("#f59e0b", "Dịch vụ", serviceName)}
            ${infoBox("#f59e0b", "Bác sĩ", doctorName)}
            ${infoBox("#f59e0b", "Ngày khám", dateStr)}
            ${infoBox("#f59e0b", "Giờ khám", timeStr)}
        </table>
 
        <div style="margin:24px 0;padding:14px 18px;background:#fffbeb;border-radius:8px;
                    border:1px solid #fcd34d;font-size:14px;color:#78350f;">
            📍 Vui lòng đến trước <strong>10 phút</strong> để làm thủ tục check-in tại quầy lễ tân.
        </div>
 
        ${btn("#f59e0b", bookingUrl, "Xem chi tiết lịch hẹn →")}
    `),
});

// ══════════════════════════════════════════════════════════════════
// 7. Đặt lại mật khẩu — gửi khi user yêu cầu quên mật khẩu
// ══════════════════════════════════════════════════════════════════
export const resetPasswordTemplate = ({ resetUrl }) => ({
  subject: `🔐 Đặt lại mật khẩu DentaCare`,
  html: wrap("#2563eb", "🔐", "Đặt lại mật khẩu", `
        <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản DentaCare của bạn.
            Nhấn nút bên dưới để tiến hành đặt lại mật khẩu (có hiệu lực trong
            <strong>15 phút</strong>).
        </p>

        ${btn("#2563eb", resetUrl, "Đặt lại mật khẩu ngay →")}

        <div style="margin:24px 0;padding:14px 18px;background:#fef9c3;border-radius:8px;
                    border:1px solid #fde047;font-size:13px;color:#713f12;">
            ⚠️ <strong>Lưu ý bảo mật:</strong> Nếu bạn không yêu cầu đặt lại mật khẩu,
            hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.
        </div>

        <div style="margin:20px 0;padding:14px 18px;background:#f8fafc;border-radius:8px;
                    border:1px solid #e2e8f0;font-size:12px;color:#64748b;word-break:break-all;">
            <p style="margin:0 0 6px;font-weight:600;">Hoặc copy link này vào trình duyệt:</p>
            <p style="margin:0;color:#2563eb;">${resetUrl}</p>
        </div>
    `),
});