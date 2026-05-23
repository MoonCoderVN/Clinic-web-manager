import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

import User from "../modules/user/user.model.js";
import Doctor from "../modules/doctor/doctor.model.js";
import Patient from "../modules/patient/patient.model.js";
import Service from "../modules/service/service.model.js";
import Schedule from "../modules/schedule/schedule.model.js";
import Appointment from "../modules/appointment/appointment.model.js";
import ExamResult from "../modules/examResult/examResult.model.js";
import LeaveRequest from "../modules/leaveRequest/leaveRequest.model.js";
import Notification from "../modules/notification/notification.model.js";
import Knowledge from "../modules/chat/knowledge.model.js";
import { upsertMongoKnowledgeVectors } from "../rag/retriever/mongoRetriever.js";

const servicesData = [
    {
        name: "Cạo vôi răng & Đánh bóng (Clean & Polish)",
        description: "Làm sạch các mảng bám, vôi răng cứng đầu tích tụ lâu ngày trên bề mặt răng và kẽ nướu, ngăn ngừa viêm nướu, viêm nha chu và hôi miệng. Kết thúc bằng bước đánh bóng răng giúp bề mặt răng láng mịn.",
        price: 250000,
        duration: 30,
        category: "Nha khoa tổng quát",
        isActive: true
    },
    {
        name: "Trám răng thẩm mỹ (Dental Filling)",
        description: "Sử dụng vật liệu Composite cao cấp cùng màu răng tự nhiên để phục hồi các lỗ sâu răng, răng mẻ hoặc mòn cổ răng. Đảm bảo tính thẩm mỹ cao, độ bền chắc và chức năng nhai tối ưu.",
        price: 350000,
        duration: 30,
        category: "Nha khoa tổng quát",
        isActive: true
    },
    {
        name: "Tẩy trắng răng công nghệ cao (Teeth Whitening)",
        description: "Phương pháp tẩy trắng răng sử dụng ánh sáng xanh kết hợp với thuốc tẩy trắng nhập khẩu chính hãng giúp răng trắng sáng lên từ 2-4 tone chỉ sau 45 phút. Không gây ê buốt, an toàn tuyệt đối cho men răng.",
        price: 2500000,
        duration: 60,
        category: "Nha khoa thẩm mỹ",
        isActive: true
    },
    {
        name: "Nhổ răng khôn mọc lệch (Wisdom Tooth Extraction)",
        description: "Tiểu phẫu nhổ răng khôn mọc lệch, mọc ngầm, hoặc đâm ngang bằng công nghệ sóng siêu âm Piezotome hiện đại giúp giảm thiểu sưng đau, hạn chế tổn thương mô mềm và thúc đẩy vết thương mau lành.",
        price: 1800000,
        duration: 60,
        category: "Tiểu phẫu & Cấy ghép",
        isActive: true
    },
    {
        name: "Răng sứ thẩm mỹ Cercon HT (Porcelain Crown)",
        description: "Bọc răng sứ toàn sứ cao cấp Cercon HT nhập khẩu từ Đức. Độ trong mờ tự nhiên như răng thật, chịu lực nhai cực tốt, không bị đen viền nướu sau thời gian dài sử dụng. Bảo hành chính hãng 10 năm.",
        price: 5500000,
        duration: 60,
        category: "Nha khoa thẩm mỹ",
        isActive: true
    },
    {
        name: "Niềng răng mắc cài kim loại tự đóng (Braces)",
        description: "Giải pháp nắn chỉnh răng khấp khểnh, răng thưa, hô, móm bằng hệ thống mắc cài tự khóa thông minh. Giúp răng dịch chuyển nhanh chóng, giảm lực ma sát, hạn chế số lần tái khám và rút ngắn thời gian điều trị.",
        price: 35000000,
        duration: 45,
        category: "Chỉnh nha",
        isActive: true
    },
    {
        name: "Cấy ghép răng Implant Dentium (Dental Implant)",
        description: "Giải pháp phục hình răng đã mất hoàn hảo nhất hiện nay. Trụ Implant làm từ Titanium tinh khiết sinh học được cấy trực tiếp vào xương hàm thay thế chân răng, kết hợp khớp nối Abutment và răng sứ Cercon.",
        price: 22000000,
        duration: 90,
        category: "Tiểu phẫu & Cấy ghép",
        isActive: true
    }
];

const doctorsData = [
    {
        fullName: "BS. Nguyễn Văn An",
        email: "dr.an@dentacare.com",
        password: "Doctor@123456",
        phone: "0912345678",
        role: "doctor",
        isActive: true,
        doctorProfile: {
            specialization: "Nha khoa thẩm mỹ & Bọc sứ",
            experience: 12,
            licenseNumber: "CCHN-120938-BYT",
            education: ["Tốt nghiệp Bác sĩ Răng Hàm Mặt - Đại học Y Dược TP.HCM", "Chứng chỉ Phục hình răng thẩm mỹ chuyên sâu tại Pháp"],
            certifications: ["Master Class in Aesthetic Dentistry", "Chứng chỉ Chuyên gia Thiết kế Nụ cười (Digital Smile Design)"],
            rating: 4.9
        }
    },
    {
        fullName: "BS. Trần Thị Bình",
        email: "dr.binh@dentacare.com",
        password: "Doctor@123456",
        phone: "0987654321",
        role: "doctor",
        isActive: true,
        doctorProfile: {
            specialization: "Chỉnh nha - Niềng răng chuyên sâu",
            experience: 8,
            licenseNumber: "CCHN-230982-BYT",
            education: ["Tốt nghiệp Thạc sĩ Răng Hàm Mặt - Đại học Y Hà Nội", "Tu nghiệp Chỉnh nha Invisalign tại Singapore"],
            certifications: ["Chứng chỉ bác sĩ Invisalign Platinum Provider", "Thành viên Hội Chỉnh nha Việt Nam (VAO)"],
            rating: 4.8
        }
    },
    {
        fullName: "BS. Phạm Minh Cường",
        email: "dr.cuong@dentacare.com",
        password: "Doctor@123456",
        phone: "0909123456",
        role: "doctor",
        isActive: true,
        doctorProfile: {
            specialization: "Cấy ghép Implant & Phẫu thuật hàm mặt",
            experience: 15,
            licenseNumber: "CCHN-340912-BYT",
            education: ["Tốt nghiệp Bác sĩ Chuyên khoa II - Đại học Y Dược TP.HCM", "Tu nghiệp cấy ghép Implant tại Thuyện Sĩ (ITI Center)"],
            certifications: ["Thành viên Hiệp hội cấy ghép Nha khoa quốc tế ICOI", "Chứng chỉ Cấy ghép xương nâng xoang hàm nâng cao"],
            rating: 5.0
        }
    },
    {
        fullName: "BS. Lê Hoàng Dũng",
        email: "dr.dung@dentacare.com",
        password: "Doctor@123456",
        phone: "0938889999",
        role: "doctor",
        isActive: true,
        doctorProfile: {
            specialization: "Nha khoa tổng quát & Điều trị nội nha",
            experience: 6,
            licenseNumber: "CCHN-450987-BYT",
            education: ["Tốt nghiệp Bác sĩ Răng Hàm Mặt - Đại học Y khoa Phạm Ngọc Thạch", "Khóa đào tạo liên tục Điều trị nội nha bằng máy WaveOne"],
            certifications: ["Chứng chỉ Nha khoa bảo tồn và Phục hồi răng", "Chứng chỉ ứng dụng Laser trong nha khoa lâm sàng"],
            rating: 4.7
        }
    },
    {
        fullName: "BS. Hoàng Thu Thảo",
        email: "dr.thao@dentacare.com",
        password: "Doctor@123456",
        phone: "0977112233",
        role: "doctor",
        isActive: true,
        doctorProfile: {
            specialization: "Nha khoa trẻ em (Pediatric Dentistry)",
            experience: 7,
            licenseNumber: "CCHN-560938-BYT",
            education: ["Tốt nghiệp Bác sĩ Răng Hàm Mặt - Đại học Y Dược Huế", "Chứng chỉ tâm lý nha khoa trẻ em tại Nhật Bản"],
            certifications: ["Chứng chỉ tiền chỉnh nha trẻ em (Myobrace)", "Thành viên Hội Nha khoa Trẻ em Việt Nam"],
            rating: 4.9
        }
    },
    {
        fullName: "BS. Đặng Anh Tuấn",
        email: "dr.tuan@dentacare.com",
        password: "Doctor@123456",
        phone: "0966223344",
        role: "doctor",
        isActive: true,
        doctorProfile: {
            specialization: "Điều trị nha chu & Thiết kế nụ cười",
            experience: 10,
            licenseNumber: "CCHN-670982-BYT",
            education: ["Tốt nghiệp Bác sĩ Răng Hàm Mặt - Đại học Y Dược Hải Phòng", "Khóa đào tạo Phẫu thuật nha chu thẩm mỹ nâng cao tại Hàn Quốc"],
            certifications: ["Chứng chỉ Phẫu thuật tạo hình nha chu thẩm mỹ", "Chứng chỉ Laser nha khoa chuyên sâu"],
            rating: 4.6
        }
    },
    {
        fullName: "BS. Mai Phương Chi",
        email: "dr.chi@dentacare.com",
        password: "Doctor@123456",
        phone: "0944334455",
        role: "doctor",
        isActive: true,
        doctorProfile: {
            specialization: "Nha khoa thẩm mỹ & Tẩy trắng răng",
            experience: 5,
            licenseNumber: "CCHN-780912-BYT",
            education: ["Tốt nghiệp Bác sĩ Răng Hàm Mặt - Đại học Quốc gia TP.HCM", "Khóa học phục hình sứ thẩm mỹ ít xâm lấn"],
            certifications: ["Chứng chỉ tẩy trắng răng chuyên sâu LumaCool", "Chứng chỉ dán sứ Veneer siêu mỏng"],
            rating: 4.8
        }
    },
    {
        fullName: "BS. Phan Thanh Sơn",
        email: "dr.son@dentacare.com",
        password: "Doctor@123456",
        phone: "0911556677",
        role: "doctor",
        isActive: true,
        doctorProfile: {
            specialization: "Cấy ghép Implant & Phục hình xương hàm nâng cao",
            experience: 14,
            licenseNumber: "CCHN-890987-BYT",
            education: ["Tốt nghiệp Bác sĩ Chuyên khoa I - Đại học Y Hà Nội", "Chứng chỉ cấy ghép toàn hàm All-on-4/All-on-6 tại Thụy Điển"],
            certifications: ["Chứng chỉ Phẫu thuật nâng xoang hàm nâng cao", "Thành viên chính thức Hiệp hội Implant Nha khoa thế giới ITI"],
            rating: 4.9
        }
    },
    {
        fullName: "BS. Lê Quốc Khánh",
        email: "dr.khanh@dentacare.com",
        password: "Doctor@123456",
        phone: "0922667788",
        role: "doctor",
        isActive: true,
        doctorProfile: {
            specialization: "Chỉnh nha mặt trong & Invisalign chuyên sâu",
            experience: 9,
            licenseNumber: "CCHN-901234-BYT",
            education: ["Tốt nghiệp Thạc sĩ Chỉnh nha - Đại học Sydney (Úc)", "Chứng chỉ Chỉnh nha tăng trưởng chuyên sâu"],
            certifications: ["Bác sĩ Invisalign Diamond Provider", "Chứng chỉ chỉnh nha mắc cài mặt lưỡi chuyên nghiệp"],
            rating: 4.7
        }
    },
    {
        fullName: "BS. Đỗ Thùy Linh",
        email: "dr.linh@dentacare.com",
        password: "Doctor@123456",
        phone: "0933778899",
        role: "doctor",
        isActive: true,
        doctorProfile: {
            specialization: "Nha khoa tổng quát & Nội nha vi phẫu",
            experience: 8,
            licenseNumber: "CCHN-012345-BYT",
            education: ["Tốt nghiệp Bác sĩ Răng Hàm Mặt - Đại học Y Dược TP.HCM", "Khóa đào tạo chuyên sâu nội nha dưới kính hiển vi"],
            certifications: ["Chứng chỉ Điều trị tủy răng bằng trâm xoay máy", "Chứng chỉ Nha khoa kỹ thuật số nâng cao"],
            rating: 4.8
        }
    }
];

const patientsData = [
    { fullName: "Lê Minh Triết", email: "patient.triet@gmail.com", phone: "0898765432", dob: "1995-04-12", gender: "male", address: "123 Ba Tháng Hai, Q.10, TP.HCM", history: ["Dị ứng thuốc penicillin nhẹ", "Nhổ răng sâu năm 2021"], allergies: ["Penicillin"] },
    { fullName: "Nguyễn Hoài Thương", email: "patient.thuong@gmail.com", phone: "0798765432", dob: "1998-08-25", gender: "female", address: "45/12 Nguyễn Đình Chiểu, Q.1, TP.HCM", history: ["Không có tiền sử bệnh lý đặc biệt"], allergies: [] },
    { fullName: "Phan Anh Đức", email: "patient.duc@gmail.com", phone: "0908887777", dob: "1990-11-03", gender: "male", address: "789 Song Hành, Thảo Điền, Q.2, TP.HCM", history: ["Huyết áp cao nhẹ (đang kiểm soát)"], allergies: ["Hải sản"] },
    { fullName: "Vũ Phương Vy", email: "patient.vy@gmail.com", phone: "0945678901", dob: "2002-02-14", gender: "female", address: "56 Cổ Nhuế, Q.Bắc Từ Liêm, Hà Nội", history: ["Đang điều trị dạ dày"], allergies: [] },
    { fullName: "Trần Minh Hoàng", email: "patient.hoang@gmail.com", phone: "0912112233", dob: "1988-06-18", gender: "male", address: "15 Lê Lợi, Q.1, TP.HCM", history: ["Đái tháo đường nhẹ"], allergies: [] },
    { fullName: "Phạm Thúy Hằng", email: "patient.hang@gmail.com", phone: "0988223344", dob: "1993-09-05", gender: "female", address: "78 Nguyễn Trãi, Q.Thanh Xuân, Hà Nội", history: ["Không bệnh lý"], allergies: ["Thuốc aspirin"] },
    { fullName: "Hoàng Đức Anh", email: "patient.ducanh@gmail.com", phone: "0977334455", dob: "1991-03-30", gender: "male", address: "235 Cách Mạng Tháng 8, Q.3, TP.HCM", history: ["Hút thuốc lá nhiều"], allergies: [] },
    { fullName: "Đỗ Kim Chi", email: "patient.kimchi@gmail.com", phone: "0966445566", dob: "2000-12-25", gender: "female", address: "89 Xã Đàn, Q.Đống Đa, Hà Nội", history: ["Không bệnh lý"], allergies: [] },
    { fullName: "Bùi Tiến Dũng", email: "patient.tiendung@gmail.com", phone: "0955556677", dob: "1985-05-15", gender: "male", address: "12 Trần Hưng Đạo, Q.Hoàn Kiếm, Hà Nội", history: ["Răng nhạy cảm nặng"], allergies: [] },
    { fullName: "Mai Ngọc Anh", email: "patient.ngocanh@gmail.com", phone: "0944667788", dob: "1997-07-07", gender: "female", address: "450 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM", history: ["Thiếu máu nhẹ"], allergies: [] },
    { fullName: "Nguyễn Văn Hùng", email: "patient.hung@gmail.com", phone: "0933778811", dob: "1975-10-22", gender: "male", address: "92 Lạc Long Quân, Q.Tây Hồ, Hà Nội", history: ["Tiền sử tim mạch nhẹ"], allergies: [] },
    { fullName: "Lê Thị Thảo", email: "patient.thao@gmail.com", phone: "0922889922", dob: "1989-02-19", gender: "female", address: "189 Cộng Hòa, Q.Tân Bình, TP.HCM", history: ["Không bệnh lý"], allergies: [] },
    { fullName: "Vũ Quốc Bảo", email: "patient.bao@gmail.com", phone: "0911990033", dob: "1996-08-08", gender: "male", address: "64 Hoàng Diệu, Q.Ba Đình, Hà Nội", history: ["Đã phẫu thuật hàm năm 2019"], allergies: [] },
    { fullName: "Trịnh Tuyết Mai", email: "patient.tuyetmai@gmail.com", phone: "0900112244", dob: "1982-11-30", gender: "female", address: "14 Nguyễn Văn Linh, Q.7, TP.HCM", history: ["Không bệnh lý"], allergies: [] },
    { fullName: "Phan Quốc Huy", email: "patient.quochuy@gmail.com", phone: "0899223355", dob: "1994-01-15", gender: "male", address: "120 Kim Mã, Q.Ba Đình, Hà Nội", history: ["Nướu nhạy cảm"], allergies: [] },
    { fullName: "Dương Thị Hồng", email: "patient.hong@gmail.com", phone: "0888334466", dob: "1987-04-20", gender: "female", address: "73 Phan Đăng Lưu, Q.Phú Nhuận, TP.HCM", history: ["Đang mang thai tháng thứ 4"], allergies: ["Thuốc kháng sinh nhóm beta-lactam"] },
    { fullName: "Lâm Chí Dĩnh", email: "patient.chidinh@gmail.com", phone: "0877445577", dob: "1978-09-09", gender: "male", address: "40 Trần Não, Q.2, TP.HCM", history: ["Huyết áp cao"], allergies: [] },
    { fullName: "Tạ Thị Bé", email: "patient.be@gmail.com", phone: "0866556688", dob: "2015-08-08", gender: "female", address: "35 Võ Văn Tần, Q.3, TP.HCM", history: ["Sâu răng sữa trẻ em"], allergies: [] },
    { fullName: "Ngô Gia Bảo", email: "patient.giabao@gmail.com", phone: "0855667799", dob: "2013-05-12", gender: "male", address: "123 Láng Hạ, Q.Đống Đa, Hà Nội", history: ["Đã niềng răng silicon trẻ em"], allergies: [] },
    { fullName: "Phạm Hải Đăng", email: "patient.haidang@gmail.com", phone: "0987113355", dob: "1983-03-24", gender: "male", address: "55 Lê Duẩn, Q.1, TP.HCM", history: ["Hút thuốc lá"], allergies: [] },
    { fullName: "Đặng Hồng Nhung", email: "patient.hongnhung@gmail.com", phone: "0976224466", dob: "1992-06-11", gender: "female", address: "80 Nguyễn Chí Thanh, Q.Đống Đa, Hà Nội", history: ["Không bệnh lý"], allergies: [] },
    { fullName: "Võ Văn Sang", email: "patient.vangsang@gmail.com", phone: "0965335577", dob: "1979-10-01", gender: "male", address: "148 Trường Chinh, Q.12, TP.HCM", history: ["Mất 2 răng hàm dưới"], allergies: [] },
    { fullName: "Nguyễn Khánh Linh", email: "patient.khanhlinh@gmail.com", phone: "0954446688", dob: "2001-01-20", gender: "female", address: "90 Bà Triệu, Q.Hoàn Kiếm, Hà Nội", history: ["Khớp cắn ngược nhẹ"], allergies: [] },
    { fullName: "Hồ Minh Quân", email: "patient.minhquan@gmail.com", phone: "0943557799", dob: "1986-12-14", gender: "male", address: "10 Nguyễn Văn Cừ, Q.5, TP.HCM", history: ["Không bệnh lý"], allergies: [] },
    { fullName: "Cao Cẩm Tú", email: "patient.camtu@gmail.com", phone: "0932668800", dob: "1999-09-09", gender: "female", address: "23 Cát Linh, Q.Đống Đa, Hà Nội", history: ["Không bệnh lý"], allergies: [] },
    { fullName: "Vương Thiên Lâm", email: "patient.thienlam@gmail.com", phone: "0921779911", dob: "1972-11-28", gender: "male", address: "305 Phan Thế Hiển, Q.8, TP.HCM", history: ["Viêm nha chu nặng"], allergies: ["Penicillin"] },
    { fullName: "Lưu Diệp Chi", email: "patient.diepchi@gmail.com", phone: "0910880022", dob: "2003-03-03", gender: "female", address: "115 Nguyễn Lương Bằng, Q.Đống Đa, Hà Nội", history: ["Không bệnh lý"], allergies: [] },
    { fullName: "Phan Văn Trị", email: "patient.vantri@gmail.com", phone: "0909991133", dob: "1980-02-10", gender: "male", address: "88 Phan Văn Trị, Q.Gò Vấp, TP.HCM", history: ["Sâu nhiều răng hàm"], allergies: [] },
    { fullName: "Nguyễn Quỳnh Hương", email: "patient.quynhhuong@gmail.com", phone: "0898882244", dob: "1995-10-15", gender: "female", address: "15 Thụy Khuê, Q.Tây Hồ, Hà Nội", history: ["Không bệnh lý"], allergies: [] },
    { fullName: "Trần Anh Tú", email: "patient.anhtu@gmail.com", phone: "0888993355", dob: "1988-12-30", gender: "male", address: "40 Trần Hưng Đạo, Q.1, TP.HCM", history: ["Răng khôn mọc ngầm"], allergies: ["Penicillin"] }
];

const knowledgeData = [
    {
        title: "Cẩm nang chăm sóc răng sứ toàn sứ Cercon HT",
        content: "Bọc răng sứ Cercon HT mang lại tính thẩm mỹ cao và chịu lực nhai lớn. Để duy trì độ bền và vẻ đẹp tự nhiên, bệnh nhân cần tuân thủ các quy tắc sau:\n1. Kiêng ăn thức ăn quá cứng, dai hoặc quá nóng, lạnh trong 48 giờ đầu.\n2. Chải răng bằng bàn chải lông mềm tối thiểu 2 lần/ngày, kết hợp sử dụng chỉ nha khoa và nước súc miệng để làm sạch kẽ nướu.\n3. Hạn chế sử dụng đồ uống có màu đậm như trà, cà phê, rượu vang và tránh hút thuốc lá vì có thể làm xỉn màu sứ.\n4. Định kỳ kiểm tra nha khoa và lấy cao răng 6 tháng một lần để đảm bảo nướu khỏe mạnh xung quanh chân răng sứ.",
        category: "Nha khoa thẩm mỹ",
        source: "Cẩm nang phòng khám DentaCare",
        keywords: ["răng sứ", "Cercon", "bọc sứ", "chăm sóc răng sứ", "bảo hành răng sứ"]
    },
    {
        title: "Hướng dẫn hồi phục vết thương sau khi nhổ răng khôn",
        content: "Sau khi tiểu phẫu nhổ răng khôn bằng sóng siêu âm Piezotome, việc chăm sóc đúng cách đóng vai trò 90% giúp vết thương mau lành và tránh viêm huyệt ổ răng:\n1. Cắn chặt bông gòn trong 30-45 phút đầu để cầm máu. Không khạc nhổ nước bọt, không dùng lưỡi hoặc vật nhọn chạm vào huyệt ổ răng.\n2. Chườm lạnh bên ngoài má trong 24 giờ đầu (15 phút chườm, 15 phút nghỉ) để giảm sưng. Từ ngày thứ 2, chườm ấm để tan máu bầm.\n3. Ăn đồ ăn lỏng, mềm, nguội như cháo, súp, sữa trong 2-3 ngày đầu. Tránh nhai ở vùng răng vừa nhổ.\n4. Sử dụng thuốc giảm đau và kháng sinh đúng theo đơn kê của bác sĩ. Không tự ý ngưng thuốc.",
        category: "Tiểu phẫu & Cấy ghép",
        source: "Hướng dẫn điều trị lâm sàng DentaCare",
        keywords: ["răng khôn", "nhổ răng khôn", "tiểu phẫu", "chăm sóc sau nhổ răng", "giảm sưng đau"]
    },
    {
        title: "Chính sách bảo hành dịch vụ tại Nha khoa DentaCare",
        content: "Nha khoa DentaCare cam kết chất lượng điều trị bằng chính sách bảo hành bằng văn bản rõ ràng:\n1. Bọc răng sứ Cercon HT: Bảo hành chính hãng 10 năm về mặt thẩm mỹ, nứt mẻ sứ và đen viền nướu.\n2. Cấy ghép răng Implant Dentium: Bảo hành trọn đời đối với trụ Implant Titanium nhập khẩu, hỗ trợ cấy lại miễn phí nếu xảy ra hiện tượng đào thải trụ.\n3. Điều trị tủy (Nội nha) & Trám răng: Bảo hành 6 tháng. Miễn phí trám lại nếu bong tróc chất trám.\n4. Điều kiện bảo hành: Bệnh nhân cần tuân thủ tái khám định kỳ 6 tháng/lần tại DentaCare và giữ gìn vệ sinh răng miệng theo đúng chỉ dẫn của bác sĩ điều trị.",
        category: "Chính sách phòng khám",
        source: "Quy chế dịch vụ DentaCare",
        keywords: ["bảo hành", "chính sách", "giá dịch vụ", "Implant bảo hành", "bảo hành Cercon"]
    }
];

const seedDemoData = async () => {
    try {
        console.log("🚀 Bắt đầu quá trình seed dữ liệu demo mở rộng (đầy đủ các chức năng)...");

        if (!process.env.MONGODB_URI) {
            throw new Error("Không tìm thấy biến MONGODB_URI trong file .env!");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("🔌 Kết nối database thành công!");

        // 1. Dọn dẹp database cũ (ngoại trừ admin)
        console.log("🧹 Đang dọn dẹp các collection cũ...");
        await Appointment.deleteMany({});
        await ExamResult.deleteMany({});
        await Schedule.deleteMany({});
        await Doctor.deleteMany({});
        await Patient.deleteMany({});
        await Service.deleteMany({});
        await LeaveRequest.deleteMany({});
        await Notification.deleteMany({});
        await Knowledge.deleteMany({});
        // Chỉ xóa user có role doctor hoặc patient, giữ lại admin để tránh mất tài khoản admin chính
        await User.deleteMany({ role: { $in: ["doctor", "patient"] } });
        console.log("✅ Đã dọn dẹp xong database!");

        // 2. Tạo tài khoản Admin mặc định nếu chưa có
        console.log("👑 Đang kiểm tra/tạo tài khoản admin...");
        const adminEmail = process.env.ADMIN_EMAIL || "admin@dentacare.com";
        const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
        let existingAdmin = await User.findOne({ role: "admin" });
        if (!existingAdmin) {
            existingAdmin = await User.create({
                fullName: process.env.ADMIN_NAME || "Super Admin",
                email: adminEmail,
                password: adminPassword,
                phone: process.env.ADMIN_PHONE || "0900000000",
                role: "admin",
                isActive: true
            });
            console.log("✅ Đã tạo tài khoản admin mặc định.");
        } else {
            console.log("ℹ️ Tài khoản admin đã tồn tại.");
        }

        // 3. Seed Dịch vụ
        console.log("🦷 Đang tạo danh sách dịch vụ...");
        const seededServices = await Service.create(servicesData);
        console.log(`✅ Đã seed ${seededServices.length} dịch vụ thành công!`);

        // Tìm một số service ID cụ thể để gán cho bác sĩ
        const caoVoi = seededServices.find(s => s.name.includes("Cạo vôi răng"));
        const tramRang = seededServices.find(s => s.name.includes("Trám răng"));
        const tayTrang = seededServices.find(s => s.name.includes("Tẩy trắng"));
        const nhoRangKhon = seededServices.find(s => s.name.includes("Nhổ răng khôn"));
        const rangSu = seededServices.find(s => s.name.includes("Răng sứ"));
        const niengRang = seededServices.find(s => s.name.includes("Niềng răng"));
        const implant = seededServices.find(s => s.name.includes("Cấy ghép"));

        // 4. Seed 10 Bác sĩ
        console.log("👨‍⚕️ Đang tạo tài khoản và hồ sơ cho 10 Bác sĩ chuyên khoa...");
        const seededDoctors = [];
        for (const doc of doctorsData) {
            // Tạo User
            const user = await User.create({
                fullName: doc.fullName,
                email: doc.email,
                password: doc.password,
                phone: doc.phone,
                role: doc.role,
                isActive: doc.isActive
            });

            // Chỉ định dịch vụ bác sĩ đảm nhận tùy theo chuyên môn
            let assignedServices = [];
            if (doc.fullName.includes("An") || doc.fullName.includes("Chi")) {
                assignedServices = [caoVoi._id, tramRang._id, tayTrang._id, rangSu._id];
            } else if (doc.fullName.includes("Bình") || doc.fullName.includes("Khánh")) {
                assignedServices = [niengRang._id, caoVoi._id];
            } else if (doc.fullName.includes("Cường") || doc.fullName.includes("Sơn")) {
                assignedServices = [implant._id, nhoRangKhon._id, rangSu._id];
            } else if (doc.fullName.includes("Thảo")) {
                assignedServices = [caoVoi._id, tramRang._id];
            } else if (doc.fullName.includes("Tuấn")) {
                assignedServices = [caoVoi._id, tramRang._id, rangSu._id];
            } else {
                // Lê Hoàng Dũng & Đỗ Thùy Linh
                assignedServices = [caoVoi._id, tramRang._id, tayTrang._id, nhoRangKhon._id];
            }

            // Tạo hồ sơ Doctor
            const doctorProfile = await Doctor.create({
                userId: user._id,
                ...doc.doctorProfile,
                services: assignedServices
            });

            seededDoctors.push({ user, doctor: doctorProfile });
        }
        console.log(`✅ Đã seed ${seededDoctors.length} bác sĩ thành công!`);

        // 5. Seed 30 Bệnh nhân
        console.log("👤 Đang tạo tài khoản và hồ sơ cho 30 Bệnh nhân...");
        const seededPatients = [];
        for (const pat of patientsData) {
            // Tạo User
            const user = await User.create({
                fullName: pat.fullName,
                email: pat.email,
                password: "Patient@123456", // mật khẩu đồng bộ
                phone: pat.phone,
                role: "patient",
                isActive: true
            });

            // Tạo hồ sơ Patient
            const patientProfile = await Patient.create({
                userId: user._id,
                dateOfBirth: new Date(pat.dob),
                gender: pat.gender,
                address: pat.address,
                medicalHistory: pat.history,
                allergies: pat.allergies,
                emergencyContact: {
                    name: `${pat.fullName.split(" ").slice(-1)[0]} Gia Đình`,
                    phone: pat.phone.slice(0, -1) + "9",
                    relationship: "Người thân"
                }
            });

            seededPatients.push({ user, patient: patientProfile });
        }
        console.log(`✅ Đã seed ${seededPatients.length} bệnh nhân thành công!`);

        // 6. Seed Lịch làm việc hàng tuần cho 10 bác sĩ (Schedule)
        console.log("📅 Đang tạo lịch làm việc mặc định cho 10 bác sĩ...");
        const scheduleEntries = [];
        for (const doc of seededDoctors) {
            const docUserId = doc.user._id;

            for (let day = 1; day <= 6; day++) {
                // Sáng: 08:00 - 12:00
                scheduleEntries.push({
                    doctorId: docUserId,
                    dayOfWeek: day,
                    startTime: "08:00",
                    endTime: "12:00",
                    maxSlots: 8,
                    weekStart: null,
                    isOff: false
                });

                // Chiều: 13:30 - 17:30
                scheduleEntries.push({
                    doctorId: docUserId,
                    dayOfWeek: day,
                    startTime: "13:30",
                    endTime: "17:30",
                    maxSlots: 8,
                    weekStart: null,
                    isOff: false
                });
            }
        }
        await Schedule.create(scheduleEntries);
        console.log(`✅ Đã seed ${scheduleEntries.length} khung lịch làm việc mặc định thành công!`);

        // 7. Seed Yêu cầu nghỉ phép (Leave Requests)
        console.log("🏥 Đang tạo dữ liệu yêu cầu nghỉ phép lâm sàng mẫu...");
        const now = new Date();
        const formatDate = (daysOffset) => {
            const d = new Date();
            d.setDate(now.getDate() + daysOffset);
            d.setHours(0, 0, 0, 0);
            return d;
        };

        const bsAnUser = seededDoctors.find(d => d.user.fullName.includes("An")).user;
        const bsBinhUser = seededDoctors.find(d => d.user.fullName.includes("Bình")).user;
        const bsCuongUser = seededDoctors.find(d => d.user.fullName.includes("Cường")).user;

        const leaveRequests = [
            {
                doctor_id: bsAnUser._id,
                reason: "Tham gia Hội nghị khoa học răng hàm mặt toàn quốc tại Hà Nội.",
                date_off: formatDate(1), // Ngày mai
                status: "approved",
                reviewedBy: existingAdmin._id,
                reviewedAt: new Date(),
                reviewNote: "Phê duyệt. Nhắc bác sĩ bàn giao bệnh nhân nội trú."
            },
            {
                doctor_id: bsBinhUser._id,
                reason: "Khám sức khỏe định kỳ cá nhân.",
                date_off: formatDate(3), // 3 ngày nữa
                status: "pending",
                reviewedBy: null,
                reviewedAt: null,
                reviewNote: ""
            },
            {
                doctor_id: bsCuongUser._id,
                reason: "Giải quyết việc cá nhân gia đình đột xuất.",
                date_off: formatDate(-2), // 2 ngày trước
                status: "approved",
                reviewedBy: existingAdmin._id,
                reviewedAt: formatDate(-3),
                reviewNote: "Chấp nhận nghỉ phép."
            }
        ];
        await LeaveRequest.create(leaveRequests);
        console.log("✅ Đã seed các yêu cầu nghỉ phép thành công!");

        // 8. Seed Lịch hẹn mẫu (Appointments) & Kết quả khám (ExamResults)
        console.log("🤝 Đang tạo các lịch hẹn và kết quả khám mẫu...");
        const appointmentsToSeed = [];

        const bsAn = seededDoctors.find(d => d.user.fullName.includes("An")).doctor;
        const bsBinh = seededDoctors.find(d => d.user.fullName.includes("Bình")).doctor;
        const bsCuong = seededDoctors.find(d => d.user.fullName.includes("Cường")).doctor;
        const bsDung = seededDoctors.find(d => d.user.fullName.includes("Dũng")).doctor;
        const bsThao = seededDoctors.find(d => d.user.fullName.includes("Thảo")).doctor;
        const bsChi = seededDoctors.find(d => d.user.fullName.includes("Chi")).doctor;

        const bnTriet = seededPatients.find(p => p.user.fullName.includes("Triết")).user;
        const bnThuong = seededPatients.find(p => p.user.fullName.includes("Thương")).user;
        const bnDuc = seededPatients.find(p => p.user.fullName.includes("Đức")).user;
        const bnVy = seededPatients.find(p => p.user.fullName.includes("Vy")).user;
        const bnHoang = seededPatients.find(p => p.user.fullName.includes("Hoàng")).user;
        const bnChi2 = seededPatients.find(p => p.user.fullName.includes("Kim Chi")).user;
        const bnBe = seededPatients.find(p => p.user.fullName.includes("Tạ Thị Bé")).user;
        const bnHung = seededPatients.find(p => p.user.fullName.includes("Văn Hùng")).user;

        // Lịch hẹn Completed 1
        appointmentsToSeed.push({
            patientId: bnTriet._id,
            doctorId: bsAn._id,
            serviceId: caoVoi._id,
            appointmentDate: formatDate(-5),
            startTime: "09:00",
            endTime: "09:30",
            status: "completed",
            notes: "Bệnh nhân muốn làm sạch răng.",
            diagnosis: "Vôi răng bám nhiều ở nhóm răng cửa dưới, nướu hơi sưng nhẹ.",
            checkedInAt: new Date(formatDate(-5).setHours(8, 55)),
            completedAt: new Date(formatDate(-5).setHours(9, 28))
        });

        // Lịch hẹn Completed 2
        appointmentsToSeed.push({
            patientId: bnThuong._id,
            doctorId: bsDung._id,
            serviceId: tramRang._id,
            appointmentDate: formatDate(-3),
            startTime: "14:00",
            endTime: "14:30",
            status: "completed",
            notes: "Răng hàm dưới bị đau khi ăn đồ ngọt.",
            diagnosis: "Sâu răng hàm 36, lỗ sâu sát ngà nhưng chưa viêm tủy.",
            checkedInAt: new Date(formatDate(-3).setHours(13, 50)),
            completedAt: new Date(formatDate(-3).setHours(14, 25))
        });

        // Lịch hẹn Completed 3
        appointmentsToSeed.push({
            patientId: bnBe._id,
            doctorId: bsThao._id,
            serviceId: tramRang._id,
            appointmentDate: formatDate(-4),
            startTime: "10:30",
            endTime: "11:00",
            status: "completed",
            notes: "Cháu bé bị sâu răng sữa hàm trên.",
            diagnosis: "Sâu răng 51, 52 (răng cửa sữa hàm trên). Răng sữa chưa đến tuổi thay.",
            checkedInAt: new Date(formatDate(-4).setHours(10, 25)),
            completedAt: new Date(formatDate(-4).setHours(10, 58))
        });

        // Lịch hẹn Completed 4
        appointmentsToSeed.push({
            patientId: bnHoang._id,
            doctorId: bsChi._id,
            serviceId: tayTrang._id,
            appointmentDate: formatDate(-2),
            startTime: "15:00",
            endTime: "16:00",
            status: "completed",
            notes: "Tẩy trắng chuẩn bị chụp hình cưới.",
            diagnosis: "Men răng xỉn màu nhẹ do uống nhiều trà, nướu khỏe mạnh.",
            checkedInAt: new Date(formatDate(-2).setHours(14, 55)),
            completedAt: new Date(formatDate(-2).setHours(15, 58))
        });

        // Các lịch hẹn khác
        appointmentsToSeed.push({
            patientId: bnDuc._id,
            doctorId: bsCuong._id,
            serviceId: nhoRangKhon._id,
            appointmentDate: formatDate(1),
            startTime: "09:30",
            endTime: "10:30",
            status: "confirmed",
            notes: "Răng khôn mọc lệch gây đau nhức.",
            diagnosis: "Răng 48 lệch 45 độ chèn răng 47."
        });

        appointmentsToSeed.push({
            patientId: bnVy._id,
            doctorId: bsBinh._id,
            serviceId: niengRang._id,
            appointmentDate: formatDate(2),
            startTime: "15:00",
            endTime: "15:45",
            status: "pending",
            notes: "Muốn tư vấn niềng răng mắc cài.",
            diagnosis: ""
        });

        appointmentsToSeed.push({
            patientId: bnTriet._id,
            doctorId: bsAn._id,
            serviceId: tayTrang._id,
            appointmentDate: formatDate(0),
            startTime: "14:30",
            endTime: "15:30",
            status: "confirmed",
            notes: "Đã cạo vôi răng tuần trước, hôm nay đến tẩy trắng.",
            diagnosis: ""
        });

        appointmentsToSeed.push({
            patientId: bnDuc._id,
            doctorId: bsCuong._id,
            serviceId: implant._id,
            appointmentDate: formatDate(-2),
            startTime: "10:00",
            endTime: "11:30",
            status: "cancelled",
            notes: "Tư vấn cấy ghép implant răng 46.",
            cancelReason: "Bệnh nhân bận công tác đột xuất.",
            cancelledBy: "patient",
            cancelledAt: new Date(formatDate(-3))
        });

        appointmentsToSeed.push({
            patientId: bnChi2._id,
            doctorId: bsBinh._id,
            serviceId: niengRang._id,
            appointmentDate: formatDate(1),
            startTime: "11:00",
            endTime: "11:45",
            status: "pending",
            notes: "Tư vấn niềng răng chỉnh khớp cắn ngược.",
            diagnosis: ""
        });

        appointmentsToSeed.push({
            patientId: bnHung._id,
            doctorId: bsDung._id,
            serviceId: caoVoi._id,
            appointmentDate: formatDate(3),
            startTime: "09:00",
            endTime: "09:30",
            status: "confirmed",
            notes: "Bệnh nhân có tiền sử huyết áp, cần cạo vôi răng nhẹ nhàng.",
            diagnosis: ""
        });

        const seededAppointments = await Appointment.create(appointmentsToSeed);
        console.log(`✅ Đã seed ${seededAppointments.length} lịch hẹn mẫu thành công!`);

        // 9. Tạo Kết quả khám mẫu (ExamResults) cho 4 lịch hẹn đã hoàn thành
        console.log("📋 Đang tạo hồ sơ bệnh án và kết quả khám mẫu...");
        
        const appt1 = seededAppointments.find(a => a.status === "completed" && a.serviceId.toString() === caoVoi._id.toString() && a.patientId.toString() === bnTriet._id.toString());
        const appt2 = seededAppointments.find(a => a.status === "completed" && a.serviceId.toString() === tramRang._id.toString() && a.patientId.toString() === bnThuong._id.toString());
        const appt3 = seededAppointments.find(a => a.status === "completed" && a.serviceId.toString() === tramRang._id.toString() && a.patientId.toString() === bnBe._id.toString());
        const appt4 = seededAppointments.find(a => a.status === "completed" && a.serviceId.toString() === tayTrang._id.toString() && a.patientId.toString() === bnHoang._id.toString());

        if (appt1) {
            await ExamResult.create({
                appointmentId: appt1._id,
                patientId: appt1.patientId,
                diagnosis: "Vôi răng mảng bám tích tụ nhiều ở hàm dưới (độ 2). Viêm nướu nhẹ viền cổ răng.",
                treatment: "Tiến hành cạo vôi răng bằng sóng siêu âm Cavitron, đánh bóng toàn hàm bằng chổi cước và sò đánh bóng chuyên dụng.",
                treatmentPlan: "Tái khám kiểm tra định kỳ sau mỗi 6 tháng để bảo vệ sức khỏe nướu.",
                prescription: "Nước súc miệng diệt khuẩn Kin Gingival 250ml (ngày súc 2 lần sáng/tối sau ăn).",
                note: "Dặn bệnh nhân hạn chế uống nước màu như trà, cà phê trong 24 giờ đầu sau khi cạo vôi.",
                nextDate: formatDate(180),
                attachments: []
            });
        }

        if (appt2) {
            await ExamResult.create({
                appointmentId: appt2._id,
                patientId: appt2.patientId,
                diagnosis: "Sâu răng ngà nông (răng số 36 - mặt nhai). Lỗ sâu có màu đen, giắt thức ăn nhẹ.",
                treatment: "Mở lối và nạo bỏ toàn bộ mô răng sâu mục. Vệ sinh sát khuẩn xoang hàn bằng chlorhexidine. Trám tạo hình xoang sâu bằng Composite 3M Z250 thẩm mỹ, chiếu đèn Halogen quang trùng hợp.",
                treatmentPlan: "Theo dõi nếu răng ê buốt kéo dài quá 3 ngày thì liên hệ khám lại. Tránh cắn đồ quá cứng ngay vị trí trám trong 24h đầu.",
                prescription: "Không cần kê toa thuốc giảm đau. Chỉ cần giữ gìn vệ sinh răng miệng tốt.",
                note: "Răng phục hình tốt, ăn nhai bình thường.",
                nextDate: null,
                attachments: []
            });
        }

        if (appt3) {
            await ExamResult.create({
                appointmentId: appt3._id,
                patientId: appt3.patientId,
                diagnosis: "Sâu ngà răng sữa 51, 52 thể nhẹ, chưa ảnh hưởng đến tủy răng.",
                treatment: "Nạo sạch lỗ sâu nhẹ nhàng bằng đầu tay khoan siêu êm dành riêng cho trẻ em. Sát khuẩn và trám răng thẩm mỹ bằng Composite lỏng cản quang, chiếu đèn nhẹ.",
                treatmentPlan: "Hướng dẫn phụ huynh chải răng cho bé đúng cách bằng kem đánh răng trẻ em chứa fluoride thấp.",
                prescription: "Không cần kê toa thuốc. Khuyên phụ huynh hạn chế cho bé ăn kẹo ngọt trước khi ngủ.",
                note: "Bé rất ngoan và hợp tác tốt với bác sĩ.",
                nextDate: formatDate(90),
                attachments: []
            });
        }

        if (appt4) {
            await ExamResult.create({
                appointmentId: appt4._id,
                patientId: appt4.patientId,
                diagnosis: "Nhiễm màu ngoại lai sậm do trà, thuốc lá nhẹ. Men răng dày và khỏe.",
                treatment: "Cách ly nướu bằng gel bảo vệ nướu OpalDam. Thoa thuốc tẩy trắng răng Opalescence Boost 40% (2 đợt, mỗi đợt 20 phút), kết hợp chiếu đèn ánh sáng xanh LumaCool kích hoạt.",
                treatmentPlan: "Hạn chế đồ uống sậm màu trong 1 tuần đầu. Có thể ngậm máng tẩy duy trì tại nhà nếu cần thiết.",
                prescription: "Tuýp kem bôi chống ê buốt chống nhạy cảm GC Tooth Mousse (bôi ngày 1 lần sau khi đánh răng).",
                note: "Màu răng sáng lên rõ rệt (tăng 3 tone so với ban đầu). Bệnh nhân rất hài lòng.",
                nextDate: null,
                attachments: []
            });
        }
        console.log("✅ Đã seed hồ sơ bệnh án điện tử thành công!");

        // 10. Seed Hệ thống Thông báo (Notifications)
        console.log("🔔 Đang tạo hệ thống thông báo đẩy mẫu...");
        const notifications = [
            {
                userId: existingAdmin._id,
                type: "appointment",
                title: "Lịch hẹn mới đang chờ duyệt",
                message: `Bệnh nhân Vũ Phương Vy vừa đặt lịch khám Niềng răng ngày ${formatDate(2).toLocaleDateString("vi-VN")}.`,
                isRead: false
            },
            {
                userId: bsAnUser._id,
                type: "appointment",
                title: "Lịch hẹn mới đã được phân bổ",
                message: `Bệnh nhân Lê Minh Triết đặt lịch khám Tẩy trắng răng hôm nay lúc 14:30.`,
                isRead: false
            },
            {
                userId: bnTriet._id,
                type: "reminder",
                title: "Nhắc nhở lịch khám hôm nay",
                message: `Bạn có lịch hẹn khám Tẩy trắng răng tại DentaCare vào lúc 14:30 chiều nay. Vui lòng đến sớm 10 phút.`,
                isRead: false
            },
            {
                userId: bsCuongUser._id,
                type: "system",
                title: "Yêu cầu nghỉ phép được phê duyệt",
                message: `Yêu cầu xin nghỉ phép ngày ${formatDate(-2).toLocaleDateString("vi-VN")} của bác sĩ đã được Admin phê duyệt.`,
                isRead: true
            }
        ];
        await Notification.create(notifications);
        console.log("✅ Đã seed thông báo thành công!");

        // 11. Seed Cơ sở tri thức AI RAG (Knowledge base & Generate vector embeddings with fallback)
        console.log("🤖 Đang tải tài liệu tri thức nha khoa và huấn luyện vector RAG AI...");
        const seededKnowledge = await Knowledge.create(knowledgeData);
        console.log(`   - Đã tạo ${seededKnowledge.length} tệp tài liệu tri thức nha khoa.`);
        
        console.log("   - Đang tiến hành nhúng vector nhúng (vector embeddings) và lưu trữ...");
        try {
            // Sử dụng helper function LangChain/Gemini để cập nhật embedding
            await upsertMongoKnowledgeVectors(seededKnowledge);
            console.log("✅ Đã huấn luyện thành công RAG AI bằng thư viện LangChain & Gemini!");
        } catch (embeddingError) {
            console.warn("\n⚠️  CẢNH BÁO LỖI EM-BEDDING:");
            console.warn(`   - [Lỗi API] ${embeddingError.message}`);
            console.warn("   - Tài liệu tri thức văn bản vẫn được nạp thành công vào database.");
            console.warn("   - Hệ thống RAG AI đã được cấu hình tự động Fallback sang Keyword Search thông minh.");
            console.warn("   - Bạn vẫn có thể chat và tìm kiếm RAG hoàn toàn bình thường khi chạy app!\n");
        }

        console.log("\n⭐️⭐️⭐️ TOÀN BỘ QUÁ TRÌNH SEED DỮ LIỆU ĐÃ HOÀN TẤT THÀNH CÔNG! ⭐️⭐️⭐️");
        console.log("----------------------------------------------------------------------");
        console.log(`1. Tài khoản Admin: ${adminEmail} | ${adminPassword}`);
        console.log(`2. Số lượng bác sĩ: 10 Bác sĩ chuyên khoa (Mật khẩu: Doctor@123456)`);
        console.log(`3. Số lượng bệnh nhân: 30 Bệnh nhân mẫu (Mật khẩu: Patient@123456)`);
        console.log(`4. Lịch trực làm việc: 120 khung lịch hàng tuần.`);
        console.log(`5. Lịch hẹn & bệnh án: 10 Lịch hẹn mẫu, 4 Hồ sơ kết quả khám y khoa.`);
        console.log(`6. Chức năng nâng cao: 3 Đơn xin nghỉ phép, 4 Thông báo hệ thống.`);
        console.log(`7. RAG AI: 3 Tài liệu tri thức nha khoa đã nạp thành công.`);
        console.log("----------------------------------------------------------------------\n");

        process.exit(0);
    } catch (error) {
        console.error("❌ Quá trình seed dữ liệu thất bại:", error);
        process.exit(1);
    }
};

seedDemoData();
