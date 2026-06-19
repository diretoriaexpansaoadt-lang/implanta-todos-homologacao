const path = require("path");
const crypto = require("crypto");

function booleanEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return /^(1|true|yes|sim)$/i.test(value);
}

function loadConfig(appDir) {
  const nodeEnv = process.env.NODE_ENV || "development";
  const productionLike = nodeEnv === "production" || nodeEnv === "staging";
  const generatedSecret = crypto.randomBytes(48).toString("hex");
  const sessionSecret = process.env.SESSION_SECRET || generatedSecret;

  if (productionLike && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET é obrigatório em staging/production.");
  }
  if (productionLike && (!process.env.BOOTSTRAP_ADMIN_EMAIL || !process.env.BOOTSTRAP_ADMIN_PASSWORD)) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_PASSWORD são obrigatórios na primeira configuração de staging/production.");
  }
  if (productionLike && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL é obrigatória em staging/production.");
  }
  if (productionLike && String(process.env.STORAGE_DRIVER || "").toLowerCase() !== "s3") {
    throw new Error("STORAGE_DRIVER=s3 é obrigatório em staging/production.");
  }

  return {
    appDir,
    nodeEnv,
    productionLike,
    port: Number(process.env.PORT || 8765),
    publicAppUrl: process.env.PUBLIC_APP_URL || "",
    sessionSecret,
    sessionHours: Number(process.env.SESSION_HOURS || 12),
    firstAccessHours: Number(process.env.FIRST_ACCESS_HOURS || 48),
    bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@local",
    bootstrapAdminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD || (productionLike ? "" : "admin123"),
    trustProxy: booleanEnv("TRUST_PROXY", productionLike),
    allowedOrigin: process.env.ALLOWED_ORIGIN || process.env.PUBLIC_APP_URL || "",
    databaseUrl: process.env.DATABASE_URL || "",
    dataDir: process.env.DATA_DIR || path.join(appDir, "data"),
    uploadDir: process.env.UPLOAD_DIR || path.join(appDir, "private-uploads"),
    storageDriver: (process.env.STORAGE_DRIVER || "local").toLowerCase(),
    maxUploadBytes: Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024,
    s3: {
      bucket: process.env.S3_BUCKET || "",
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || "",
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      forcePathStyle: booleanEnv("S3_FORCE_PATH_STYLE", false),
    },
    email: {
      sendgridApiKey: process.env.SENDGRID_API_KEY || "",
      from: process.env.SENDGRID_FROM || "",
    },
    whatsapp: {
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
      twilioFrom: process.env.TWILIO_WHATSAPP_FROM || "",
      token: process.env.WHATSAPP_TOKEN || "",
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    },
    alertIntervalMinutes: Number(process.env.ALERT_INTERVAL_MINUTES || 60),
  };
}

module.exports = { loadConfig };
