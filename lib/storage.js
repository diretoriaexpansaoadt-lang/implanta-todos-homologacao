const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function safeFileName(name) {
  return path.basename(String(name || "arquivo")).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
}

function validateUpload(file, config) {
  if (!file || !file.dataUrl || !file.name) throw new Error("Arquivo inválido.");
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(file.dataUrl);
  if (!match) throw new Error("Formato de arquivo inválido.");
  const contentType = String(file.type || match[1]).toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) throw new Error("Tipo de arquivo não permitido.");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > config.maxUploadBytes) {
    throw new Error(`O arquivo deve ter no máximo ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB.`);
  }
  return { bytes, contentType };
}

class LocalStorage {
  constructor(config) {
    this.config = config;
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }

  async put(file, context = {}) {
    const { bytes, contentType } = validateUpload(file, this.config);
    const key = `${context.unitId || "global"}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${safeFileName(file.name)}`;
    const destination = path.join(this.config.uploadDir, ...key.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
    return { key, name: safeFileName(file.name), type: contentType, size: bytes.length, url: `/api/files/${encodeURIComponent(key)}` };
  }

  async get(key) {
    const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    const file = path.join(this.config.uploadDir, normalized);
    if (!file.startsWith(path.resolve(this.config.uploadDir))) throw new Error("Arquivo inválido.");
    return { body: fs.createReadStream(file), contentLength: fs.statSync(file).size };
  }
}

class S3Storage {
  constructor(config) {
    let S3Client;
    let PutObjectCommand;
    let GetObjectCommand;
    try {
      ({ S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3"));
    } catch {
      throw new Error("STORAGE_DRIVER=s3 exige o pacote @aws-sdk/client-s3. Execute npm install.");
    }
    this.PutObjectCommand = PutObjectCommand;
    this.GetObjectCommand = GetObjectCommand;
    this.config = config;
    this.client = new S3Client({
      region: config.s3.region,
      endpoint: config.s3.endpoint || undefined,
      forcePathStyle: config.s3.forcePathStyle,
      credentials: config.s3.accessKeyId ? {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      } : undefined,
    });
  }

  async put(file, context = {}) {
    const { bytes, contentType } = validateUpload(file, this.config);
    const key = `${context.unitId || "global"}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}-${safeFileName(file.name)}`;
    await this.client.send(new this.PutObjectCommand({
      Bucket: this.config.s3.bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
    }));
    return { key, name: safeFileName(file.name), type: contentType, size: bytes.length, url: `/api/files/${encodeURIComponent(key)}` };
  }

  async get(key) {
    const result = await this.client.send(new this.GetObjectCommand({ Bucket: this.config.s3.bucket, Key: key }));
    return { body: result.Body, contentType: result.ContentType, contentLength: result.ContentLength };
  }
}

function createStorage(config) {
  if (config.storageDriver === "s3") {
    if (!config.s3.bucket) throw new Error("S3_BUCKET é obrigatório com STORAGE_DRIVER=s3.");
    return new S3Storage(config);
  }
  return new LocalStorage(config);
}

module.exports = { createStorage };
