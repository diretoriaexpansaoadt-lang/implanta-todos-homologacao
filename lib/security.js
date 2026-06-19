const crypto = require("crypto");

const SESSION_COOKIE = "implanta_session";
const CSRF_COOKIE = "implanta_csrf";

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, 64);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.startsWith("scrypt$")) return false;
  const [, saltText, hashText] = storedHash.split("$");
  if (!saltText || !hashText) return false;
  const salt = Buffer.from(saltText, "base64url");
  const expected = Buffer.from(hashText, "base64url");
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function createOpaqueToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token, secret) {
  return sign(`token:${token}`, secret);
}

function createSession(user, config) {
  const payload = base64url(JSON.stringify({
    sub: user.id,
    role: user.role,
    exp: Date.now() + config.sessionHours * 60 * 60 * 1000,
    nonce: crypto.randomBytes(8).toString("hex"),
  }));
  return `${payload}.${sign(payload, config.sessionSecret)}`;
}

function verifySession(token, config) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload, config.sessionSecret))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.sub || !parsed.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  return String(req.headers.cookie || "").split(";").reduce((cookies, part) => {
    const index = part.indexOf("=");
    if (index < 0) return cookies;
    const key = part.slice(0, index).trim();
    const value = decodeURIComponent(part.slice(index + 1).trim());
    if (key) cookies[key] = value;
    return cookies;
  }, {});
}

function cookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path || "/"}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  parts.push(`SameSite=${options.sameSite || "Lax"}`);
  return parts.join("; ");
}

function sessionCookies(user, config) {
  const session = createSession(user, config);
  const csrf = createOpaqueToken();
  const maxAge = config.sessionHours * 60 * 60;
  return {
    csrf,
    headers: [
      cookie(SESSION_COOKIE, session, { httpOnly: true, secure: config.productionLike, maxAge }),
      cookie(CSRF_COOKIE, csrf, { secure: config.productionLike, maxAge }),
    ],
  };
}

function clearSessionCookies(config) {
  return [
    cookie(SESSION_COOKIE, "", { httpOnly: true, secure: config.productionLike, maxAge: 0 }),
    cookie(CSRF_COOKIE, "", { secure: config.productionLike, maxAge: 0 }),
  ];
}

function sessionFromRequest(req, config) {
  return verifySession(parseCookies(req)[SESSION_COOKIE], config);
}

function validCsrf(req) {
  const cookies = parseCookies(req);
  const header = req.headers["x-csrf-token"];
  return Boolean(cookies[CSRF_COOKIE] && header && safeEqual(cookies[CSRF_COOKIE], header));
}

module.exports = {
  SESSION_COOKIE,
  CSRF_COOKIE,
  hashPassword,
  verifyPassword,
  createOpaqueToken,
  hashToken,
  parseCookies,
  sessionCookies,
  clearSessionCookies,
  sessionFromRequest,
  validCsrf,
};
