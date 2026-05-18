import jwt from "jsonwebtoken";
import User from "../modules/user/user.model.js";

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            req.user = await User.findById(decoded.id).select("-password");
            
            if (!req.user) {
                return res.status(401).json({ success: false, message: "User not found" });
            }

            if (!req.user.isActive) {
                return res.status(403).json({ success: false, message: "Account is deactivated" });
            }

            return next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ success: false, message: "Not authorized, token failed" });
        }
    }

    return res.status(401).json({ success: false, message: "Not authorized, no token" });
};



// Middleware tùy chọn: gắn req.user nếu có token, không block nếu không có
const optionalProtect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) return next();

    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        if (user && user.isActive) req.user = user;
    } catch (_) {
        // Token lỗi → bỏ qua, vẫn tiếp tục
    }
    return next();
};

export { protect, optionalProtect };
