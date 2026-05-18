import User from "../modules/user/user.model.js";

/**
 * Tự động tạo tài khoản Admin mặc định nếu chưa tồn tại.
 * Được gọi ngay sau khi kết nối DB thành công.
 * Thông tin admin lấy từ file .env
 * 
 * LƯU Ý: KHÔNG hash password thủ công ở đây.
 * Model User đã có pre('save') hook tự hash rồi.
 */
const seedAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || "admin@dentacare.com";
        const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";
        const adminName = process.env.ADMIN_NAME || "Super Admin";
        const adminPhone = process.env.ADMIN_PHONE || "0900000000";

        const existingAdmin = await User.findOne({ role: "admin" });

        if (existingAdmin) {
            // Admin đã tồn tại, không làm gì
            return;
        }

        // Để model tự hash qua pre('save') hook — KHÔNG hash thủ công
        await User.create({
            fullName: adminName,
            email: adminEmail,
            password: adminPassword,   // plain text — model sẽ tự hash
            phone: adminPhone,
            role: "admin",
            isActive: true,
        });

        console.log("✅ Admin account created successfully!");
        console.log(`   Email   : ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);
        console.log("   ⚠️  Hãy đổi mật khẩu sau khi đăng nhập lần đầu!");
    } catch (error) {
        console.error("❌ Failed to seed admin:", error.message);
    }
};

export default seedAdmin;
