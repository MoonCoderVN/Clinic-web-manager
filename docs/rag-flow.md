# DentaCare RAG Flow

## User Input
Bệnh nhân hỏi chatbot, ví dụ: "Giá niềng răng ở đây bao nhiêu?".

## Embedding
Backend Node.js chuẩn hóa câu hỏi và tạo embedding bằng Gemini embedding model đã cấu hình trong môi trường.

## Retrieval
Embedding của câu hỏi được dùng để truy vấn MongoDB Atlas Vector Search qua `$vectorSearch`, lấy các knowledge chunks liên quan nhất trong collection kiến thức nha khoa của phòng khám.

## Prompt Construction
Backend ghép system instruction, câu hỏi gốc và các đoạn knowledge tìm được thành prompt có ngữ cảnh. Nếu vector search lỗi, hệ thống có thể fallback sang keyword search để tránh chatbot mất khả năng trả lời hoàn toàn.

## Output
Gemini tạo câu trả lời dựa trên dữ liệu thật của DentaCare, kèm sources khi có. Với câu hỏi về lịch trống, chatbot ưu tiên kiểm tra availability của bác sĩ trước khi gợi ý link đặt lịch.
