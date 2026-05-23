// =============================================================
// StarUML Activity Diagrams Script — DentaCare Clinic System
// 23 Use Cases — Biểu đồ Hoạt động (UMLActivityDiagram)
//
// CÁCH SỬ DỤNG:
//   1. Mở StarUML, mở project (hoặc tạo project mới)
//   2. Vào menu Tools > Script Console
//   3. Copy toàn bộ nội dung file này, Paste vào console
//   4. Nhấn Enter để chạy
// =============================================================

(function () {
  "use strict";

  // ── Lấy model gốc ──────────────────────────────────────────
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

  function diagram(name) {
    return app.factory.createDiagram({
      id: "UMLActivityDiagram",
      parent: model,
      diagramInitializer: function (d) {
        d.name = name;
      },
    });
  }

  function initial(d, x, y) {
    return app.factory.createElement({
      id: "UMLInitialNode",
      parent: model,
      diagram: d,
      x1: x,
      y1: y,
      x2: x + 20,
      y2: y + 20,
    });
  }

  function act(d, name, x, y, w, h) {
    return app.factory.createElement({
      id: "UMLAction",
      parent: model,
      diagram: d,
      x1: x,
      y1: y,
      x2: x + (w || 220),
      y2: y + (h || 40),
      modelInitializer: function (m) {
        m.name = name;
      },
    });
  }

  function dec(d, x, y) {
    return app.factory.createElement({
      id: "UMLDecisionNode",
      parent: model,
      diagram: d,
      x1: x,
      y1: y,
      x2: x + 40,
      y2: y + 40,
    });
  }

  function mrg(d, x, y) {
    return app.factory.createElement({
      id: "UMLMergeNode",
      parent: model,
      diagram: d,
      x1: x,
      y1: y,
      x2: x + 40,
      y2: y + 40,
    });
  }

  function fin(d, x, y) {
    return app.factory.createElement({
      id: "UMLActivityFinalNode",
      parent: model,
      diagram: d,
      x1: x,
      y1: y,
      x2: x + 30,
      y2: y + 30,
    });
  }

  function flow(d, src, tgt, guard) {
    var f = app.factory.createElement({
      id: "UMLControlFlow",
      parent: model,
      diagram: d,
      tailView: src,
      headView: tgt,
    });
    if (guard) {
      try {
        f.guard = guard;
      } catch (e) {}
    }
    return f;
  }

  // ============================================================
  // UC01 — ĐĂNG NHẬP
  // ============================================================
  (function () {
    var d = diagram("UC01 - Đăng nhập [Activity]");
    var cx = 290;
    var i0  = initial(d, cx - 10, 30);
    var a1  = act(d, "Hiển thị giao diện đăng nhập", cx - 110, 90);
    var a2  = act(d, "Người dùng nhập email và mật khẩu", cx - 110, 160);
    var a3  = act(d, "Nhấn Đăng nhập", cx - 110, 230);
    var d1  = dec(d, cx - 20, 300);
    var a4  = act(d, "Hiển thị lỗi: Sai email/mật khẩu", cx + 80, 370, 220, 40);
    var d2  = dec(d, cx - 20, 450);
    var a5  = act(d, "Thông báo: Tài khoản bị khóa\nLiên hệ quản trị viên", cx + 80, 520, 220, 50);
    var a6  = act(d, "Thiết lập phiên làm việc", cx - 110, 520);
    var d3  = dec(d, cx - 20, 600);
    var a7  = act(d, "Chuyển trang Bệnh nhân", cx - 260, 670);
    var a8  = act(d, "Chuyển trang Bác sĩ", cx - 110, 670);
    var a9  = act(d, "Chuyển trang Admin", cx + 60, 670);
    var f0  = fin(d, cx - 15, 760);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, a3);
    flow(d, a3, d1);
    flow(d, d1, a4, "Thông tin không đúng");
    flow(d, a4, a2);
    flow(d, d1, d2, "Tài khoản tồn tại");
    flow(d, d2, a5, "Bị khóa");
    flow(d, a5, f0);
    flow(d, d2, a6, "Không bị khóa");
    flow(d, a6, d3);
    flow(d, d3, a7, "Bệnh nhân");
    flow(d, d3, a8, "Bác sĩ");
    flow(d, d3, a9, "Admin");
    flow(d, a7, f0);
    flow(d, a8, f0);
    flow(d, a9, f0);
  })();

  // ============================================================
  // UC02 — ĐĂNG XUẤT
  // ============================================================
  (function () {
    var d = diagram("UC02 - Đăng xuất [Activity]");
    var cx = 290;
    var i0 = initial(d, cx - 10, 30);
    var d1 = dec(d, cx - 20, 90);
    var a1 = act(d, "Người dùng nhấn nút Đăng xuất", cx - 170, 160);
    var a2 = act(d, "Hệ thống tự động hủy phiên\n(hết hạn)", cx + 50, 160, 230, 50);
    var a3 = act(d, "Hệ thống hủy phiên làm việc", cx - 170, 250);
    var m1 = mrg(d, cx - 20, 330);
    var a4 = act(d, "Xóa token xác thực", cx - 110, 400);
    var a5 = act(d, "Chuyển hướng về trang đăng nhập", cx - 110, 470);
    var f0 = fin(d, cx - 15, 550);

    flow(d, i0, d1);
    flow(d, d1, a1, "Phiên còn hiệu lực");
    flow(d, d1, a2, "Phiên đã hết hạn");
    flow(d, a1, a3);
    flow(d, a3, m1);
    flow(d, a2, m1);
    flow(d, m1, a4);
    flow(d, a4, a5);
    flow(d, a5, f0);
  })();

  // ============================================================
  // UC03 — ĐẶT LẠI MẬT KHẨU
  // ============================================================
  (function () {
    var d  = diagram("UC03 - Đặt lại mật khẩu [Activity]");
    var cx = 290;
    var i0  = initial(d, cx - 10, 30);
    var a1  = act(d, "Nhấn Quên mật khẩu", cx - 110, 90);
    var a2  = act(d, "Hiển thị form nhập email", cx - 110, 160);
    var a3  = act(d, "Nhập địa chỉ email và gửi yêu cầu", cx - 110, 230);
    var d1  = dec(d, cx - 20, 300);
    var a4  = act(d, "Thông báo: Không tìm thấy tài khoản", cx + 80, 370, 230, 40);
    var a5  = act(d, "Gửi liên kết đặt lại mật khẩu qua email", cx - 180, 370, 240, 40);
    var a6  = act(d, "Người dùng truy cập liên kết", cx - 180, 440);
    var d2  = dec(d, cx - 20, 510);
    var a7  = act(d, "Thông báo: Liên kết hết hạn\nYêu cầu gửi lại", cx + 80, 580, 220, 50);
    var a8  = act(d, "Hiển thị form nhập mật khẩu mới", cx - 180, 580);
    var a9  = act(d, "Nhập mật khẩu mới và xác nhận", cx - 180, 650);
    var d3  = dec(d, cx - 20, 720);
    var a10 = act(d, "Thông báo lỗi: Mật khẩu không đủ điều kiện", cx + 80, 790, 240, 50);
    var a11 = act(d, "Cập nhật mật khẩu mới", cx - 180, 790);
    var a12 = act(d, "Thông báo đặt lại mật khẩu thành công", cx - 110, 870);
    var f0  = fin(d, cx - 15, 950);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, a3);
    flow(d, a3, d1);
    flow(d, d1, a4, "Email không tồn tại");
    flow(d, a4, a2);
    flow(d, d1, a5, "Email tồn tại");
    flow(d, a5, a6);
    flow(d, a6, d2);
    flow(d, d2, a7, "Liên kết hết hạn");
    flow(d, a7, a2);
    flow(d, d2, a8, "Liên kết hợp lệ");
    flow(d, a8, a9);
    flow(d, a9, d3);
    flow(d, d3, a10, "Không đủ điều kiện");
    flow(d, a10, a9);
    flow(d, d3, a11, "Hợp lệ");
    flow(d, a11, a12);
    flow(d, a12, f0);
  })();

  // ============================================================
  // UC04 — CẬP NHẬT THÔNG TIN CÁ NHÂN
  // ============================================================
  (function () {
    var d  = diagram("UC04 - Cập nhật thông tin cá nhân [Activity]");
    var cx = 290;
    var i0 = initial(d, cx - 10, 30);
    var a1 = act(d, "Chọn mục Thông tin cá nhân", cx - 110, 90);
    var a2 = act(d, "Hệ thống hiển thị thông tin hiện tại", cx - 110, 160);
    var a3 = act(d, "Chỉnh sửa thông tin và nhấn Lưu thay đổi", cx - 110, 230);
    var d1 = dec(d, cx - 20, 300);
    var a4 = act(d, "Hiển thị lỗi tại trường còn thiếu", cx + 80, 370, 220, 40);
    var d2 = dec(d, cx - 20, 450);
    var a5 = act(d, "Thông báo số điện thoại không hợp lệ", cx + 80, 520, 230, 40);
    var a6 = act(d, "Hệ thống cập nhật thông tin", cx - 180, 520);
    var a7 = act(d, "Hiển thị thông báo lưu thành công", cx - 110, 600);
    var f0 = fin(d, cx - 15, 680);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, a3);
    flow(d, a3, d1);
    flow(d, d1, a4, "Trường bắt buộc trống");
    flow(d, a4, a3);
    flow(d, d1, d2, "Đầy đủ thông tin");
    flow(d, d2, a5, "SĐT sai định dạng");
    flow(d, a5, a3);
    flow(d, d2, a6, "Hợp lệ");
    flow(d, a6, a7);
    flow(d, a7, f0);
  })();

  // ============================================================
  // UCBN-01 — ĐĂNG KÝ TÀI KHOẢN
  // ============================================================
  (function () {
    var d  = diagram("UCBN-01 - Đăng ký tài khoản [Activity]");
    var cx = 290;
    var i0  = initial(d, cx - 10, 30);
    var a1  = act(d, "Hiển thị trang đăng ký tài khoản", cx - 110, 90);
    var a2  = act(d, "Bệnh nhân nhập họ tên, email,\nmật khẩu, số điện thoại", cx - 110, 160, 220, 50);
    var a3  = act(d, "Nhấn Đăng ký", cx - 110, 240);
    var d1  = dec(d, cx - 20, 310);
    var a4  = act(d, "Hiển thị lỗi tại từng trường còn thiếu", cx + 80, 380, 230, 40);
    var d2  = dec(d, cx - 20, 460);
    var a5  = act(d, "Thông báo: Email đã tồn tại", cx + 80, 530, 210, 40);
    var d3  = dec(d, cx - 20, 610);
    var a6  = act(d, "Thông báo: Số điện thoại trùng", cx + 80, 680, 220, 40);
    var a7  = act(d, "Tạo tài khoản với vai trò Bệnh nhân", cx - 180, 680);
    var a8  = act(d, "Chuyển hướng về trang chủ", cx - 110, 760);
    var f0  = fin(d, cx - 15, 840);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, a3);
    flow(d, a3, d1);
    flow(d, d1, a4, "Thiếu trường bắt buộc");
    flow(d, a4, a2);
    flow(d, d1, d2, "Đầy đủ thông tin");
    flow(d, d2, a5, "Email đã tồn tại");
    flow(d, a5, a2);
    flow(d, d2, d3, "Email hợp lệ");
    flow(d, d3, a6, "SĐT đã dùng");
    flow(d, a6, a2);
    flow(d, d3, a7, "Hợp lệ");
    flow(d, a7, a8);
    flow(d, a8, f0);
  })();

  // ============================================================
  // UCBN-02 — XEM DANH SÁCH DỊCH VỤ
  // ============================================================
  (function () {
    var d  = diagram("UCBN-02 - Xem danh sách dịch vụ [Activity]");
    var cx = 290;
    var i0 = initial(d, cx - 10, 30);
    var a1 = act(d, "Chọn mục Dịch vụ trên thanh điều hướng", cx - 110, 90);
    var a2 = act(d, "Hệ thống truy vấn danh sách dịch vụ", cx - 110, 160);
    var d1 = dec(d, cx - 20, 230);
    var a3 = act(d, "Hiển thị thông báo: Chưa có dịch vụ", cx + 80, 300, 220, 40);
    var a4 = act(d, "Hiển thị danh sách dịch vụ\n(tên, mô tả, thời lượng, giá)", cx - 180, 300, 220, 50);
    var d2 = dec(d, cx - 20, 390);
    var a5 = act(d, "Hiển thị chi tiết dịch vụ được chọn", cx - 110, 460);
    var f1 = fin(d, cx - 15, 550);
    var f2 = fin(d, cx + 150, 390);
    var f3 = fin(d, cx + 150, 300);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, d1);
    flow(d, d1, a3, "Chưa có dịch vụ");
    flow(d, a3, f3);
    flow(d, d1, a4, "Có dịch vụ");
    flow(d, a4, d2);
    flow(d, d2, f2, "Không xem chi tiết");
    flow(d, d2, a5, "Chọn xem chi tiết");
    flow(d, a5, f1);
  })();

  // ============================================================
  // UCBN-03 — XEM THÔNG TIN BÁC SĨ
  // ============================================================
  (function () {
    var d  = diagram("UCBN-03 - Xem thông tin bác sĩ [Activity]");
    var cx = 290;
    var i0 = initial(d, cx - 10, 30);
    var a1 = act(d, "Chọn bác sĩ từ danh sách", cx - 110, 90);
    var d1 = dec(d, cx - 20, 160);
    var a2 = act(d, "Thông báo: Không tìm thấy bác sĩ", cx + 80, 230, 220, 40);
    var a3 = act(d, "Hiển thị ảnh, họ tên, chuyên khoa\nvà mô tả kinh nghiệm", cx - 180, 230, 220, 50);
    var a4 = act(d, "Hiển thị lịch làm việc trong tuần", cx - 110, 320);
    var f1 = fin(d, cx - 15, 420);
    var f2 = fin(d, cx + 160, 320);

    flow(d, i0, a1);
    flow(d, a1, d1);
    flow(d, d1, a2, "Không tồn tại/ngưng HĐ");
    flow(d, a2, f2);
    flow(d, d1, a3, "Tồn tại và hoạt động");
    flow(d, a3, a4);
    flow(d, a4, f1);
  })();

  // ============================================================
  // UCBN-04 — ĐẶT LỊCH HẸN KHÁM
  // ============================================================
  (function () {
    var d   = diagram("UCBN-04 - Đặt lịch hẹn khám [Activity]");
    var cx  = 290;
    var i0  = initial(d, cx - 10, 30);
    var a1  = act(d, "Truy cập trang Đặt lịch", cx - 110, 90);
    var a2  = act(d, "Hiển thị danh sách dịch vụ khám", cx - 110, 160);
    var a3  = act(d, "Bệnh nhân chọn dịch vụ khám", cx - 110, 230);
    var a4  = act(d, "Chọn ngày và khung giờ", cx - 110, 300);
    var d1  = dec(d, cx - 20, 370);
    var a5  = act(d, "Thông báo: Khung giờ đã đầy\nYêu cầu chọn lại", cx + 80, 440, 220, 50);
    var a6  = act(d, "Hiển thị danh sách bác sĩ\ncó lịch làm trong khung giờ", cx - 190, 440, 220, 50);
    var d2  = dec(d, cx - 20, 530);
    var a7  = act(d, "Thông báo: Không có bác sĩ khả dụng", cx + 80, 600, 230, 40);
    var a8  = act(d, "Chọn bác sĩ và nhập ghi chú", cx - 190, 600);
    var a9  = act(d, "Nhấn Xác nhận đặt lịch", cx - 110, 680);
    var a10 = act(d, "Tạo lịch hẹn: Trạng thái Chờ xác nhận", cx - 110, 750);
    var a11 = act(d, "Gửi thông báo xác nhận cho bệnh nhân", cx - 110, 820);
    var f0  = fin(d, cx - 15, 910);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, a3);
    flow(d, a3, a4);
    flow(d, a4, d1);
    flow(d, d1, a5, "Đã đủ lịch hẹn");
    flow(d, a5, a4);
    flow(d, d1, a6, "Còn trống");
    flow(d, a6, d2);
    flow(d, d2, a7, "Không có bác sĩ");
    flow(d, a7, a4);
    flow(d, d2, a8, "Có bác sĩ");
    flow(d, a8, a9);
    flow(d, a9, a10);
    flow(d, a10, a11);
    flow(d, a11, f0);
  })();

  // ============================================================
  // UCBN-05 — XEM VÀ QUẢN LÝ LỊCH HẸN
  // ============================================================
  (function () {
    var d   = diagram("UCBN-05 - Xem và quản lý lịch hẹn [Activity]");
    var cx  = 290;
    var i0  = initial(d, cx - 10, 30);
    var a1  = act(d, "Chọn mục Lịch hẹn của tôi", cx - 110, 90);
    var d1  = dec(d, cx - 20, 160);
    var a2  = act(d, "Hiển thị danh sách trống", cx + 80, 230, 200, 40);
    var a3  = act(d, "Hiển thị danh sách lịch hẹn\ntheo trạng thái", cx - 180, 230, 220, 50);
    var a4  = act(d, "Chọn một lịch hẹn xem chi tiết", cx - 110, 320);
    var d2  = dec(d, cx - 20, 400);
    var a5  = act(d, "Ẩn tùy chọn Hủy và Đổi lịch\nChỉ hiển thị thông tin", cx + 80, 470, 220, 50);
    var d3  = dec(d, cx - 20, 560);
    var a6  = act(d, "Hủy lịch: Cập nhật Đã hủy\nGửi thông báo cho bác sĩ", cx - 210, 630, 220, 50);
    var a7  = act(d, "Đổi lịch: Chọn ngày giờ mới\nCập nhật lịch hẹn", cx + 50, 630, 220, 50);
    var f0  = fin(d, cx - 15, 730);
    var f1  = fin(d, cx + 200, 400);
    var f2  = fin(d, cx + 200, 230);

    flow(d, i0, a1);
    flow(d, a1, d1);
    flow(d, d1, a2, "Không có lịch hẹn");
    flow(d, a2, f2);
    flow(d, d1, a3, "Có lịch hẹn");
    flow(d, a3, a4);
    flow(d, a4, d2);
    flow(d, d2, a5, "Check-in/Hoàn thành");
    flow(d, a5, f1);
    flow(d, d2, d3, "Chờ XN/Đã XN");
    flow(d, d3, a6, "Hủy lịch");
    flow(d, d3, a7, "Đổi lịch");
    flow(d, a6, f0);
    flow(d, a7, f0);
  })();

  // ============================================================
  // UCBN-06 — XEM LỊCH SỬ VÀ KẾT QUẢ KHÁM
  // ============================================================
  (function () {
    var d  = diagram("UCBN-06 - Xem lịch sử và kết quả khám [Activity]");
    var cx = 290;
    var i0 = initial(d, cx - 10, 30);
    var a1 = act(d, "Chọn mục Lịch sử khám bệnh", cx - 110, 90);
    var d1 = dec(d, cx - 20, 160);
    var a2 = act(d, "Thông báo: Chưa có lịch sử khám", cx + 80, 230, 220, 40);
    var a3 = act(d, "Hiển thị danh sách lần khám\n(sắp xếp ngày giảm dần)", cx - 180, 230, 220, 50);
    var a4 = act(d, "Chọn một lần khám xem chi tiết", cx - 110, 320);
    var d2 = dec(d, cx - 20, 400);
    var a5 = act(d, "Thông báo: Kết quả chưa được cập nhật", cx + 80, 470, 240, 40);
    var a6 = act(d, "Hiển thị: ngày khám, bác sĩ, dịch vụ\nchẩn đoán, đơn thuốc, ghi chú", cx - 190, 470, 230, 50);
    var f0 = fin(d, cx - 15, 570);
    var f1 = fin(d, cx + 200, 230);
    var f2 = fin(d, cx + 200, 470);

    flow(d, i0, a1);
    flow(d, a1, d1);
    flow(d, d1, a2, "Chưa có lịch sử");
    flow(d, a2, f1);
    flow(d, d1, a3, "Có lịch sử");
    flow(d, a3, a4);
    flow(d, a4, d2);
    flow(d, d2, a5, "Chưa có kết quả");
    flow(d, a5, f2);
    flow(d, d2, a6, "Có kết quả");
    flow(d, a6, f0);
  })();

  // ============================================================
  // UCBN-07 — TƯ VẤN SỨC KHỎE VỚI AI
  // ============================================================
  (function () {
    var d   = diagram("UCBN-07 - Tư vấn sức khỏe với AI [Activity]");
    var cx  = 290;
    var i0  = initial(d, cx - 10, 30);
    var a1  = act(d, "Chọn mục Tư vấn AI", cx - 110, 90);
    var a2  = act(d, "Hệ thống khởi tạo phiên trò chuyện", cx - 110, 160);
    var a3  = act(d, "Bệnh nhân nhập câu hỏi và nhấn Gửi", cx - 110, 230);
    var d1  = dec(d, cx - 20, 300);
    var a4  = act(d, "Thông báo lỗi kết nối\nYêu cầu thử lại", cx + 80, 370, 210, 50);
    var a5  = act(d, "Tìm kiếm trong kho kiến thức y tế", cx - 180, 370);
    var d2  = dec(d, cx - 20, 460);
    var a6  = act(d, "Tổng hợp phản hồi từ kho kiến thức", cx - 220, 530, 220, 40);
    var a7  = act(d, "Trả lời từ kiến thức chung\nKhuyến nghị đặt lịch trực tiếp", cx + 60, 530, 220, 50);
    var a8  = act(d, "Hiển thị phản hồi AI cho bệnh nhân", cx - 110, 630);
    var d3  = dec(d, cx - 20, 710);
    var f0  = fin(d, cx - 15, 800);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, a3);
    flow(d, a3, d1);
    flow(d, d1, a4, "Lỗi kết nối");
    flow(d, a4, a3);
    flow(d, d1, a5, "Kết nối thành công");
    flow(d, a5, d2);
    flow(d, d2, a6, "Tìm thấy tài liệu");
    flow(d, d2, a7, "Không tìm thấy");
    flow(d, a6, a8);
    flow(d, a7, a8);
    flow(d, a8, d3);
    flow(d, d3, a3, "Tiếp tục hỏi");
    flow(d, d3, f0, "Kết thúc phiên");
  })();

  // ============================================================
  // UCBS-01 — XEM LỊCH LÀM VIỆC VÀ LỊCH HẸN
  // ============================================================
  (function () {
    var d  = diagram("UCBS-01 - Xem lịch làm việc và lịch hẹn [Activity]");
    var cx = 290;
    var i0 = initial(d, cx - 10, 30);
    var a1 = act(d, "Chọn mục Lịch làm việc / Lịch hẹn", cx - 110, 90);
    var d1 = dec(d, cx - 20, 160);
    var a2 = act(d, "Thông báo: Chưa có lịch được phân công", cx + 80, 230, 240, 40);
    var a3 = act(d, "Hiển thị lịch làm việc theo tuần\nvà danh sách lịch hẹn trong ngày", cx - 190, 230, 230, 50);
    var a4 = act(d, "Điều hướng sang tuần/ngày khác", cx - 110, 330);
    var d2 = dec(d, cx - 20, 410);
    var a5 = act(d, "Thông báo: Không có lịch hẹn hôm nay", cx + 80, 480, 240, 40);
    var a6 = act(d, "Chọn một lịch hẹn cụ thể", cx - 190, 480);
    var a7 = act(d, "Hiển thị chi tiết lịch hẹn\nvà thông tin bệnh nhân", cx - 110, 570, 220, 50);
    var f0 = fin(d, cx - 15, 670);
    var f1 = fin(d, cx + 200, 230);
    var f2 = fin(d, cx + 200, 480);

    flow(d, i0, a1);
    flow(d, a1, d1);
    flow(d, d1, a2, "Chưa có lịch");
    flow(d, a2, f1);
    flow(d, d1, a3, "Có lịch");
    flow(d, a3, a4);
    flow(d, a4, d2);
    flow(d, d2, a5, "Không có lịch hẹn");
    flow(d, a5, f2);
    flow(d, d2, a6, "Có lịch hẹn");
    flow(d, a6, a7);
    flow(d, a7, f0);
  })();

  // ============================================================
  // UCBS-02 — XÁC NHẬN LỊCH HẸN
  // ============================================================
  (function () {
    var d  = diagram("UCBS-02 - Xác nhận lịch hẹn [Activity]");
    var cx = 290;
    var i0 = initial(d, cx - 10, 30);
    var a1 = act(d, "Chọn lịch hẹn trạng thái Chờ xác nhận", cx - 110, 90);
    var a2 = act(d, "Hiển thị chi tiết lịch hẹn\nvà 2 tùy chọn: Xác nhận / Từ chối", cx - 120, 160, 230, 50);
    var d1 = dec(d, cx - 20, 250);
    var a3 = act(d, "Cập nhật trạng thái: Đã xác nhận", cx - 220, 330, 220, 40);
    var a4 = act(d, "Nhập lý do từ chối", cx + 80, 330);
    var d2 = dec(d, cx + 100, 420);
    var a5 = act(d, "Thông báo: Cần nhập lý do\ntrước khi từ chối", cx + 180, 490, 220, 50);
    var a6 = act(d, "Cập nhật trạng thái: Đã hủy", cx + 80, 490);
    var m1 = mrg(d, cx - 20, 590);
    var a7 = act(d, "Gửi thông báo kết quả cho bệnh nhân", cx - 110, 660);
    var f0 = fin(d, cx - 15, 750);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, d1);
    flow(d, d1, a3, "Xác nhận");
    flow(d, d1, a4, "Từ chối");
    flow(d, a3, m1);
    flow(d, a4, d2);
    flow(d, d2, a5, "Chưa nhập lý do");
    flow(d, a5, a4);
    flow(d, d2, a6, "Đã nhập lý do");
    flow(d, a6, m1);
    flow(d, m1, a7);
    flow(d, a7, f0);
  })();

  // ============================================================
  // UCBS-03 — NHẬP KẾT QUẢ KHÁM
  // ============================================================
  (function () {
    var d   = diagram("UCBS-03 - Nhập kết quả khám [Activity]");
    var cx  = 290;
    var i0  = initial(d, cx - 10, 30);
    var a1  = act(d, "Chọn lịch hẹn trạng thái Check-in", cx - 110, 90);
    var a2  = act(d, "Hiển thị chi tiết và form nhập kết quả", cx - 120, 160, 230, 40);
    var a3  = act(d, "Điền chẩn đoán, đơn thuốc,\nghi chú điều trị, ngày tái khám", cx - 120, 230, 230, 50);
    var a4  = act(d, "Nhấn Lưu kết quả", cx - 110, 310);
    var d1  = dec(d, cx - 20, 390);
    var a5  = act(d, "Thông báo lỗi: Cần nhập chẩn đoán\n(trường bắt buộc)", cx + 80, 460, 230, 50);
    var a6  = act(d, "Hệ thống lưu kết quả khám", cx - 190, 460);
    var a7  = act(d, "Cập nhật trạng thái: Hoàn thành", cx - 110, 550);
    var a8  = act(d, "Gửi thông báo kết quả cho bệnh nhân", cx - 110, 630);
    var f0  = fin(d, cx - 15, 720);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, a3);
    flow(d, a3, a4);
    flow(d, a4, d1);
    flow(d, d1, a5, "Chẩn đoán trống");
    flow(d, a5, a3);
    flow(d, d1, a6, "Hợp lệ");
    flow(d, a6, a7);
    flow(d, a7, a8);
    flow(d, a8, f0);
  })();

  // ============================================================
  // UCBS-04 — XEM HỒ SƠ BỆNH NHÂN
  // ============================================================
  (function () {
    var d  = diagram("UCBS-04 - Xem hồ sơ bệnh nhân [Activity]");
    var cx = 290;
    var i0 = initial(d, cx - 10, 30);
    var a1 = act(d, "Mở chi tiết lịch hẹn\nvà nhấn vào tên bệnh nhân", cx - 110, 90, 220, 50);
    var a2 = act(d, "Hiển thị thông tin cá nhân:\nhọ tên, ngày sinh, giới tính, SĐT", cx - 120, 170, 230, 50);
    var d1 = dec(d, cx - 20, 260);
    var a3 = act(d, "Thông báo: Chưa có dữ liệu lịch sử", cx + 80, 330, 230, 40);
    var a4 = act(d, "Hiển thị danh sách lịch sử\ncác lần khám trước", cx - 190, 330, 220, 50);
    var a5 = act(d, "Chọn một lần khám xem chi tiết", cx - 110, 430);
    var a6 = act(d, "Hiển thị kết quả khám chi tiết", cx - 110, 510);
    var f0 = fin(d, cx - 15, 600);
    var f1 = fin(d, cx + 200, 330);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, d1);
    flow(d, d1, a3, "Chưa có lịch sử");
    flow(d, a3, f1);
    flow(d, d1, a4, "Có lịch sử");
    flow(d, a4, a5);
    flow(d, a5, a6);
    flow(d, a6, f0);
  })();

  // ============================================================
  // UCBS-05 — TẠO ĐƠN XIN NGHỈ PHÉP
  // ============================================================
  (function () {
    var d   = diagram("UCBS-05 - Tạo đơn xin nghỉ phép [Activity]");
    var cx  = 290;
    var i0  = initial(d, cx - 10, 30);
    var a1  = act(d, "Truy cập Đơn xin nghỉ phép\nvà nhấn Tạo đơn mới", cx - 120, 90, 230, 50);
    var a2  = act(d, "Hiển thị form tạo đơn nghỉ phép", cx - 110, 170);
    var a3  = act(d, "Chọn ngày nghỉ và nhập lý do", cx - 110, 240);
    var a4  = act(d, "Nhấn Gửi đơn", cx - 110, 310);
    var d1  = dec(d, cx - 20, 390);
    var a5  = act(d, "Thông báo: Trùng ngày đã có đơn", cx + 80, 460, 230, 40);
    var d2  = dec(d, cx - 20, 540);
    var a6  = act(d, "Thông báo: Ngày ngoài lịch làm việc", cx + 80, 610, 240, 40);
    var a7  = act(d, "Tạo đơn trạng thái: Chờ duyệt", cx - 190, 610);
    var a8  = act(d, "Gửi thông báo đến Admin", cx - 110, 700);
    var f0  = fin(d, cx - 15, 790);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, a3);
    flow(d, a3, a4);
    flow(d, a4, d1);
    flow(d, d1, a5, "Trùng ngày");
    flow(d, a5, a3);
    flow(d, d1, d2, "Không trùng");
    flow(d, d2, a6, "Ngoài lịch làm việc");
    flow(d, a6, a3);
    flow(d, d2, a7, "Hợp lệ");
    flow(d, a7, a8);
    flow(d, a8, f0);
  })();

  // ============================================================
  // UCAD-01 — QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG
  // ============================================================
  (function () {
    var d   = diagram("UCAD-01 - Quản lý tài khoản người dùng [Activity]");
    var cx  = 290;
    var i0  = initial(d, cx - 10, 30);
    var a1  = act(d, "Chọn quản lý Bệnh nhân / Bác sĩ", cx - 110, 90);
    var a2  = act(d, "Hiển thị danh sách tài khoản\nvà tùy chọn: Thêm, Sửa, Khóa, Xóa", cx - 130, 160, 250, 50);
    var d1  = dec(d, cx - 20, 250);
    var a3  = act(d, "Điền thông tin và nhấn Tạo", cx - 240, 330, 200, 40);
    var a4  = act(d, "Chỉnh sửa thông tin\nvà nhấn Lưu", cx - 20, 330, 180, 50);
    var a5  = act(d, "Xác nhận\nKhóa/Mở khóa", cx + 180, 330, 170, 50);
    var a6  = act(d, "Xác nhận Xóa\ntài khoản", cx + 370, 330, 150, 50);
    var d2  = dec(d, cx - 240, 420);
    var a7  = act(d, "Thông báo: Email đã tồn tại", cx - 360, 500, 210, 40);
    var d3  = dec(d, cx + 370, 420);
    var a8  = act(d, "Cảnh báo: Không thể xóa\n(Còn lịch hẹn chưa hoàn thành)", cx + 310, 500, 220, 50);
    var m1  = mrg(d, cx - 20, 590);
    var a9  = act(d, "Lưu thay đổi vào hệ thống", cx - 110, 660);
    var f0  = fin(d, cx - 15, 750);
    var f1  = fin(d, cx + 200, 590);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, d1);
    flow(d, d1, a3, "Thêm mới");
    flow(d, d1, a4, "Chỉnh sửa");
    flow(d, d1, a5, "Khóa/Mở");
    flow(d, d1, a6, "Xóa");
    flow(d, a3, d2);
    flow(d, d2, a7, "Email trùng");
    flow(d, a7, a3);
    flow(d, d2, m1, "Hợp lệ");
    flow(d, a4, m1);
    flow(d, a5, m1);
    flow(d, a6, d3);
    flow(d, d3, a8, "Còn lịch hẹn");
    flow(d, a8, f1);
    flow(d, d3, m1, "Không còn lịch");
    flow(d, m1, a9);
    flow(d, a9, f0);
  })();

  // ============================================================
  // UCAD-02 — PHÂN CÔNG LỊCH LÀM VIỆC BÁC SĨ
  // ============================================================
  (function () {
    var d  = diagram("UCAD-02 - Phân công lịch làm việc bác sĩ [Activity]");
    var cx = 290;
    var i0 = initial(d, cx - 10, 30);
    var a1 = act(d, "Truy cập Quản lý lịch làm việc\nvà chọn bác sĩ", cx - 120, 90, 230, 50);
    var a2 = act(d, "Hiển thị lịch làm việc hiện tại\ntheo tuần", cx - 110, 170, 220, 50);
    var a3 = act(d, "Chọn tuần, ngày làm việc\nvà thiết lập giờ bắt đầu – kết thúc", cx - 120, 250, 230, 50);
    var a4 = act(d, "Nhấn Lưu lịch", cx - 110, 340);
    var d1 = dec(d, cx - 20, 420);
    var a5 = act(d, "Thông báo: Lịch không hợp lệ\nYêu cầu nhập lại", cx + 80, 490, 230, 50);
    var a6 = act(d, "Hệ thống lưu lịch làm việc", cx - 190, 490);
    var a7 = act(d, "Cập nhật khung giờ khả dụng\ncho bệnh nhân khi đặt lịch", cx - 120, 580, 230, 50);
    var f0 = fin(d, cx - 15, 680);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, a3);
    flow(d, a3, a4);
    flow(d, a4, d1);
    flow(d, d1, a5, "Giờ kết thúc ≤ giờ bắt đầu");
    flow(d, a5, a3);
    flow(d, d1, a6, "Hợp lệ");
    flow(d, a6, a7);
    flow(d, a7, f0);
  })();

  // ============================================================
  // UCAD-03 — PHÊ DUYỆT ĐƠN XIN NGHỈ PHÉP
  // ============================================================
  (function () {
    var d   = diagram("UCAD-03 - Phê duyệt đơn xin nghỉ phép [Activity]");
    var cx  = 290;
    var i0  = initial(d, cx - 10, 30);
    var a1  = act(d, "Truy cập Quản lý đơn nghỉ phép", cx - 110, 90);
    var a2  = act(d, "Hiển thị danh sách đơn đang chờ duyệt", cx - 130, 160, 250, 40);
    var a3  = act(d, "Chọn một đơn xem chi tiết\n(tên bác sĩ, ngày nghỉ, lý do)", cx - 120, 230, 230, 50);
    var d1  = dec(d, cx - 20, 320);
    var a4  = act(d, "Cập nhật: Đã duyệt\nĐánh dấu ngày nghỉ", cx - 220, 400, 220, 50);
    var a5  = act(d, "Nhập lý do từ chối", cx + 80, 400);
    var a6  = act(d, "Ẩn khung giờ bác sĩ\nkhi bệnh nhân đặt lịch", cx - 220, 490, 220, 50);
    var d2  = dec(d, cx + 100, 490);
    var a7  = act(d, "Thông báo: Cần nhập lý do", cx + 200, 560, 210, 40);
    var a8  = act(d, "Cập nhật: Từ chối", cx + 80, 560);
    var m1  = mrg(d, cx - 20, 660);
    var a9  = act(d, "Gửi thông báo kết quả đến bác sĩ", cx - 110, 730);
    var f0  = fin(d, cx - 15, 820);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, a3);
    flow(d, a3, d1);
    flow(d, d1, a4, "Phê duyệt");
    flow(d, d1, a5, "Từ chối");
    flow(d, a4, a6);
    flow(d, a6, m1);
    flow(d, a5, d2);
    flow(d, d2, a7, "Chưa nhập lý do");
    flow(d, a7, a5);
    flow(d, d2, a8, "Đã nhập lý do");
    flow(d, a8, m1);
    flow(d, m1, a9);
    flow(d, a9, f0);
  })();

  // ============================================================
  // UCAD-04 — QUẢN LÝ DỊCH VỤ
  // ============================================================
  (function () {
    var d   = diagram("UCAD-04 - Quản lý dịch vụ [Activity]");
    var cx  = 290;
    var i0  = initial(d, cx - 10, 30);
    var a1  = act(d, "Chọn mục Quản lý dịch vụ", cx - 110, 90);
    var a2  = act(d, "Hiển thị danh sách dịch vụ\nvà tùy chọn: Thêm, Sửa, Xóa", cx - 120, 160, 230, 50);
    var d1  = dec(d, cx - 20, 250);
    var a3  = act(d, "Điền tên, mô tả, thời lượng,\ngiá và nhấn Tạo dịch vụ", cx - 230, 330, 220, 50);
    var a4  = act(d, "Cập nhật thông tin\nvà nhấn Lưu", cx - 10, 330, 180, 50);
    var a5  = act(d, "Xác nhận xóa dịch vụ", cx + 200, 330, 180, 40);
    var d2  = dec(d, cx - 230, 430);
    var a6  = act(d, "Thông báo: Thiếu trường bắt buộc", cx - 350, 500, 230, 40);
    var a7  = act(d, "Ẩn dịch vụ khỏi danh sách bệnh nhân", cx + 200, 430, 200, 50);
    var m1  = mrg(d, cx - 20, 590);
    var a8  = act(d, "Lưu/Cập nhật dịch vụ vào hệ thống", cx - 120, 660, 230, 40);
    var f0  = fin(d, cx - 15, 750);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, d1);
    flow(d, d1, a3, "Thêm mới");
    flow(d, d1, a4, "Chỉnh sửa");
    flow(d, d1, a5, "Xóa");
    flow(d, a3, d2);
    flow(d, d2, a6, "Thiếu trường");
    flow(d, a6, a3);
    flow(d, d2, m1, "Hợp lệ");
    flow(d, a4, m1);
    flow(d, a5, a7);
    flow(d, a7, f0);
    flow(d, m1, a8);
    flow(d, a8, f0);
  })();

  // ============================================================
  // UCAD-05 — QUẢN LÝ LỊCH HẸN TOÀN PHÒNG KHÁM
  // ============================================================
  (function () {
    var d   = diagram("UCAD-05 - Quản lý lịch hẹn toàn phòng khám [Activity]");
    var cx  = 290;
    var i0  = initial(d, cx - 10, 30);
    var a1  = act(d, "Truy cập Quản lý lịch hẹn", cx - 110, 90);
    var a2  = act(d, "Hiển thị toàn bộ lịch hẹn\nvà bộ lọc (trạng thái/ngày/bác sĩ)", cx - 120, 160, 230, 50);
    var d1  = dec(d, cx - 20, 260);
    var a3  = act(d, "Tìm lịch hẹn cần check-in\nvà xác nhận", cx - 220, 340, 220, 50);
    var a4  = act(d, "Hủy lịch hẹn và\ngửi thông báo các bên", cx + 80, 340, 210, 50);
    var a5  = act(d, "Cập nhật trạng thái: Check-in", cx - 220, 440);
    var a6  = act(d, "Gửi thông báo đến bác sĩ\nvề bệnh nhân đã check-in", cx - 220, 520, 220, 50);
    var f0  = fin(d, cx - 15, 630);
    var f1  = fin(d, cx + 160, 440);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, d1);
    flow(d, d1, a3, "Check-in bệnh nhân");
    flow(d, d1, a4, "Hủy lịch hẹn");
    flow(d, a4, f1);
    flow(d, a3, a5);
    flow(d, a5, a6);
    flow(d, a6, f0);
  })();

  // ============================================================
  // UCAD-06 — XEM BÁO CÁO VÀ THỐNG KÊ
  // ============================================================
  (function () {
    var d  = diagram("UCAD-06 - Xem báo cáo và thống kê [Activity]");
    var cx = 290;
    var i0 = initial(d, cx - 10, 30);
    var a1 = act(d, "Truy cập mục Báo cáo & Thống kê", cx - 110, 90);
    var a2 = act(d, "Chọn khoảng thời gian\nvà loại thống kê cần xem", cx - 110, 160, 220, 50);
    var a3 = act(d, "Hệ thống truy vấn và\ntổng hợp dữ liệu", cx - 110, 240);
    var a4 = act(d, "Hiển thị biểu đồ và số liệu:\nSố lịch hẹn, tỷ lệ trạng thái,\ndoanh thu dịch vụ, bác sĩ tiếp nhận", cx - 120, 330, 230, 70);
    var d1 = dec(d, cx - 20, 450);
    var a5 = act(d, "Xuất file báo cáo", cx - 190, 530);
    var f0 = fin(d, cx - 15, 630);
    var f1 = fin(d, cx + 160, 530);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, a3);
    flow(d, a3, a4);
    flow(d, a4, d1);
    flow(d, d1, a5, "Xuất báo cáo");
    flow(d, d1, f1, "Không xuất");
    flow(d, a5, f0);
  })();

  // ============================================================
  // UCAD-07 — QUẢN LÝ TÀI LIỆU KIẾN THỨC AI
  // ============================================================
  (function () {
    var d   = diagram("UCAD-07 - Quản lý tài liệu kiến thức AI [Activity]");
    var cx  = 290;
    var i0  = initial(d, cx - 10, 30);
    var a1  = act(d, "Truy cập Quản lý kiến thức AI", cx - 110, 90);
    var a2  = act(d, "Hiển thị danh sách tài liệu\nvà tùy chọn: Tải lên, Cập nhật, Xóa", cx - 130, 160, 250, 50);
    var d1  = dec(d, cx - 20, 260);
    var a3  = act(d, "Chọn file tài liệu\n(PDF, DOCX, TXT)", cx - 230, 340, 210, 50);
    var a4  = act(d, "Chọn tài liệu cần cập nhật\nvà tải file mới", cx - 10, 340, 200, 50);
    var a5  = act(d, "Xác nhận xóa tài liệu", cx + 210, 340, 180, 40);
    var d2  = dec(d, cx - 230, 440);
    var a6  = act(d, "Thông báo: Định dạng không hỗ trợ", cx - 360, 510, 230, 40);
    var a7  = act(d, "Xóa tài liệu khỏi kho kiến thức", cx + 210, 440, 200, 40);
    var m1  = mrg(d, cx - 20, 600);
    var a8  = act(d, "Hệ thống xử lý và lập chỉ mục\ntài liệu vào kho kiến thức", cx - 120, 670, 230, 50);
    var f0  = fin(d, cx - 15, 770);
    var f1  = fin(d, cx + 200, 510);

    flow(d, i0, a1);
    flow(d, a1, a2);
    flow(d, a2, d1);
    flow(d, d1, a3, "Tải lên mới");
    flow(d, d1, a4, "Cập nhật");
    flow(d, d1, a5, "Xóa");
    flow(d, a3, d2);
    flow(d, d2, a6, "Định dạng không đúng");
    flow(d, a6, a3);
    flow(d, d2, m1, "Định dạng đúng");
    flow(d, a4, m1);
    flow(d, a5, a7);
    flow(d, a7, f1);
    flow(d, m1, a8);
    flow(d, a8, f0);
  })();

  console.log(
    "✅ Hoàn thành! Đã tạo 23 Biểu đồ Hoạt động (UMLActivityDiagram)\n" +
    "   UC01–UC04 | UCBN-01–07 | UCBS-01–05 | UCAD-01–07"
  );
})();
