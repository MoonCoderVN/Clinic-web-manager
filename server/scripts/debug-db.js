import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Run from server/: node scripts/debug-db.js
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB Connected");

        const Doctor = (await import("../src/modules/doctor/doctor.model.js")).default;
        const Schedule = (await import("../src/modules/schedule/schedule.model.js")).default;
        const Service = (await import("../src/modules/service/service.model.js")).default;

        console.log("--- DOCTORS ---");
        const doctors = await Doctor.find({}).populate("userId", "fullName role").lean();
        for (const doc of doctors) {
            console.log(`Doctor: ${doc.userId?.fullName} (User ID: ${doc.userId?._id}) (Doc ID: ${doc._id})`);
            console.log(`  Services: ${doc.services.join(", ")}`);
        }

        console.log("\n--- SCHEDULES ---");
        const schedules = await Schedule.find({}).lean();
        for (const sch of schedules) {
            console.log(`Schedule: UserID=${sch.doctorId}, Day=${sch.dayOfWeek}, Time=${sch.startTime}-${sch.endTime}, WeekStart=${sch.weekStart}`);
        }

        console.log("\n--- SERVICES ---");
        const services = await Service.find({}).lean();
        for (const svc of services) {
            console.log(`Service: ${svc.name} (ID: ${svc._id})`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

connectDB();
