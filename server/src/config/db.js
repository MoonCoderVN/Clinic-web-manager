import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import mongoose from "mongoose";
import seedAdmin from "./seedAdmin.js";
import logger from "../utils/logger.js";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        // Tự động tạo tài khoản admin nếu chưa có
        await seedAdmin();
    } catch (error) {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
