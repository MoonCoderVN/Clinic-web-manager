// =============================================================
// StarUML Sequence Diagrams Script — DentaCare Clinic System
// 23 Use Cases — Biểu đồ Trình tự (UMLSequenceDiagram)
//
// CÁCH SỬ DỤNG:
//   1. Mở StarUML, mở project (hoặc tạo project mới)
//   2. Vào menu Tools > Script Console
//   3. Copy toàn bộ nội dung file này, Paste vào console
//   4. Nhấn Enter để chạy
// =============================================================

(function () {
  "use strict";

  var project = app.project.getProject();
  var model =
    project.ownedElements && project.ownedElements.length > 0
      ? project.ownedElements[0]
      : app.factory.createModel({
          id: "UMLModel",
          parent: project,
          modelInitializer: function (m) {
            m.name = "DentaCare Clinic System";
          },
        });

  // ── HELPER FUNCTIONS ────────────────────────────────────────

  /** Tạo UMLSequenceDiagram */
  function diagram(name) {
    return app.factory.createDiagram({
      id: "UMLSequenceDiagram",
      parent: model,
      diagramInitializer: function (d) {
        d.name = name;
      },
    });
  }

  /**
   * Tạo Lifeline
   * @param {boolean} isActor - true → Actor (người dùng)
   * @param {string}  stereo  - 'boundary'|'control'|'entity' hoặc ''
   */
  function lifeline(d, name, x, isActor, stereo) {
    return app.factory.createElement({
      id: "UMLLifeline",
      parent: model,
      diagram: d,
      x1: x,
      y1: 20,
      x2: x + 100,
      y2: 700,
      modelInitializer: function (m) {
        m.name = name;
        if (isActor) m.stereotype = "actor";
        else if (stereo) m.stereotype = stereo;
      },
    });
  }

  /** Tạo message đồng bộ (mũi tên liền) */
  function msg(d, src, tgt, text, y) {
    return app.factory.createElement({
      id: "UMLMessage",
      parent: model,
      diagram: d,
      tailView: src,
      headView: tgt,
      x1: 0,
      y1: y,
      x2: 0,
      y2: y,
      modelInitializer: function (m) {
        m.name = text;
        m.messageSort = "synchCall";
      },
    });
  }

  /** Tạo reply message (mũi tên nét đứt) */
  function reply(d, src, tgt, text, y) {
    return app.factory.createElement({
      id: "UMLMessage",
      parent: model,
      diagram: d,
      tailView: src,
      headView: tgt,
      x1: 0,
      y1: y,
      x2: 0,
      y2: y,
      modelInitializer: function (m) {
        m.name = text;
        m.messageSort = "reply";
      },
    });
  }

  /** Tạo Combined Fragment (alt / loop / opt) */
  function combined(d, operator, label, x, y, w, h) {
    return app.factory.createElement({
      id: "UMLCombinedFragment",
      parent: model,
      diagram: d,
      x1: x,
      y1: y,
      x2: x + w,
      y2: y + h,
      modelInitializer: function (m) {
        m.interactionOperator = operator;
        m.name = label || "";
      },
    });
  }

  // Vị trí chuẩn các lifeline (khoảng cách 160px)
  var X = { actor: 30, fe: 200, be: 370, db: 530 };

  // ============================================================
  // UC01 — ĐĂNG NHẬP
  // ============================================================
  (function () {
    var d  = diagram("UC01 - Đăng nhập [Sequence]");
    var nd = lifeline(d, "Người dùng", X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");

    msg(d,  nd, fe, "1. Truy cập trang đăng nhập",            120);
    reply(d,fe, nd, "2. Hiển thị giao diện đăng nhập",        160);
    msg(d,  nd, fe, "3. Nhập tài khoản/mật khẩu, chọn Đăng nhập", 200);
    msg(d,  fe, be, "4. Gửi thông tin đăng nhập",             240);
    msg(d,  be, db, "5. Truy vấn dữ liệu tài khoản",          280);

    combined(d, "alt", "", X.fe - 10, 310, 390, 200);

    reply(d, db, be, "6.1. Dữ liệu không hợp lệ",             340);
    reply(d, be, fe, "7.1. Tài khoản hoặc mật khẩu không chính xác", 380);
    reply(d, fe, nd, "8.1. Thông báo sai tài khoản/mật khẩu", 420);

    reply(d, db, be, "6. Thông tin đăng nhập hợp lệ",         460);
    reply(d, be, fe, "7. Đăng nhập thành công",               500);
    reply(d, fe, nd, "8. Thông báo thành công, chuyển trang", 540);
  })();

  // ============================================================
  // UC02 — ĐĂNG XUẤT
  // ============================================================
  (function () {
    var d  = diagram("UC02 - Đăng xuất [Sequence]");
    var nd = lifeline(d, "Người dùng", X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");

    msg(d,  nd, fe, "1. Nhấn nút Đăng xuất",                 120);
    msg(d,  fe, be, "2. Gửi yêu cầu đăng xuất",              160);

    combined(d, "alt", "", X.fe - 10, 190, 390, 200);

    reply(d, be, fe, "3.1. Thông báo phiên đã hết hạn",      220);
    reply(d, fe, nd, "4.1. Tự động chuyển trang đăng nhập",  260);

    msg(d,  be, db, "3. Hủy token phiên làm việc",            300);
    reply(d, db, be, "4. Xác nhận đã hủy phiên",             340);
    reply(d, be, fe, "5. Đăng xuất thành công",               380);
    reply(d, fe, nd, "6. Chuyển hướng về trang đăng nhập",   420);
  })();

  // ============================================================
  // UC03 — ĐẶT LẠI MẬT KHẨU
  // ============================================================
  (function () {
    var d  = diagram("UC03 - Đặt lại mật khẩu [Sequence]");
    var nd = lifeline(d, "Người dùng", X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");

    msg(d,  nd, fe, "1. Nhấn Quên mật khẩu",                 120);
    reply(d,fe, nd, "2. Hiển thị form nhập email",           160);
    msg(d,  nd, fe, "3. Nhập email và gửi yêu cầu",          200);
    msg(d,  fe, be, "4. Gửi yêu cầu đặt lại mật khẩu",      240);
    msg(d,  be, db, "5. Kiểm tra email tồn tại",              280);

    combined(d, "alt", "", X.fe - 10, 310, 390, 220);

    reply(d, db, be, "6.1. Email không có trong hệ thống",   340);
    reply(d, be, fe, "7.1. Thông báo không tìm thấy tài khoản", 380);
    reply(d, fe, nd, "8.1. Hiển thị lỗi không tìm thấy",    420);

    reply(d, db, be, "6. Email hợp lệ",                      460);
    reply(d, be, fe, "7. Gửi liên kết đặt lại qua email",   500);
    reply(d, fe, nd, "8. Thông báo đã gửi liên kết",         540);

    msg(d,  nd, fe, "9. Truy cập liên kết, nhập mật khẩu mới", 590);
    msg(d,  fe, be, "10. Gửi mật khẩu mới",                  630);
    msg(d,  be, db, "11. Cập nhật mật khẩu mới",             670);
    reply(d, db, be, "12. Xác nhận cập nhật thành công",     710);
    reply(d, be, fe, "13. Đặt lại mật khẩu thành công",     750);
    reply(d, fe, nd, "14. Thông báo thành công, chuyển trang đăng nhập", 790);
  })();

  // ============================================================
  // UC04 — CẬP NHẬT THÔNG TIN CÁ NHÂN
  // ============================================================
  (function () {
    var d  = diagram("UC04 - Cập nhật thông tin cá nhân [Sequence]");
    var nd = lifeline(d, "Người dùng", X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");

    msg(d,  nd, fe, "1. Chọn mục Thông tin cá nhân",         120);
    msg(d,  fe, be, "2. Gửi yêu cầu lấy thông tin",          160);
    msg(d,  be, db, "3. Truy vấn thông tin người dùng",       200);
    reply(d, db, be, "4. Trả về dữ liệu thông tin",          240);
    reply(d, be, fe, "5. Phản hồi dữ liệu",                  280);
    reply(d, fe, nd, "6. Hiển thị thông tin cá nhân hiện tại", 320);
    msg(d,  nd, fe, "7. Chỉnh sửa và nhấn Lưu thay đổi",    360);
    msg(d,  fe, be, "8. Gửi dữ liệu đã chỉnh sửa",           400);

    combined(d, "alt", "", X.fe - 10, 430, 390, 180);

    reply(d, be, fe, "9.1. Thông báo lỗi validation",        460);
    reply(d, fe, nd, "10.1. Hiển thị lỗi tại trường không hợp lệ", 500);

    msg(d,  be, db, "9. Cập nhật thông tin người dùng",       540);
    reply(d, db, be, "10. Xác nhận cập nhật thành công",     580);
    reply(d, be, fe, "11. Thông báo lưu thành công",          620);
    reply(d, fe, nd, "12. Hiển thị thông báo lưu thành công", 660);
  })();

  // ============================================================
  // UCBN-01 — ĐĂNG KÝ TÀI KHOẢN
  // ============================================================
  (function () {
    var d  = diagram("UCBN-01 - Đăng ký tài khoản [Sequence]");
    var bn = lifeline(d, "Bệnh nhân",  X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");

    msg(d,  bn, fe, "1. Truy cập trang đăng ký",             120);
    reply(d,fe, bn, "2. Hiển thị form đăng ký",              160);
    msg(d,  bn, fe, "3. Nhập họ tên, email, mật khẩu, SĐT",  200);
    msg(d,  fe, be, "4. Gửi thông tin đăng ký",              240);
    msg(d,  be, db, "5. Kiểm tra email và số điện thoại",    280);

    combined(d, "alt", "", X.fe - 10, 310, 390, 200);

    reply(d, db, be, "6.1. Email hoặc SĐT đã tồn tại",      340);
    reply(d, be, fe, "7.1. Thông báo lỗi trùng thông tin",   380);
    reply(d, fe, bn, "8.1. Hiển thị lỗi, yêu cầu nhập lại", 420);

    reply(d, db, be, "6. Dữ liệu hợp lệ",                   460);
    msg(d,  be, db, "7. Tạo tài khoản bệnh nhân",            500);
    reply(d, db, be, "8. Xác nhận tạo thành công",           540);
    reply(d, be, fe, "9. Đăng ký thành công",                580);
    reply(d, fe, bn, "10. Chuyển hướng về trang chủ",        620);
  })();

  // ============================================================
  // UCBN-02 — XEM DANH SÁCH DỊCH VỤ
  // ============================================================
  (function () {
    var d  = diagram("UCBN-02 - Xem danh sách dịch vụ [Sequence]");
    var bn = lifeline(d, "Bệnh nhân",  X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");

    msg(d,  bn, fe, "1. Chọn mục Dịch vụ",                  120);
    msg(d,  fe, be, "2. Gửi yêu cầu danh sách dịch vụ",     160);
    msg(d,  be, db, "3. Truy vấn dịch vụ đang hoạt động",    200);

    combined(d, "alt", "", X.fe - 10, 230, 390, 180);

    reply(d, db, be, "4.1. Không có dịch vụ",               260);
    reply(d, be, fe, "5.1. Trả về danh sách trống",          300);
    reply(d, fe, bn, "6.1. Hiển thị thông báo chưa có dịch vụ", 340);

    reply(d, db, be, "4. Danh sách dịch vụ",                380);
    reply(d, be, fe, "5. Trả về dữ liệu dịch vụ",           420);
    reply(d, fe, bn, "6. Hiển thị danh sách dịch vụ",       460);

    msg(d,  bn, fe, "7. Chọn một dịch vụ xem chi tiết",     510);
    msg(d,  fe, be, "8. Gửi yêu cầu chi tiết dịch vụ",      550);
    reply(d, be, fe, "9. Trả về thông tin chi tiết",         590);
    reply(d, fe, bn, "10. Hiển thị chi tiết dịch vụ",       630);
  })();

  // ============================================================
  // UCBN-03 — XEM THÔNG TIN BÁC SĨ
  // ============================================================
  (function () {
    var d  = diagram("UCBN-03 - Xem thông tin bác sĩ [Sequence]");
    var bn = lifeline(d, "Bệnh nhân",  X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");

    msg(d,  bn, fe, "1. Chọn bác sĩ từ danh sách",          120);
    msg(d,  fe, be, "2. Gửi yêu cầu thông tin bác sĩ",      160);
    msg(d,  be, db, "3. Truy vấn thông tin bác sĩ",          200);

    combined(d, "alt", "", X.fe - 10, 230, 390, 180);

    reply(d, db, be, "4.1. Bác sĩ không tồn tại/ngưng HĐ", 260);
    reply(d, be, fe, "5.1. Thông báo không tìm thấy",        300);
    reply(d, fe, bn, "6.1. Hiển thị lỗi không tìm thấy bác sĩ", 340);

    reply(d, db, be, "4. Dữ liệu bác sĩ",                   380);
    reply(d, be, fe, "5. Thông tin hồ sơ bác sĩ",           420);
    reply(d, fe, bn, "6. Hiển thị ảnh, tên, chuyên khoa, kinh nghiệm", 460);

    msg(d,  fe, be, "7. Gửi yêu cầu lịch làm việc",         510);
    msg(d,  be, db, "8. Truy vấn lịch làm việc tuần hiện tại", 550);
    reply(d, db, be, "9. Lịch làm việc",                     590);
    reply(d, be, fe, "10. Trả về lịch làm việc",             630);
    reply(d, fe, bn, "11. Hiển thị lịch làm việc trong tuần", 670);
  })();

  // ============================================================
  // UCBN-04 — ĐẶT LỊCH HẸN KHÁM
  // ============================================================
  (function () {
    var d  = diagram("UCBN-04 - Đặt lịch hẹn khám [Sequence]");
    var bn = lifeline(d, "Bệnh nhân",  X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");
    var bs = lifeline(d, "Bác sĩ",     700,     true);

    msg(d,  bn, fe, "1. Chọn dịch vụ, ngày và khung giờ",   120);
    msg(d,  fe, be, "2. Gửi yêu cầu kiểm tra lịch trống",   160);
    msg(d,  be, db, "3. Kiểm tra khung giờ và bác sĩ khả dụng", 200);

    combined(d, "alt", "", X.fe - 10, 230, 560, 180);

    reply(d, db, be, "4.1. Khung giờ đã đầy / Không có bác sĩ", 260);
    reply(d, be, fe, "5.1. Thông báo lỗi",                   300);
    reply(d, fe, bn, "6.1. Yêu cầu chọn lại thời gian",      340);

    reply(d, db, be, "4. Danh sách bác sĩ khả dụng",         380);
    reply(d, be, fe, "5. Trả về bác sĩ và khung giờ trống",  420);
    reply(d, fe, bn, "6. Hiển thị danh sách bác sĩ",         460);

    msg(d,  bn, fe, "7. Chọn bác sĩ, nhập ghi chú, xác nhận đặt lịch", 510);
    msg(d,  fe, be, "8. Gửi thông tin đặt lịch",              550);
    msg(d,  be, db, "9. Tạo lịch hẹn — Trạng thái: Chờ xác nhận", 590);
    reply(d, db, be, "10. Xác nhận đã tạo lịch hẹn",         630);
    reply(d, be, fe, "11. Đặt lịch thành công",               670);
    reply(d, fe, bn, "12. Thông báo đặt lịch thành công",    710);
    reply(d, be, bs, "13. Thông báo có lịch hẹn mới",        750);
  })();

  // ============================================================
  // UCBN-05 — XEM VÀ QUẢN LÝ LỊCH HẸN
  // ============================================================
  (function () {
    var d  = diagram("UCBN-05 - Xem và quản lý lịch hẹn [Sequence]");
    var bn = lifeline(d, "Bệnh nhân",  X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");
    var bs = lifeline(d, "Bác sĩ",     700,     true);

    msg(d,  bn, fe, "1. Chọn mục Lịch hẹn của tôi",         120);
    msg(d,  fe, be, "2. Gửi yêu cầu danh sách lịch hẹn",    160);
    msg(d,  be, db, "3. Truy vấn lịch hẹn bệnh nhân",        200);
    reply(d, db, be, "4. Danh sách lịch hẹn",                240);
    reply(d, be, fe, "5. Trả về danh sách",                  280);
    reply(d, fe, bn, "6. Hiển thị lịch hẹn theo trạng thái", 320);
    msg(d,  bn, fe, "7. Chọn lịch hẹn và thao tác (Hủy/Đổi)", 360);

    combined(d, "alt", "", X.fe - 10, 390, 560, 220);

    msg(d,  fe, be, "8a. Gửi yêu cầu hủy lịch",              420);
    msg(d,  be, db, "9a. Cập nhật trạng thái: Đã hủy",       460);
    reply(d, db, be, "10a. Xác nhận",                         500);
    reply(d, be, bs, "11a. Thông báo lịch hẹn bị hủy",       540);
    reply(d, fe, bn, "8b. Yêu cầu đổi lịch, nhập ngày giờ mới", 580);
    msg(d,  fe, be, "9b. Gửi yêu cầu đổi lịch",              620);
    msg(d,  be, db, "10b. Cập nhật lịch hẹn mới",            660);
    reply(d, fe, bn, "11b. Thông báo đổi lịch thành công",   700);
  })();

  // ============================================================
  // UCBN-06 — XEM LỊCH SỬ VÀ KẾT QUẢ KHÁM
  // ============================================================
  (function () {
    var d  = diagram("UCBN-06 - Xem lịch sử và kết quả khám [Sequence]");
    var bn = lifeline(d, "Bệnh nhân",  X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");

    msg(d,  bn, fe, "1. Chọn mục Lịch sử khám bệnh",        120);
    msg(d,  fe, be, "2. Gửi yêu cầu lịch sử khám",          160);
    msg(d,  be, db, "3. Truy vấn lịch sử hoàn thành",        200);

    combined(d, "alt", "", X.fe - 10, 230, 390, 160);

    reply(d, db, be, "4.1. Không có lịch sử",               260);
    reply(d, be, fe, "5.1. Danh sách trống",                 300);
    reply(d, fe, bn, "6.1. Thông báo chưa có lịch sử khám", 340);

    reply(d, db, be, "4. Danh sách lần khám",                380);
    reply(d, be, fe, "5. Trả về danh sách lịch sử",          420);
    reply(d, fe, bn, "6. Hiển thị danh sách lịch sử",        460);
    msg(d,  bn, fe, "7. Chọn một lần khám xem chi tiết",    510);
    msg(d,  fe, be, "8. Gửi yêu cầu kết quả khám",          550);
    msg(d,  be, db, "9. Truy vấn kết quả khám",              590);

    combined(d, "alt", "", X.fe - 10, 620, 390, 120);

    reply(d, db, be, "10.1. Chưa có kết quả",               650);
    reply(d, fe, bn, "11.1. Thông báo kết quả chưa cập nhật", 690);

    reply(d, db, be, "10. Kết quả khám chi tiết",            730);
    reply(d, fe, bn, "11. Hiển thị chẩn đoán, đơn thuốc, ghi chú", 770);
  })();

  // ============================================================
  // UCBN-07 — TƯ VẤN SỨC KHỎE VỚI AI
  // ============================================================
  (function () {
    var d  = diagram("UCBN-07 - Tư vấn sức khỏe với AI [Sequence]");
    var bn = lifeline(d, "Bệnh nhân",  X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var ai = lifeline(d, "AI Service", X.db,    false, "control");
    var kb = lifeline(d, "KhoKienThuc", 700,    false, "entity");

    msg(d,  bn, fe, "1. Chọn mục Tư vấn AI",                120);
    msg(d,  fe, be, "2. Khởi tạo phiên trò chuyện",         160);
    reply(d,be, fe, "3. Phiên đã sẵn sàng",                  200);
    reply(d,fe, bn, "4. Hiển thị giao diện chat",            240);
    msg(d,  bn, fe, "5. Nhập câu hỏi và nhấn Gửi",          280);
    msg(d,  fe, be, "6. Gửi câu hỏi",                       320);
    msg(d,  be, ai, "7. Chuyển câu hỏi đến AI Service",     360);
    msg(d,  ai, kb, "8. Tìm kiếm trong kho kiến thức y tế", 400);

    combined(d, "alt", "", X.db - 10, 430, 370, 200);

    reply(d, kb, ai, "9.1. Trả về nội dung liên quan",       460);
    reply(d, ai, be, "10.1. Phản hồi từ kho kiến thức",     500);

    reply(d, kb, ai, "9.2. Không tìm thấy tài liệu",         540);
    reply(d, ai, be, "10.2. Phản hồi chung + khuyến nghị đặt lịch", 580);

    reply(d, be, fe, "11. Trả về phản hồi AI",               630);
    reply(d, fe, bn, "12. Hiển thị câu trả lời",             670);
  })();

  // ============================================================
  // UCBS-01 — XEM LỊCH LÀM VIỆC VÀ LỊCH HẸN
  // ============================================================
  (function () {
    var d  = diagram("UCBS-01 - Xem lịch làm việc và lịch hẹn [Sequence]");
    var bs = lifeline(d, "Bác sĩ",     X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");

    msg(d,  bs, fe, "1. Chọn mục Lịch làm việc / Lịch hẹn", 120);
    msg(d,  fe, be, "2. Gửi yêu cầu lịch làm việc",         160);
    msg(d,  be, db, "3. Truy vấn lịch làm việc bác sĩ",     200);

    combined(d, "alt", "", X.fe - 10, 230, 390, 160);

    reply(d, db, be, "4.1. Chưa có lịch được phân công",     260);
    reply(d, be, fe, "5.1. Thông báo chưa có lịch",          300);
    reply(d, fe, bs, "6.1. Hiển thị thông báo",              340);

    reply(d, db, be, "4. Lịch làm việc theo tuần",           380);
    reply(d, be, fe, "5. Trả về lịch làm việc và lịch hẹn",  420);
    reply(d, fe, bs, "6. Hiển thị lịch làm việc và danh sách lịch hẹn", 460);

    msg(d,  bs, fe, "7. Điều hướng sang tuần/ngày khác",    510);
    msg(d,  fe, be, "8. Gửi yêu cầu lịch tuần mới",         550);
    reply(d, be, fe, "9. Trả về dữ liệu mới",               590);
    msg(d,  bs, fe, "10. Chọn một lịch hẹn xem chi tiết",   630);
    reply(d, fe, bs, "11. Hiển thị chi tiết lịch hẹn và thông tin BN", 670);
  })();

  // ============================================================
  // UCBS-02 — XÁC NHẬN LỊCH HẸN
  // ============================================================
  (function () {
    var d  = diagram("UCBS-02 - Xác nhận lịch hẹn [Sequence]");
    var bs = lifeline(d, "Bác sĩ",     X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");
    var bn = lifeline(d, "Bệnh nhân",  700,     true);

    msg(d,  bs, fe, "1. Chọn lịch hẹn trạng thái Chờ xác nhận", 120);
    msg(d,  fe, be, "2. Gửi yêu cầu chi tiết lịch hẹn",         160);
    reply(d, be, fe, "3. Chi tiết lịch hẹn",                     200);
    reply(d, fe, bs, "4. Hiển thị chi tiết và 2 tùy chọn",      240);

    combined(d, "alt", "", X.fe - 10, 270, 560, 240);

    msg(d,  bs, fe, "5a. Nhấn Xác nhận",                         300);
    msg(d,  fe, be, "6a. Gửi xác nhận lịch hẹn",                 340);
    msg(d,  be, db, "7a. Cập nhật trạng thái: Đã xác nhận",      380);
    reply(d, db, be, "8a. Xác nhận",                              420);
    reply(d, be, bn, "9a. Thông báo lịch đã xác nhận",           460);

    msg(d,  bs, fe, "5b. Nhấn Từ chối và nhập lý do",           500);
    msg(d,  fe, be, "6b. Gửi từ chối kèm lý do",                 540);
    msg(d,  be, db, "7b. Cập nhật trạng thái: Đã hủy",           580);
    reply(d, be, bn, "8b. Thông báo lịch bị từ chối kèm lý do", 620);
  })();

  // ============================================================
  // UCBS-03 — NHẬP KẾT QUẢ KHÁM
  // ============================================================
  (function () {
    var d  = diagram("UCBS-03 - Nhập kết quả khám [Sequence]");
    var bs = lifeline(d, "Bác sĩ",     X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");
    var bn = lifeline(d, "Bệnh nhân",  700,     true);

    msg(d,  bs, fe, "1. Chọn lịch hẹn trạng thái Check-in", 120);
    reply(d,fe, bs, "2. Hiển thị form nhập kết quả khám",    160);
    msg(d,  bs, fe, "3. Điền chẩn đoán, đơn thuốc, ghi chú",200);
    msg(d,  bs, fe, "4. Nhấn Lưu kết quả",                   240);
    msg(d,  fe, be, "5. Gửi kết quả khám",                   280);

    combined(d, "alt", "", X.fe - 10, 310, 390, 130);

    reply(d, be, fe, "6.1. Lỗi: Chẩn đoán bắt buộc",       340);
    reply(d, fe, bs, "7.1. Thông báo lỗi, yêu cầu bổ sung", 380);

    msg(d,  be, db, "6. Lưu kết quả khám",                   450);
    msg(d,  be, db, "7. Cập nhật trạng thái: Hoàn thành",    490);
    reply(d, db, be, "8. Xác nhận lưu thành công",           530);
    reply(d, be, fe, "9. Kết quả đã được lưu",               570);
    reply(d, fe, bs, "10. Thông báo lưu kết quả thành công", 610);
    reply(d, be, bn, "11. Thông báo kết quả khám đã có",     650);
  })();

  // ============================================================
  // UCBS-04 — XEM HỒ SƠ BỆNH NHÂN
  // ============================================================
  (function () {
    var d  = diagram("UCBS-04 - Xem hồ sơ bệnh nhân [Sequence]");
    var bs = lifeline(d, "Bác sĩ",     X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");

    msg(d,  bs, fe, "1. Mở lịch hẹn và nhấn tên bệnh nhân",  120);
    msg(d,  fe, be, "2. Gửi yêu cầu hồ sơ bệnh nhân",        160);
    msg(d,  be, db, "3. Truy vấn thông tin cá nhân bệnh nhân", 200);
    reply(d, db, be, "4. Thông tin cá nhân",                   240);
    reply(d, be, fe, "5. Họ tên, ngày sinh, giới tính, SĐT",   280);
    reply(d, fe, bs, "6. Hiển thị thông tin cá nhân bệnh nhân", 320);

    msg(d,  be, db, "7. Truy vấn lịch sử khám",               370);

    combined(d, "alt", "", X.fe - 10, 400, 390, 160);

    reply(d, db, be, "8.1. Chưa có lịch sử khám",            430);
    reply(d, fe, bs, "9.1. Thông báo chưa có dữ liệu",        470);

    reply(d, db, be, "8. Danh sách lịch sử khám",             510);
    reply(d, fe, bs, "9. Hiển thị danh sách lịch sử",         550);

    msg(d,  bs, fe, "10. Chọn một lần khám xem chi tiết",    600);
    msg(d,  fe, be, "11. Gửi yêu cầu kết quả lần khám",      640);
    reply(d, be, fe, "12. Kết quả khám chi tiết",             680);
    reply(d, fe, bs, "13. Hiển thị kết quả khám chi tiết",    720);
  })();

  // ============================================================
  // UCBS-05 — TẠO ĐƠN XIN NGHỈ PHÉP
  // ============================================================
  (function () {
    var d  = diagram("UCBS-05 - Tạo đơn xin nghỉ phép [Sequence]");
    var bs = lifeline(d, "Bác sĩ",     X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");
    var ad = lifeline(d, "Admin",       700,     true);

    msg(d,  bs, fe, "1. Truy cập Đơn xin nghỉ phép, nhấn Tạo đơn", 120);
    reply(d,fe, bs, "2. Hiển thị form tạo đơn",              160);
    msg(d,  bs, fe, "3. Chọn ngày nghỉ và nhập lý do",       200);
    msg(d,  bs, fe, "4. Nhấn Gửi đơn",                       240);
    msg(d,  fe, be, "5. Gửi thông tin đơn xin nghỉ",         280);
    msg(d,  be, db, "6. Kiểm tra tính hợp lệ của đơn",       320);

    combined(d, "alt", "", X.fe - 10, 350, 390, 180);

    reply(d, db, be, "7.1. Trùng ngày hoặc ngoài lịch làm",  380);
    reply(d, be, fe, "8.1. Thông báo lỗi",                   420);
    reply(d, fe, bs, "9.1. Hiển thị lỗi, yêu cầu nhập lại", 460);

    reply(d, db, be, "7. Đơn hợp lệ",                        500);
    msg(d,  be, db, "8. Lưu đơn — Trạng thái: Chờ duyệt",   540);
    reply(d, db, be, "9. Xác nhận lưu đơn",                  580);
    reply(d, be, fe, "10. Tạo đơn thành công",                620);
    reply(d, fe, bs, "11. Thông báo đơn đã gửi",             660);
    reply(d, be, ad, "12. Thông báo có đơn nghỉ phép mới",   700);
  })();

  // ============================================================
  // UCAD-01 — QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG
  // ============================================================
  (function () {
    var d  = diagram("UCAD-01 - Quản lý tài khoản người dùng [Sequence]");
    var ad = lifeline(d, "Admin",       X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");

    msg(d,  ad, fe, "1. Chọn quản lý Bệnh nhân / Bác sĩ",   120);
    msg(d,  fe, be, "2. Gửi yêu cầu danh sách tài khoản",   160);
    msg(d,  be, db, "3. Truy vấn danh sách người dùng",      200);
    reply(d, db, be, "4. Danh sách tài khoản",               240);
    reply(d, fe, ad, "5. Hiển thị danh sách và tùy chọn",    280);
    msg(d,  ad, fe, "6. Thực hiện thao tác (Thêm/Sửa/Khóa/Xóa)", 320);
    msg(d,  fe, be, "7. Gửi yêu cầu thao tác",              360);

    combined(d, "alt", "", X.fe - 10, 390, 390, 240);

    msg(d,  be, db, "8a. Kiểm tra email trùng khi thêm mới", 420);
    reply(d, db, be, "9a. Email đã tồn tại",                 460);
    reply(d, fe, ad, "10a. Thông báo lỗi trùng email",       500);

    msg(d,  be, db, "8b. Kiểm tra lịch hẹn khi xóa",        540);
    reply(d, db, be, "9b. Còn lịch hẹn chưa hoàn thành",    580);
    reply(d, fe, ad, "10b. Cảnh báo không thể xóa",          620);

    msg(d,  be, db, "8c. Thực thi thao tác",                 660);
    reply(d, db, be, "9c. Xác nhận thành công",              700);
    reply(d, fe, ad, "10c. Thông báo thao tác thành công",   740);
  })();

  // ============================================================
  // UCAD-02 — PHÂN CÔNG LỊCH LÀM VIỆC BÁC SĨ
  // ============================================================
  (function () {
    var d  = diagram("UCAD-02 - Phân công lịch làm việc bác sĩ [Sequence]");
    var ad = lifeline(d, "Admin",       X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");
    var bs = lifeline(d, "Bác sĩ",     700,     true);

    msg(d,  ad, fe, "1. Truy cập Quản lý lịch làm việc, chọn bác sĩ", 120);
    msg(d,  fe, be, "2. Gửi yêu cầu lịch làm việc hiện tại",  160);
    msg(d,  be, db, "3. Truy vấn lịch làm việc bác sĩ",       200);
    reply(d, db, be, "4. Lịch làm việc theo tuần",             240);
    reply(d, fe, ad, "5. Hiển thị lịch làm việc",             280);
    msg(d,  ad, fe, "6. Chọn tuần, ngày, giờ và nhấn Lưu",   320);
    msg(d,  fe, be, "7. Gửi lịch làm việc mới",               360);

    combined(d, "alt", "", X.fe - 10, 390, 390, 140);

    reply(d, be, fe, "8.1. Lỗi: Giờ kết thúc ≤ giờ bắt đầu", 420);
    reply(d, fe, ad, "9.1. Thông báo lỗi, yêu cầu nhập lại", 460);

    msg(d,  be, db, "8. Lưu lịch làm việc",                   530);
    msg(d,  be, db, "9. Cập nhật khung giờ khả dụng",         570);
    reply(d, db, be, "10. Xác nhận",                           610);
    reply(d, be, fe, "11. Phân công thành công",               650);
    reply(d, fe, ad, "12. Thông báo lưu lịch thành công",     690);
    reply(d, be, bs, "13. Thông báo lịch làm việc mới",       730);
  })();

  // ============================================================
  // UCAD-03 — PHÊ DUYỆT ĐƠN XIN NGHỈ PHÉP
  // ============================================================
  (function () {
    var d  = diagram("UCAD-03 - Phê duyệt đơn xin nghỉ phép [Sequence]");
    var ad = lifeline(d, "Admin",       X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");
    var bs = lifeline(d, "Bác sĩ",     700,     true);

    msg(d,  ad, fe, "1. Truy cập Quản lý đơn nghỉ phép",     120);
    msg(d,  fe, be, "2. Gửi yêu cầu danh sách đơn chờ duyệt", 160);
    msg(d,  be, db, "3. Truy vấn đơn trạng thái Chờ duyệt",  200);
    reply(d, db, be, "4. Danh sách đơn chờ duyệt",            240);
    reply(d, fe, ad, "5. Hiển thị danh sách đơn",             280);
    msg(d,  ad, fe, "6. Chọn đơn xem chi tiết",               320);
    reply(d, fe, ad, "7. Hiển thị chi tiết đơn + 2 tùy chọn", 360);

    combined(d, "alt", "", X.fe - 10, 390, 560, 240);

    msg(d,  ad, fe, "8a. Nhấn Phê duyệt",                     420);
    msg(d,  fe, be, "9a. Gửi phê duyệt",                      460);
    msg(d,  be, db, "10a. Cập nhật: Đã duyệt, đánh dấu ngày nghỉ", 500);
    reply(d, be, bs, "11a. Thông báo đơn đã được phê duyệt",  540);

    msg(d,  ad, fe, "8b. Nhấn Từ chối, nhập lý do",           580);
    msg(d,  fe, be, "9b. Gửi từ chối kèm lý do",              620);
    msg(d,  be, db, "10b. Cập nhật: Từ chối",                  660);
    reply(d, be, bs, "11b. Thông báo từ chối kèm lý do",      700);
  })();

  // ============================================================
  // UCAD-04 — QUẢN LÝ DỊCH VỤ
  // ============================================================
  (function () {
    var d  = diagram("UCAD-04 - Quản lý dịch vụ [Sequence]");
    var ad = lifeline(d, "Admin",       X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");

    msg(d,  ad, fe, "1. Chọn mục Quản lý dịch vụ",           120);
    msg(d,  fe, be, "2. Gửi yêu cầu danh sách dịch vụ",      160);
    reply(d, be, fe, "3. Danh sách dịch vụ",                  200);
    reply(d, fe, ad, "4. Hiển thị danh sách và tùy chọn",     240);
    msg(d,  ad, fe, "5. Thực hiện thao tác (Thêm/Sửa/Xóa)",  280);
    msg(d,  fe, be, "6. Gửi yêu cầu thao tác",               320);

    combined(d, "alt", "", X.fe - 10, 350, 390, 240);

    msg(d,  be, db, "7a. Kiểm tra dữ liệu khi thêm/sửa",     380);
    reply(d, db, be, "8a. Thiếu trường bắt buộc",             420);
    reply(d, fe, ad, "9a. Thông báo lỗi thiếu thông tin",     460);

    msg(d,  be, db, "7b. Thêm/Cập nhật dịch vụ",             500);
    reply(d, db, be, "8b. Xác nhận thành công",               540);
    reply(d, fe, ad, "9b. Thông báo lưu thành công",          580);

    msg(d,  be, db, "7c. Ẩn dịch vụ (xóa mềm)",              620);
    reply(d, db, be, "8c. Xác nhận xóa",                      660);
    reply(d, fe, ad, "9c. Thông báo xóa thành công",          700);
  })();

  // ============================================================
  // UCAD-05 — QUẢN LÝ LỊCH HẸN TOÀN PHÒNG KHÁM
  // ============================================================
  (function () {
    var d  = diagram("UCAD-05 - Quản lý lịch hẹn toàn phòng khám [Sequence]");
    var ad = lifeline(d, "Admin",       X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");
    var bs = lifeline(d, "Bác sĩ",     700,     true);
    var bn = lifeline(d, "Bệnh nhân",  870,     true);

    msg(d,  ad, fe, "1. Truy cập Quản lý lịch hẹn",          120);
    msg(d,  fe, be, "2. Gửi yêu cầu danh sách lịch hẹn",     160);
    msg(d,  be, db, "3. Truy vấn toàn bộ lịch hẹn",          200);
    reply(d, db, be, "4. Danh sách lịch hẹn",                 240);
    reply(d, fe, ad, "5. Hiển thị toàn bộ lịch hẹn + bộ lọc", 280);

    combined(d, "alt", "", X.fe - 10, 310, 730, 240);

    msg(d,  ad, fe, "6a. Xác nhận check-in bệnh nhân",        340);
    msg(d,  fe, be, "7a. Gửi yêu cầu check-in",              380);
    msg(d,  be, db, "8a. Cập nhật trạng thái: Check-in",      420);
    reply(d, be, bs, "9a. Thông báo bệnh nhân đã check-in",   460);
    reply(d, fe, ad, "10a. Thông báo check-in thành công",    500);

    msg(d,  ad, fe, "6b. Hủy lịch hẹn",                      540);
    msg(d,  fe, be, "7b. Gửi yêu cầu hủy lịch",              580);
    msg(d,  be, db, "8b. Cập nhật trạng thái: Đã hủy",        620);
    reply(d, be, bs, "9b. Thông báo lịch hẹn bị hủy",        660);
    reply(d, be, bn, "10b. Thông báo lịch hẹn bị hủy",       700);
  })();

  // ============================================================
  // UCAD-06 — XEM BÁO CÁO VÀ THỐNG KÊ
  // ============================================================
  (function () {
    var d  = diagram("UCAD-06 - Xem báo cáo và thống kê [Sequence]");
    var ad = lifeline(d, "Admin",       X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");

    msg(d,  ad, fe, "1. Truy cập mục Báo cáo & Thống kê",    120);
    msg(d,  ad, fe, "2. Chọn khoảng thời gian và loại thống kê", 160);
    msg(d,  fe, be, "3. Gửi yêu cầu thống kê",               200);
    msg(d,  be, db, "4. Truy vấn và tổng hợp dữ liệu",       240);
    reply(d, db, be, "5. Dữ liệu tổng hợp",                  280);
    reply(d, be, fe, "6. Trả về số liệu thống kê",           320);
    reply(d, fe, ad, "7. Hiển thị biểu đồ, số lịch hẹn,\n    tỷ lệ trạng thái, doanh thu", 360);

    combined(d, "opt", "Xuất báo cáo", X.fe - 10, 410, 390, 120);

    msg(d,  ad, fe, "8. Nhấn Xuất báo cáo",                  440);
    msg(d,  fe, be, "9. Gửi yêu cầu xuất file",              480);
    reply(d, be, fe, "10. File báo cáo",                      520);
    reply(d, fe, ad, "11. Tải file báo cáo xuống",           560);
  })();

  // ============================================================
  // UCAD-07 — QUẢN LÝ TÀI LIỆU KIẾN THỨC AI
  // ============================================================
  (function () {
    var d  = diagram("UCAD-07 - Quản lý tài liệu kiến thức AI [Sequence]");
    var ad = lifeline(d, "Admin",       X.actor, true);
    var fe = lifeline(d, "Font_end",   X.fe,    false, "boundary");
    var be = lifeline(d, "Back_end",   X.be,    false, "control");
    var db = lifeline(d, "Database",   X.db,    false, "entity");
    var ai = lifeline(d, "AI Service", 700,     false, "control");

    msg(d,  ad, fe, "1. Truy cập Quản lý kiến thức AI",      120);
    msg(d,  fe, be, "2. Gửi yêu cầu danh sách tài liệu",     160);
    reply(d, be, fe, "3. Danh sách tài liệu hiện có",         200);
    reply(d, fe, ad, "4. Hiển thị danh sách và tùy chọn",     240);
    msg(d,  ad, fe, "5. Thực hiện thao tác (Tải lên/Cập nhật/Xóa)", 280);

    combined(d, "alt", "", X.fe - 10, 310, 560, 280);

    msg(d,  fe, be, "6a. Gửi file tài liệu (PDF/DOCX/TXT)",  340);
    msg(d,  be, be, "7a. Kiểm tra định dạng file",            380);
    reply(d, be, fe, "8a.1 Lỗi: Định dạng không hỗ trợ",     420);
    msg(d,  be, ai, "8a. Xử lý và lập chỉ mục tài liệu",     460);
    reply(d, ai, be, "9a. Hoàn thành lập chỉ mục",            500);
    msg(d,  be, db, "10a. Lưu metadata tài liệu",             540);
    reply(d, fe, ad, "11a. Thông báo tải lên thành công",     580);

    msg(d,  fe, be, "6b. Gửi yêu cầu xóa tài liệu",          620);
    msg(d,  be, ai, "7b. Xóa tài liệu khỏi kho kiến thức",   660);
    msg(d,  be, db, "8b. Xóa metadata tài liệu",              700);
    reply(d, fe, ad, "9b. Thông báo xóa thành công",          740);
  })();

  console.log(
    "✅ Hoàn thành! Đã tạo 23 Biểu đồ Trình tự (UMLSequenceDiagram)\n" +
    "   UC01–UC04 | UCBN-01–07 | UCBS-01–05 | UCAD-01–07"
  );
})();
