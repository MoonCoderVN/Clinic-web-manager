import jwt from "jsonwebtoken";

export const generateAccessToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: "15m", // Ngắn hạn
    });
};

export const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: "7d", // Dài hạn
    });
};
