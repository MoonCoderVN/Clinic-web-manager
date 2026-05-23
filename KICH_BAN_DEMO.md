# 🎓 Kịch Bản Demo & Chiến Thuật Bảo Vệ Khóa Luận Tốt Nghiệp
## 🦷 Hệ Thống Quản Lý Phòng Khám Nha Khoa DentaCare MERN + RAG AI

> 💡 **Khẩu quyết bảo vệ khóa luận:** *“70% trình bày, 30% code”*. Hội đồng giám khảo (thầy cô) chấm điểm dựa trên khả năng giải quyết bài toán thực tế, mức độ hoàn thiện của sản phẩm, tính logic của quy trình và các công nghệ nổi bật (Realtime, RAG AI, chống Race Condition). 
> 
> Bản tài liệu này thiết kế **Kịch bản Demo Vàng** dài **7 - 8 phút** giúp bạn tự tin đạt điểm xuất sắc (Điểm 9 - 10) trước Hội đồng.

---

## 🎯 PHẦN 1: CHIẾN THUẬT VÀ CHUẨN BỊ TRƯỚC GIỜ G

### 1. Chuẩn bị môi trường Demo sạch
*   **Chạy Seed dữ liệu mẫu:** Chắc chắn bạn đã chạy lệnh `npm run seed` ở thư mục server trước buổi bảo vệ. Lệnh này tạo sẵn 4 bác sĩ, 4 bệnh nhân, 7 dịch vụ, lịch trực, và các lịch hẹn mẫu với đầy đủ các trạng thái để giao diện trông chân thực, đẹp mắt nhất.
*   **Mở sẵn các trình duyệt khác nhau để demo realtime:**
    *   **Trình duyệt 1 (Chrome):** Đăng nhập tài khoản Bệnh nhân (`patient.triet@gmail.com` / `Patient@123456`).
    *   **Trình duyệt 2 (Chrome Trình duyệt ẩn danh - Incognito):** Đăng nhập tài khoản Bác sĩ (`dr.an@dentacare.com` / `Doctor@123456`).
    *   **Trình duyệt 3 (Trình duyệt Edge hoặc Firefox):** Đăng nhập tài khoản Admin (`admin@dentacare.com` / `Admin@123456`).
*   *Lưu ý:* Việc mở sẵn 3 trình duyệt giúp bạn chuyển đổi vai trò (role) cực nhanh mà không cần mất thời gian Đăng xuất/Đăng nhập lại, tạo sự mượt mà và chứng minh tính năng Realtime (Socket.io) hoạt động tức thì.

### 2. Phân bổ thời gian thuyết trình (Tổng cộng 15 phút)
1.  **Phần Slide (5 phút):** Nêu lý do chọn đề tài, các nỗi đau thực tế của phòng khám nha khoa (quản lý thủ công, đặt trùng lịch, bệnh nhân quên lịch hẹn, thiếu kênh tư vấn y khoa tự động đáng tin cậy), kiến trúc hệ thống (layered architecture), và sơ đồ cơ sở dữ liệu (ERD).
2.  **Phần Live Demo (7 - 8 phút):** Đi theo kịch bản quy trình lâm sàng khép kín dưới đây.
3.  **Phần Code & Hỏi đáp Q&A (3 phút):** Trả lời các câu hỏi phản biện của thầy cô.

---

## 🎬 PHẦN 2: KỊCH BẢN LIVE DEMO CHI TIẾT (7 PHÚT VÀNG)

### 🧑‍⚕️ Vai Trò 1: Trải nghiệm Bệnh nhân (Patient Workflow) — 2.5 Phút
*Mục tiêu: Cho thầy cô thấy giao diện đặt lịch trực quan, công nghệ kiểm tra trống slot thực tế (Availability), tính năng realtime và sự thông minh vượt trội của RAG AI Chatbot.*

1.  **Giới thiệu & Đăng nhập:**
    *   *Lời thoại:* "Sau đây em xin phép bắt đầu phần demo hệ thống DentaCare dưới góc nhìn của bệnh nhân Lê Minh Triết."
    *   *Thao tác:* Đăng nhập tài khoản `patient.triet@gmail.com`. Show màn hình trang cá nhân và lịch sử điều trị.
2.  **Đặt lịch hẹn thông minh (Chống Race Condition):**
    *   *Lời thoại:* "Điểm đặc biệt của hệ thống là khả năng kiểm tra lịch trống của bác sĩ theo thời gian thực. Bệnh nhân muốn đặt lịch khám **Tẩy trắng răng công nghệ cao** với **Bác sĩ Nguyễn Văn An**."
    *   *Thao tác:* Vào trang đặt lịch, chọn dịch vụ "Tẩy trắng răng công nghệ cao", chọn bác sĩ "Nguyễn Văn An".
    *   *Trình bày:* Giải thích cho thầy cô thấy khi chọn ngày hôm nay hoặc ngày mai, hệ thống tự động gọi API `getAvailability` để tính toán các slot giờ trống khả dụng (30-60 phút tùy dịch vụ), loại trừ những giờ bác sĩ đã có lịch hẹn hoặc lịch xin nghỉ phép được duyệt.
    *   *Thao tác:* Chọn một slot giờ trống (ví dụ: `14:30`), nhập ghi chú *"Răng em hơi nhạy cảm nhờ bác sĩ làm nhẹ tay"*, bấm **Đặt lịch**. Giao diện báo đặt thành công và hiển thị trạng thái lịch hẹn là **Chờ duyệt (Pending)**.
3.  **Trải nghiệm Trợ lý RAG AI Chatbot chuyên khoa:**
    *   *Lời thoại:* "Bên cạnh đó, để hỗ trợ bệnh nhân 24/7, hệ thống tích hợp Trợ lý RAG AI nha khoa. Không giống chatbot thông thường hay trả lời mơ hồ hoặc tự bịa thông tin, AI của DentaCare được huấn luyện trực tiếp trên tài liệu y khoa nội bộ của phòng khám thông qua công nghệ MongoDB Atlas Vector Search và mô hình Gemini."
    *   *Thao tác:* Bấm vào biểu tượng Chatbot ở góc phải màn hình.
    *   *Thao tác chat:* Gõ câu hỏi: **"Sau khi tẩy trắng răng tôi cần kiêng ăn những gì và trong bao lâu?"**
    *   *Trình bày:* Khi AI trả lời, hãy nhấn mạnh: "Như thầy cô thấy, câu trả lời cực kỳ chi tiết, khoa học, khuyên kiêng đồ ăn có màu sậm (cà phê, nước tương), tránh đồ quá nóng/lạnh trong 24-48 giờ đầu. Đây là kiến thức chuẩn được truy xuất trực tiếp từ cẩm nang y khoa của phòng khám mà quản trị viên đã tải lên."

---

### 👨‍⚕️ Vai Trò 2: Trải nghiệm Bác sĩ chuyên khoa (Doctor Workflow) — 2.5 Phút
*Mục tiêu: Chứng minh tính năng realtime (Socket.io) đồng bộ dữ liệu tức thì, quy trình lâm sàng số hóa (bệnh án, chẩn đoán, kê đơn thuốc), và tính năng tự động khóa lịch thông minh khi bác sĩ xin nghỉ phép.*

1.  **Nhận thông báo Realtime & Phê duyệt lịch hẹn:**
    *   *Thao tác:* Chuyển sang **Trình duyệt 2 (Bác sĩ Nguyễn Văn An)**.
    *   *Trình bày:* "Ngay lập tức, trên màn hình bác sĩ xuất hiện thông báo đẩy thời gian thực báo có lịch hẹn mới từ bệnh nhân Lê Minh Triết mà không cần tải lại trang (F5)."
    *   *Thao tác:* Bác sĩ xem chi tiết ghi chú của bệnh nhân, bấm **Phê duyệt (Confirm)**. 
    *   *(Nếu muốn, bạn có thể quay lại Trình duyệt 1 của Bệnh nhân để show trạng thái đã chuyển thành "Confirmed" thời gian thực! Thầy cô sẽ cực kỳ ấn tượng).*
2.  **Khám bệnh, ghi Bệnh án & Kê đơn thuốc (E-Prescription):**
    *   *Thao tác:* Tại danh sách khám của bác sĩ An, chọn lịch hẹn vừa rồi của bệnh nhân Triết (hoặc một lịch hẹn Completed/In progress khác có sẵn). Bấm **Bắt đầu khám (In Progress)** rồi **Hoàn thành khám (Completed)**.
    *   *Thao tác:* Nhập thông tin chẩn đoán lâm sàng: **"Răng xỉn màu nhẹ, tiến hành tẩy trắng bằng công nghệ Laser LED."**
    *   *Thao tác:* Kê đơn thuốc y khoa: **"Kem đánh răng chống ê buốt Sensodyne (1 tuýp), nước súc miệng kháng khuẩn Kin (1 chai)."** Nhập ngày hẹn tái khám (Next Date) sau 6 tháng. Bấm **Lưu kết quả**.
    *   *Trình bày:* "Hồ sơ bệnh án điện tử này lập tức được lưu vào collection `ExamResult` kết nối trực tiếp với lịch sử bệnh án của bệnh nhân. Đồng thời hệ thống trigger cron job ngầm để tự động gửi email nhắc lịch hẹn tái khám khi đến hạn."
3.  **Xin nghỉ phép & Khóa lịch tự động (Leave Request):**
    *   *Lời thoại:* "Một tính năng thực tiễn cao là quản lý lịch làm việc linh hoạt. Giả sử Bác sĩ An đột xuất xin nghỉ phép vào ngày mai."
    *   *Thao tác:* Vào mục "Đăng ký nghỉ phép (Leave Request)", chọn ngày mai, lý do "Họp chuyên môn y khoa tại Sở Y tế", bấm gửi yêu cầu.
    *   *Thao tác:* Chuyển nhanh sang **Trình duyệt 3 (Admin)** -> Vào danh mục duyệt nghỉ phép, bấm **Phê duyệt (Approved)**.
    *   *Thao tác:* Chuyển lại **Trình duyệt 1 (Bệnh nhân)** -> Thử đặt lịch với Bác sĩ An vào ngày mai.
    *   *Trình bày:* "Thầy cô có thể thấy, sau khi lịch nghỉ của bác sĩ được duyệt, toàn bộ các slot giờ làm việc của bác sĩ An vào ngày mai đã bị hệ thống tự động khóa và ẩn đi, ngăn chặn bệnh nhân đặt lịch vào thời gian bác sĩ vắng mặt."

---

### 👑 Vai Trò 3: Trải nghiệm Admin (Admin Dashboard & RAG Training) — 2 Phút
*Mục tiêu: Trình diễn các báo cáo thống kê trực quan (Recharts) hỗ trợ ra quyết định kinh doanh phòng khám và trực tiếp huấn luyện tri thức mới cho RAG AI Chatbot.*

1.  **Dashboard Báo cáo & Thống kê doanh thu:**
    *   *Thao tác:* Vào **Trình duyệt 3 (Admin)**. Show trang chủ admin.
    *   *Trình bày:* "Giao diện Admin Dashboard cung cấp cái nhìn tổng quan về hiệu suất phòng khám qua các biểu đồ doanh thu theo tháng, tần suất sử dụng của từng loại dịch vụ (Cạo vôi, Bọc sứ, Nhổ răng khôn), giúp chủ phòng khám nắm bắt xu hướng kinh doanh nhanh chóng."
2.  **Huấn luyện RAG AI bằng tài liệu mới (AI Knowledge Training) — TÍNH NĂNG ĐIỂM 10:**
    *   *Lời thoại:* "Điểm đột phá nhất của đề tài là Admin có thể tự huấn luyện Trợ lý AI bằng cách tải lên các văn bản, cẩm nang điều trị mới của phòng khám."
    *   *Thao tác:* Vào mục **Quản lý tri thức AI (Knowledge Management)**.
    *   *Trình bày:* "Tại đây, em đã tải lên các tệp tài liệu hướng dẫn chăm sóc nha khoa lâm sàng. Hệ thống sử dụng thư viện LangChain để tự động phân đoạn văn bản (text splitting), dùng Gemini để nhúng vector (generate embeddings) và lưu trữ trực tiếp vào MongoDB Atlas Vector Search. Khi có quy trình điều trị mới, admin chỉ cần tải tệp tin lên là AI lập tức được cập nhật tri thức mà không cần train lại mô hình từ đầu."

---

## 💬 PHẦN 3: BỘ CÂU HỎI PHẢN BIỆN KINH ĐIỂN & GỢI Ý TRẢ LỜI

Khi bạn thuyết trình các công nghệ tiên tiến (RAG, Realtime, Race Condition), thầy cô chắc chắn sẽ đặt câu hỏi để kiểm tra xem bạn tự viết code hay lấy nguồn khác. Dưới đây là các câu hỏi thường gặp nhất và cách trả lời chuẩn kỹ thuật:

### ❓ Câu 1: Hệ thống giải quyết bài toán Đặt trùng lịch (Race Condition) như thế nào nếu 2 bệnh nhân cùng đặt một slot giờ của cùng một bác sĩ tại cùng một thời điểm?
*   **Cách trả lời ghi điểm tuyệt đối:**
    *   "Dạ thưa thầy cô, hệ thống của em giải quyết bài toán này triệt để bằng hai lớp phòng vệ:"
    *   **Lớp 1 (Application level):** Khi bệnh nhân chọn slot giờ, API `getAvailability` sẽ liên tục truy vấn và lọc bỏ các slot đã bị chiếm trong các lịch hẹn có trạng thái active (`pending`, `confirmed`, `rescheduled`, `in_progress`).
    *   **Lớp 2 (Database level - Quan trọng nhất):** Để chống race condition tuyệt đối ở mức hạ tầng (khi 2 request đến cùng một mili-giây mà lớp 1 chưa kịp phản hồi), em đã cấu hình **Unique Partial Index** trong Mongoose Schema của Appointment:
        ```javascript
        appointmentSchema.index(
            { doctorId: 1, appointmentDate: 1, startTime: 1 },
            {
                unique: true,
                partialFilterExpression: { status: { $in: ["pending", "confirmed", "rescheduled", "in_progress"] } },
                name: "unique_active_slot"
            }
        );
        ```
    *   "Nếu hai tiến trình ghi đồng thời xảy ra, MongoDB sẽ chặn đứng tiến trình thứ hai ở mức thread-safe và ném ra lỗi trùng chỉ mục (E11000 duplicate key error). Backend sẽ bắt lỗi này và trả về thông báo lịch sự cho bệnh nhân thứ hai là 'Khung giờ này vừa mới có người đặt, vui lòng chọn khung giờ khác'."

---

### ❓ Câu 2: Em hãy giải thích quy trình hoạt động của RAG AI Chatbot trong hệ thống? Tại sao không gọi trực tiếp API của ChatGPT/Gemini luôn cho nhanh mà phải làm RAG?
*   **Cách trả lời:**
    *   "Thưa thầy cô, RAG viết tắt của **Retrieval-Augmented Generation (Tạo lập tăng cường truy xuất)**. Nếu chúng ta gọi trực tiếp API của LLM (như Gemini hay GPT) để tư vấn y khoa cho bệnh nhân, sẽ xảy ra 2 vấn đề lớn:"
        1.  **Ảo tưởng (Hallucination):** LLM có thể tự bịa ra thông tin y học sai lệch, gây nguy hiểm cho sức khỏe người bệnh.
        2.  **Thiếu tính bản địa:** LLM không biết được đơn giá, quy trình làm việc hay cẩm nang hậu phẫu riêng biệt của phòng khám DentaCare.
    *   "Quy trình RAG trong hệ thống của em diễn ra qua 4 bước:"
        1.  **Chuẩn bị (Ingestion):** Admin tải tài liệu nha khoa lên. Backend parse nội dung, chia thành các đoạn nhỏ (chunks ~1000 ký tự để giữ nguyên ngữ cảnh).
        2.  **Nhúng (Embedding):** Dùng mô hình `text-embedding-001` của Google chuyển đổi các đoạn chữ thành các vector toán học 768 chiều và lưu vào MongoDB Atlas.
        3.  **Truy xuất (Retrieval):** Khi bệnh nhân hỏi: *'Sau khi tẩy răng cần kiêng gì?'*, câu hỏi cũng được chuyển thành vector. Hệ thống thực hiện tìm kiếm vector tương đồng (Vector Search) trong MongoDB để tìm ra 3-5 đoạn tài liệu có nội dung giống hoặc liên quan nhất.
        4.  **Sinh câu trả lời (Generation):** Hệ thống gửi câu hỏi kèm theo 3-5 đoạn tài liệu y khoa tìm được làm ngữ cảnh (context) cho mô hình Gemini Pro với chỉ thị nghiêm ngặt: *'Chỉ được trả lời dựa trên ngữ cảnh được cung cấp. Nếu ngữ cảnh không có thông tin, hãy báo không biết'*. Nhờ đó, câu trả lời sinh ra luôn chính xác 100% theo tri thức của phòng khám."

---

### ❓ Câu 3: Cơ chế xác thực và phân quyền (Authentication & Authorization) trong hệ thống được bảo mật như thế nào?
*   **Cách trả lời:**
    *   "Dạ hệ thống của em áp dụng cơ chế xác thực **JWT Dual-Token** (Token kép) theo tiêu chuẩn công nghiệp:"
    *   **AccessToken:** Có thời hạn ngắn (ví dụ: 15 phút), được đính kèm ở header `Authorization: Bearer <token>` trong mỗi request từ client để xác thực nhanh.
    *   **RefreshToken:** Có thời hạn dài (ví dụ: 7 ngày), được mã hóa và lưu trữ dưới dạng **HTTP-Only Cookie** ở phía client. Cơ chế này chống lại hoàn toàn các cuộc tấn công đánh cắp token bằng mã độc JavaScript như **XSS (Cross-Site Scripting)**.
    *   Khi AccessToken hết hạn, Axios Interceptor ở phía client sẽ tự động bắt mã lỗi `401 Unauthorized` và gọi API làm mới token một cách âm thầm (silent refresh) để lấy AccessToken mới mà không làm gián đoạn trải nghiệm của người dùng.
    *   Về phân quyền (Authorization), em viết các middleware Express như `protect` và `restrictTo("admin", "doctor")` để kiểm tra role của user giải mã từ token trước khi cho phép truy cập vào các API đầu cuối."

---

### ❓ Câu 4: Em đã sử dụng Socket.io như thế nào để đồng bộ dữ liệu thời gian thực? Nó có làm nặng server không?
*   **Cách trả lời:**
    *   "Thưa thầy cô, em tích hợp Socket.io để thiết lập kết nối song hướng (bi-directional) liên tục giữa client và server thông qua giao thức WebSockets."
    *   "Để tránh lãng phí tài nguyên và làm nặng server, em áp dụng cơ chế **Event-Driven Architecture (Kiến trúc hướng sự kiện)** thay vì cho client gọi polling liên tục:"
        *   Khi bác sĩ hoặc admin thực hiện thay đổi lịch trực hoặc lịch hẹn, server sẽ trigger phát (emit) một sự kiện cụ thể (ví dụ: `schedule:changed` hoặc `slots:changed`).
        *   Client tương ứng chỉ lắng nghe các sự kiện này để cập nhật cục bộ state của React (React State), giúp giao diện thay đổi tức thì mà không cần load lại toàn bộ cơ sở dữ liệu.
    *   "Ngoài ra, em có phân nhóm các kết nối vào các **Socket Rooms** (phòng riêng biệt) theo `userId` hoặc `role`. Ví dụ, thông báo duyệt lịch hẹn chỉ được gửi vào room của bệnh nhân đó và room của admin/bác sĩ phụ trách, tránh việc gửi quảng bá (broadcast) toàn hệ thống làm ảnh hưởng hiệu năng của các thiết bị client khác."

---

 chúc bạn có một buổi bảo vệ khóa luận thành công rực rỡ với điểm số tối đa! Hệ thống DentaCare đã cực kỳ hoàn thiện và sẵn sàng để tỏa sáng trước Hội đồng!
