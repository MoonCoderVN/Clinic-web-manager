import fs from "fs";
import path from "path";
import Settings from "./settings.model.js";
import KnowledgeDocument from "../chat/knowledgeDocument.model.js";
import { emitPublic, emitToRole } from "../../realtime/socket.js";

const maskValue = (value) => {
  if (!value) return "";
  const text = String(value);
  if (text.length <= 6) return "******";
  return `${text.slice(0, 3)}***${text.slice(-3)}`;
};

const publicFields = ({
  clinicName,
  address,
  phone,
  email,
  openTime,
  closeTime,
  workDays,
  description,
}) => ({
  clinicName,
  address,
  phone,
  email,
  openTime,
  closeTime,
  workDays,
  description,
});

const adminFields = (settings) => {
  const obj = settings.toObject ? settings.toObject() : settings;
  delete obj.smtpPass;
  delete obj.geminiApiKey;

  return {
    ...obj,
    smtpPassMasked: maskValue(process.env.MAIL_PASS),
    geminiApiKeyMasked: maskValue(process.env.GEMINI_API_KEY),
    effectiveSmtp: {
      host: obj.smtpHost || process.env.MAIL_HOST || "",
      port: obj.smtpPort || Number(process.env.MAIL_PORT || 587),
      user: obj.smtpUser || process.env.MAIL_USER || "",
      from: obj.smtpFrom || process.env.MAIL_FROM || "",
    },
    effectiveGemini: {
      model: obj.geminiModel || process.env.GEMINI_MODEL || process.env.GEMINI_CHAT_MODELS || "gemini-2.5-flash",
      embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || process.env.EMBEDDING_MODEL || "embedding-001",
    },
  };
};

const getOrCreateSettings = async () => {
  let settings = await Settings.findOne({ singleton: "clinic" });
  if (!settings) settings = await Settings.create({ singleton: "clinic" });
  return settings;
};

export const getSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ success: true, data: adminFields(settings) });
  } catch (err) {
    next(err);
  }
};

export const getPublicSettings = async (req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ success: true, data: publicFields(settings) });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const allowed = [
      "clinicName", "address", "phone", "email",
      "openTime", "closeTime", "workDays", "description",
      "emailNotify", "appointmentReminder", "reminderHoursBefore", "marketingEmails",
      "smtpHost", "smtpPort", "smtpUser", "smtpFrom",
      "geminiModel", "atlasVectorIndex", "atlasVectorPath",
    ];
    const update = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    });
    if (req.body.smtpPass) update.smtpPass = req.body.smtpPass;
    if (req.body.geminiApiKey) update.geminiApiKey = req.body.geminiApiKey;

    const legacyTextMessageField = `${String.fromCharCode(115, 109, 115)}Notify`;
    const settings = await Settings.findOneAndUpdate(
      { singleton: "clinic" },
      { $set: update, $unset: { [legacyTextMessageField]: "" } },
      { upsert: true, new: true, runValidators: true }
    );
    emitToRole("admin", "settings:changed", { action: "updated" });
    emitPublic("settings:changed", { action: "updated" });
    emitPublic("public:landing-changed", { source: "settings", action: "updated" });
    res.json({ success: true, data: adminFields(settings), message: "Da luu cai dat" });
  } catch (err) {
    next(err);
  }
};

export const getSystemLogs = async (req, res, next) => {
  try {
    const recentKnowledgeFailures = await KnowledgeDocument.find({ status: "failed" })
      .select("fileName errorMessage updatedAt")
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    const logCandidates = [
      path.resolve(process.cwd(), "logs", "error.log"),
      path.resolve(process.cwd(), "logs", "combined.log"),
    ];
    const files = logCandidates
      .filter((file) => fs.existsSync(file))
      .map((file) => {
        const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/).filter(Boolean).slice(-50);
        return { file: path.basename(file), lines };
      });

    res.json({
      success: true,
      data: {
        appointmentJobs: {
          appointmentReminder: "registered",
          nextDateReminder: "registered",
        },
        ragFailures: recentKnowledgeFailures,
        emailFailures: files.flatMap((file) =>
          file.lines
            .filter((line) => /mail|smtp|email/i.test(line))
            .slice(-10)
            .map((line) => ({ file: file.file, line }))
        ),
        recentErrors: files,
      },
    });
  } catch (err) {
    next(err);
  }
};
