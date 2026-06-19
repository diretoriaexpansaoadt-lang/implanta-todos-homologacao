const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { loadConfig } = require("./lib/config");
const { createRepository } = require("./lib/repository");
const { createStorage } = require("./lib/storage");
const {
  hashPassword,
  verifyPassword,
  createOpaqueToken,
  hashToken,
  sessionCookies,
  clearSessionCookies,
  sessionFromRequest,
  validCsrf,
} = require("./lib/security");

const APP_DIR = __dirname;
const config = loadConfig(APP_DIR);
const PORT = config.port;
const DATA_DIR = config.dataDir;
const STATE_FILE = path.join(DATA_DIR, "app-state.json");
const OUTBOX_FILE = path.join(DATA_DIR, "notification-outbox.json");
const LOG_FILE = path.join(DATA_DIR, "notification-log.json");
const repository = createRepository(config);
const storage = createStorage(config);
const loginAttempts = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true });

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function readBaseData() {
  const raw = fs.readFileSync(path.join(APP_DIR, "data.js"), "utf8");
  const match = raw.match(/window\.ENXOVAL_DATA\s*=\s*(\{[\s\S]*\});?\s*$/);
  return match ? JSON.parse(match[1]) : { items: [], categories: [], statuses: [], priorities: [] };
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

function defaultState() {
  const base = readBaseData();
  if (config.productionLike) {
    const admin = {
      id: uuid(),
      name: "Administrador",
      email: config.bootstrapAdminEmail,
      phone: "",
      role: "Administrador",
      active: true,
      passwordHash: hashPassword(config.bootstrapAdminPassword),
      mustChangePassword: true,
    };
    return {
      exportedAt: new Date().toISOString(),
      activeUserId: admin.id,
      selectedUnitId: "",
      items: base.items || [],
      users: [admin],
      units: [],
      checklist: {},
      documents: {},
      documentGuidance: {},
      itemPhotos: {},
      notifications: [],
      milestones: {},
      authTokens: {},
    };
  }
  const admin = { id: uuid(), name: "Administrador", email: "admin@local", phone: "", role: "Administrador", active: true, passwordHash: hashPassword("admin123"), mustChangePassword: true };
  const consultant = { id: uuid(), name: "Consultor de implantação", email: "consultor@local", phone: "", role: "Consultor de implantação", active: true, passwordHash: hashPassword("consultor123"), mustChangePassword: true };
  const franchisee = { id: uuid(), name: "Franqueado", email: "franqueado@local", phone: "", role: "Franqueado", active: true, passwordHash: hashPassword("franqueado123"), mustChangePassword: true };
  const accounting = { id: uuid(), name: "Contabilidade", email: "contabilidade@local", phone: "", role: "Contabilidade", active: true, passwordHash: hashPassword("contabilidade123"), mustChangePassword: true };
  const unit = { id: uuid(), name: "Unidade Franqueado", city: "", franchiseeUserId: franchisee.id, createdAt: new Date().toISOString(), active: true };
  franchisee.unitId = unit.id;
  return {
    exportedAt: new Date().toISOString(),
    activeUserId: admin.id,
    selectedUnitId: unit.id,
    items: base.items || [],
    users: [admin, consultant, accounting, franchisee],
    units: [unit],
    checklist: {},
    documents: {},
    documentGuidance: {},
    itemPhotos: {},
    notifications: [],
    milestones: {},
    authTokens: {},
  };
}

function migrateAuthentication(state) {
  let changed = false;
  const secretFingerprint = hashToken("secret-fingerprint", config.sessionSecret).slice(0, 16);
  const localPasswords = {
    "admin@local": "admin123",
    "consultor@local": "consultor123",
    "contabilidade@local": "contabilidade123",
    "franqueado@local": "franqueado123",
  };
  const existingTokens = state.authTokens && typeof state.authTokens === "object" ? state.authTokens : {};
  state.authTokens = Object.fromEntries(Object.entries(existingTokens).filter(([, token]) => {
    const valid = token.secretFingerprint === secretFingerprint && new Date(token.expiresAt).getTime() > Date.now();
    if (!valid) changed = true;
    return valid;
  }));
  state.users = (state.users || []).map((user) => {
    const migrated = { ...user };
    if (!migrated.passwordHash) {
      const email = String(migrated.email || "").toLowerCase();
      const bootstrapPassword = email === String(config.bootstrapAdminEmail).toLowerCase()
        ? config.bootstrapAdminPassword
        : "";
      const legacyPassword = migrated.password || migrated.senha || localPasswords[email] || bootstrapPassword || "";
      if (legacyPassword) migrated.passwordHash = hashPassword(legacyPassword);
      migrated.mustChangePassword = true;
      changed = true;
    }
    delete migrated.password;
    delete migrated.senha;
    return migrated;
  });
  return { state, changed };
}

function getState() {
  return repository.get();
}

async function saveState(state) {
  const clean = {
    exportedAt: new Date().toISOString(),
    activeUserId: state.activeUserId || "",
    selectedUnitId: state.selectedUnitId || "",
    items: Array.isArray(state.items) ? state.items : [],
    users: Array.isArray(state.users) ? state.users : [],
    units: Array.isArray(state.units) ? state.units : [],
    checklist: state.checklist && typeof state.checklist === "object" && !Array.isArray(state.checklist) ? state.checklist : {},
    documents: state.documents && typeof state.documents === "object" && !Array.isArray(state.documents) ? state.documents : {},
    documentGuidance: state.documentGuidance && typeof state.documentGuidance === "object" && !Array.isArray(state.documentGuidance) ? state.documentGuidance : {},
    itemPhotos: state.itemPhotos && typeof state.itemPhotos === "object" && !Array.isArray(state.itemPhotos) ? state.itemPhotos : {},
    notifications: Array.isArray(state.notifications) ? state.notifications.slice(0, 500) : [],
    milestones: state.milestones && typeof state.milestones === "object" && !Array.isArray(state.milestones) ? state.milestones : {},
    authTokens: state.authTokens && typeof state.authTokens === "object" && !Array.isArray(state.authTokens) ? state.authTokens : {},
  };
  clean.users = clean.users.map((user) => ({
    ...user,
    passwordHash: user.passwordHash || "",
    password: undefined,
    senha: undefined,
  }));
  await repository.save(clean);
  return clean;
}

function publicUser(user) {
  const { passwordHash, password, senha, ...safe } = user || {};
  return safe;
}

function stateForUser(state, user) {
  const safe = {
    ...state,
    users: (state.users || []).map(publicUser),
  };
  delete safe.authTokens;
  if (user.role !== "Franqueado") return safe;

  const unitId = user.unitId || state.units.find((unit) => unit.franchiseeUserId === user.id)?.id || "";
  const scopedKeys = (object) => Object.fromEntries(
    Object.entries(object || {}).filter(([key]) => key.startsWith(`${unitId}::`))
  );
  safe.users = safe.users.filter((candidate) =>
    candidate.id === user.id ||
    candidate.role === "Administrador" ||
    candidate.role === "Consultor de implantação"
  );
  safe.units = safe.units.filter((unit) => unit.id === unitId);
  safe.checklist = scopedKeys(safe.checklist);
  safe.documents = scopedKeys(safe.documents);
  safe.notifications = (safe.notifications || []).filter((notification) => !notification.unitId || notification.unitId === unitId);
  safe.milestones = scopedKeys(safe.milestones);
  safe.activeUserId = user.id;
  safe.selectedUnitId = unitId;
  return safe;
}

function mergeScopedObject(current, incoming, unitId) {
  const merged = { ...(current || {}) };
  Object.entries(incoming || {}).forEach(([key, value]) => {
    if (key.startsWith(`${unitId}::`)) merged[key] = value;
  });
  return merged;
}

function synchronizeUsers(currentUsers, incomingUsers, actor) {
  if (actor.role !== "Administrador") return currentUsers;
  const currentById = new Map((currentUsers || []).map((user) => [user.id, user]));
  return (incomingUsers || []).map((incoming) => {
    const current = currentById.get(incoming.id) || {};
    const next = {
      ...current,
      ...incoming,
      passwordHash: current.passwordHash || "",
    };
    const suppliedPassword = incoming.password || incoming.senha || "";
    if (suppliedPassword) {
      next.passwordHash = hashPassword(suppliedPassword);
      next.mustChangePassword = true;
    }
    delete next.password;
    delete next.senha;
    return next;
  });
}

const DOCUMENT_TYPE_IDS = Array.from({ length: 13 }, (_, index) => `doc-${String(index + 1).padStart(2, "0")}`);

function checklistIsComplete(state, unitId) {
  const items = state.items || [];
  return items.length > 0 && items.every((item) => {
    const itemId = item.id || item.linha || itemName(item);
    return Boolean(state.checklist?.[`${unitId}::${itemId}`]?.done);
  });
}

function documentsAreComplete(state, unitId) {
  return DOCUMENT_TYPE_IDS.every((documentId) => {
    const entry = state.documents?.[`${unitId}::${documentId}`];
    return entry?.status === "Concluido" &&
      Boolean(entry.approvedAt) &&
      Boolean(entry.file?.url || entry.file?.dataUrl || entry.file?.key);
  });
}

function applyWorkflowGuards(current, proposed, actor) {
  const currentById = new Map((current.units || []).map((unit) => [unit.id, unit]));
  proposed.units = (proposed.units || []).map((unit) => {
    const previous = currentById.get(unit.id) || {};
    const guarded = { ...unit };

    if (previous.implementationArchivedAt) {
      guarded.implementationArchivedAt = previous.implementationArchivedAt;
      guarded.implementationArchivedBy = previous.implementationArchivedBy || "";
    } else if (unit.implementationArchivedAt) {
      const authorized = ["Administrador", "Consultor de implantação"].includes(actor.role);
      if (!authorized || !checklistIsComplete(proposed, unit.id)) {
        guarded.implementationArchivedAt = "";
        guarded.implementationArchivedBy = "";
      }
    }

    if (previous.documentsArchivedAt) {
      guarded.documentFinalApprovals = previous.documentFinalApprovals || {};
      guarded.documentsArchivedAt = previous.documentsArchivedAt;
      return guarded;
    }

    const completeDocuments = documentsAreComplete(proposed, unit.id);
    const approvals = completeDocuments ? { ...(previous.documentFinalApprovals || {}) } : {};
    if (completeDocuments && ["Administrador", "Contabilidade"].includes(actor.role)) {
      const ownApproval = unit.documentFinalApprovals?.[actor.role];
      if (ownApproval) approvals[actor.role] = ownApproval;
    }
    guarded.documentFinalApprovals = approvals;
    guarded.documentsArchivedAt = approvals.Administrador && approvals.Contabilidade
      ? (unit.documentsArchivedAt || previous.documentsArchivedAt || new Date().toISOString())
      : "";
    return guarded;
  });
  return proposed;
}

function stateUpdateForUser(current, incoming, actor) {
  const next = { ...current };
  if (actor.role === "Administrador") {
    Object.assign(next, incoming);
    next.users = synchronizeUsers(current.users, incoming.users, actor);
    next.authTokens = current.authTokens || {};
    return applyWorkflowGuards(current, next, actor);
  }
  if (actor.role === "Consultor de implantação") {
    ["items", "units", "checklist", "documents", "itemPhotos", "notifications", "milestones"].forEach((field) => {
      if (incoming[field] !== undefined) next[field] = incoming[field];
    });
    return applyWorkflowGuards(current, next, actor);
  }
  if (actor.role === "Contabilidade") {
    ["documents", "documentGuidance", "notifications"].forEach((field) => {
      if (incoming[field] !== undefined) next[field] = incoming[field];
    });
    if (Array.isArray(incoming.units)) {
      const incomingById = new Map(incoming.units.map((unit) => [unit.id, unit]));
      next.units = (current.units || []).map((unit) => {
        const proposed = incomingById.get(unit.id);
        if (!proposed) return unit;
        const approvals = {
          ...(unit.documentFinalApprovals || {}),
        };
        if (proposed.documentFinalApprovals?.Contabilidade) {
          approvals.Contabilidade = proposed.documentFinalApprovals.Contabilidade;
        }
        const canArchiveDocuments = Boolean(approvals.Administrador && approvals.Contabilidade);
        return {
          ...unit,
          documentFinalApprovals: approvals,
          documentsArchivedAt: canArchiveDocuments ? (proposed.documentsArchivedAt || unit.documentsArchivedAt || new Date().toISOString()) : "",
        };
      });
    }
    return applyWorkflowGuards(current, next, actor);
  }
  const unitId = actor.unitId || current.units.find((unit) => unit.franchiseeUserId === actor.id)?.id || "";
  next.checklist = mergeScopedObject(current.checklist, incoming.checklist, unitId);
  next.documents = mergeScopedObject(current.documents, incoming.documents, unitId);
  next.milestones = mergeScopedObject(current.milestones, incoming.milestones, unitId);
  next.notifications = [
    ...(current.notifications || []).filter((notification) => notification.unitId && notification.unitId !== unitId),
    ...(incoming.notifications || []).filter((notification) => !notification.unitId || notification.unitId === unitId),
  ].slice(0, 500);
  return applyWorkflowGuards(current, next, actor);
}

function requestIp(req) {
  if (config.trustProxy && req.headers["x-forwarded-for"]) {
    return String(req.headers["x-forwarded-for"]).split(",")[0].trim();
  }
  return req.socket.remoteAddress || "";
}

function currentAuthenticatedUser(req) {
  const session = sessionFromRequest(req, config);
  if (!session) return null;
  const user = getState().users.find((candidate) => candidate.id === session.sub && candidate.active !== false);
  return user || null;
}

function requireAuthentication(req, res, roles = null) {
  const user = currentAuthenticatedUser(req);
  if (!user) {
    sendJson(res, 401, { error: "Sessão inválida ou expirada." });
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    sendJson(res, 403, { error: "Você não tem permissão para esta operação." });
    return null;
  }
  return user;
}

function requireCsrf(req, res) {
  if (validCsrf(req)) return true;
  sendJson(res, 403, { error: "Validação de segurança expirada. Atualize a página e tente novamente." });
  return false;
}

async function audit(req, user, action, detail = {}) {
  await repository.audit({
    actorId: user?.id || "",
    actorEmail: user?.email || "",
    action,
    detail,
    ip: requestIp(req),
    createdAt: new Date().toISOString(),
  });
}

function todayIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
}

function daysUntil(dateIso) {
  if (!dateIso) return null;
  const today = new Date(`${todayIso()}T00:00:00`);
  const due = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  return Math.round((due - today) / 86400000);
}

function alertInfo(item) {
  if (item.status === "Comprado" || item.status === "Cancelado") return { label: "Concluído", days: null };
  const days = daysUntil(item.vencimento || item["Vencimento"]);
  if (days === null) return { label: "Sem data", days: null };
  if (days < 0) return { label: "Vencido", days };
  if (days === 0) return { label: "Vence hoje", days };
  if (days <= 7) return { label: "Próx. 7 dias", days };
  if (days <= 30) return { label: "Próx. 30 dias", days };
  return { label: "No prazo", days };
}

function totalOf(item) {
  const value = Number(item.valor ?? item["Valor Unitário"] ?? 0) || 0;
  const qty = Number(item.quantidade ?? item["Quantidade"] ?? 0) || 0;
  return value * qty;
}

function checklistDone(state, unitId, itemId) {
  return Boolean(state.checklist?.[`${unitId}::${itemId}`]?.done);
}

function itemName(item) {
  return item.item || item["Item"] || "Item sem nome";
}

function itemCategory(item) {
  return item.categoria || item["Categoria"] || "Sem categoria";
}

function itemDue(item) {
  return item.vencimento || item["Vencimento"] || "";
}

function formatDate(dateIso) {
  if (!dateIso) return "sem data";
  const [year, month, day] = String(dateIso).split("-");
  return year && month && day ? `${day}/${month}/${year}` : dateIso;
}

function cleanPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function unitOwner(state, unit) {
  return state.users.find((user) => user.id === unit.franchiseeUserId || user.unitId === unit.id) || null;
}

function managementUsers(state) {
  return state.users.filter((user) => user.active && (user.role === "Administrador" || user.role === "Consultor de implantação"));
}

function uniqueUsers(rows) {
  const seen = new Set();
  return rows.filter((user) => {
    if (!user || seen.has(user.id)) return false;
    seen.add(user.id);
    return true;
  });
}

function recipientsForUnit(state, unit) {
  return uniqueUsers([unitOwner(state, unit), ...managementUsers(state)]).filter((user) => user.active !== false);
}

function alertMessage(unit, item, info) {
  const value = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalOf(item));
  return [
    `Alerta de implantação - ${unit.name}`,
    `Item: ${itemName(item)}`,
    `Categoria: ${itemCategory(item)}`,
    `Vencimento: ${formatDate(itemDue(item))}`,
    `Situação: ${info.label}`,
    `Valor estimado: ${value}`,
  ].join("\n");
}

function appendOutbox(entry) {
  const outbox = readJson(OUTBOX_FILE, []);
  outbox.push({ ...entry, createdAt: new Date().toISOString() });
  writeJson(OUTBOX_FILE, outbox.slice(-1000));
}

async function sendEmail(to, subject, body) {
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM) {
    return { sent: false, reason: "SENDGRID_API_KEY/SENDGRID_FROM não configurados" };
  }
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.SENDGRID_FROM },
      subject,
      content: [{ type: "text/plain", value: body }],
    }),
  });
  return { sent: response.ok, reason: response.ok ? "sent" : await response.text() };
}

async function sendWhatsapp(to, body) {
  const phone = cleanPhone(to);
  if (!phone) return { sent: false, reason: "WhatsApp não cadastrado" };
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) {
    const params = new URLSearchParams({
      From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      To: `whatsapp:+${phone}`,
      Body: body,
    });
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    return { sent: response.ok, reason: response.ok ? "sent" : await response.text() };
  }
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    const response = await fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body },
      }),
    });
    return { sent: response.ok, reason: response.ok ? "sent" : await response.text() };
  }
  return { sent: false, reason: "provedor de WhatsApp não configurado" };
}

async function runAlerts() {
  const state = getState();
  const log = readJson(LOG_FILE, {});
  const alertLabels = new Set(["Vencido", "Vence hoje", "Próx. 7 dias", "Próx. 30 dias"]);
  const results = [];

  for (const unit of state.units.filter((candidate) => candidate.active !== false && !candidate.implementationArchivedAt)) {
    for (const item of state.items) {
      const id = item.id || item.linha || itemName(item);
      const info = alertInfo(item);
      if (!alertLabels.has(info.label) || checklistDone(state, unit.id, id)) continue;
      const recipients = recipientsForUnit(state, unit);
      for (const user of recipients) {
        const body = alertMessage(unit, item, info);
        const subject = `Alerta de prazo - ${unit.name} - ${itemName(item)}`;
        for (const channel of ["email", "whatsapp"]) {
          const key = `${todayIso()}::${unit.id}::${id}::${user.id}::${channel}::${info.label}`;
          if (log[key]) continue;
          let result;
          if (channel === "email" && user.email && !user.email.endsWith("@local")) {
            result = await sendEmail(user.email, subject, body);
          } else if (channel === "whatsapp" && user.phone) {
            result = await sendWhatsapp(user.phone, body);
          } else {
            result = { sent: false, reason: `${channel} não cadastrado` };
          }
          const entry = { channel, unitId: unit.id, unitName: unit.name, itemId: id, itemName: itemName(item), userId: user.id, userName: user.name, target: channel === "email" ? user.email : user.phone, alert: info.label, result };
          results.push(entry);
          appendOutbox(entry);
          log[key] = { at: new Date().toISOString(), result };
        }
      }
    }
  }
  writeJson(LOG_FILE, log);
  return { checkedAt: new Date().toISOString(), attempts: results.length, results };
}

async function createFirstAccess(userId) {
  const state = getState();
  const user = state.users.find((candidate) => candidate.id === userId && candidate.active !== false);
  if (!user) throw new Error("Usuário não encontrado ou inativo.");
  const token = createOpaqueToken();
  state.authTokens[hashToken(token, config.sessionSecret)] = {
    userId: user.id,
    type: "first-access",
    expiresAt: new Date(Date.now() + config.firstAccessHours * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    secretFingerprint: hashToken("secret-fingerprint", config.sessionSecret).slice(0, 16),
  };
  user.mustChangePassword = true;
  await saveState(state);
  const base = config.publicAppUrl || `http://127.0.0.1:${PORT}/`;
  return { user, link: `${base.replace(/\/$/, "")}/?firstAccess=${encodeURIComponent(token)}` };
}

async function sendInvite(payload) {
  const { user, link } = await createFirstAccess(payload.userId);
  const subject = "Seu acesso à plataforma de implantação da Audição de TODOS";
  const body = [
    `Olá ${user.name || "usuário"}, seja bem-vindo(a) à plataforma de implantação da Audição de TODOS.`,
    "",
    "Use o link abaixo para criar sua senha de primeiro acesso.",
    `Login: ${user.email || ""}`,
    "",
    `Criar senha: ${link}`,
    "",
    `Este link expira em ${config.firstAccessHours} horas e só pode ser usado uma vez.`,
  ].join("\n");
  if (!user.email || String(user.email).endsWith("@local")) {
    const result = { sent: false, reason: "Usuário sem e-mail válido" };
    appendOutbox({ channel: "system", type: "invite", userId: user.id, userName: user.name, result, body });
    return { sent: false, reason: result.reason, results: [] };
  }

  const result = await sendEmail(user.email, subject, body);
  const results = [{ channel: "email", target: user.email, result }];
  appendOutbox({ channel: "email", type: "invite", userId: user.id, userName: user.name, target: user.email, result, body });
  return {
    sent: result.sent,
    reason: result.reason,
    results,
    link,
  };
}

async function sendOperationalNotification(payload) {
  const notification = payload.notification || {};
  const state = getState();
  const roles = Array.isArray(notification.recipientRoles) ? notification.recipientRoles : [];
  const recipients = state.users.filter((user) =>
    user.active !== false &&
    roles.includes(user.role) &&
    user.email &&
    !String(user.email).endsWith("@local")
  );
  const log = readJson(LOG_FILE, {});
  const unit = state.units.find((candidate) => candidate.id === notification.unitId);
  const subject = notification.type === "document-upload"
    ? `Novo documento enviado - ${unit?.name || "Unidade"}`
    : `Unidade apta para inauguração - ${unit?.name || "Unidade"}`;
  const body = [
    notification.title || "Notificação Implanta TODOS",
    "",
    notification.message || "",
    notification.detail || "",
    "",
    `Data: ${new Date(notification.createdAt || Date.now()).toLocaleString("pt-BR")}`,
  ].filter(Boolean).join("\n");
  const results = [];

  for (const user of recipients) {
    const key = `notification::${notification.id || notification.createdAt}::${user.id}`;
    if (log[key]) {
      results.push({ userId: user.id, userName: user.name, target: user.email, skipped: true, result: log[key].result });
      continue;
    }
    const result = await sendEmail(user.email, subject, body);
    const entry = {
      channel: "email",
      type: notification.type,
      notificationId: notification.id,
      unitId: notification.unitId,
      unitName: unit?.name || "",
      userId: user.id,
      userName: user.name,
      target: user.email,
      result,
      body,
    };
    results.push(entry);
    appendOutbox(entry);
    log[key] = { at: new Date().toISOString(), result };
  }

  if (!recipients.length) {
    appendOutbox({
      channel: "system",
      type: notification.type,
      notificationId: notification.id,
      unitId: notification.unitId,
      result: { sent: false, reason: "Nenhum destinatário com e-mail válido" },
      body,
    });
  }
  writeJson(LOG_FILE, log);
  return {
    sent: results.some((entry) => entry.result?.sent),
    recipients: recipients.length,
    results,
    reason: recipients.length ? "" : "Nenhum destinatário com e-mail válido",
  };
}

function loginAttemptKey(req, email) {
  return `${requestIp(req)}::${String(email || "").toLowerCase()}`;
}

function checkLoginRate(req, email) {
  const key = loginAttemptKey(req, email);
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || record.resetAt < now) {
    loginAttempts.set(key, { count: 0, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  return record.count < 8;
}

function registerLoginFailure(req, email) {
  const key = loginAttemptKey(req, email);
  const record = loginAttempts.get(key) || { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
  record.count += 1;
  loginAttempts.set(key, record);
}

function clearLoginFailures(req, email) {
  loginAttempts.delete(loginAttemptKey(req, email));
}

async function login(req, res, payload) {
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  if (!checkLoginRate(req, email)) {
    return sendJson(res, 429, { error: "Muitas tentativas. Aguarde 15 minutos." });
  }
  const user = getState().users.find((candidate) =>
    candidate.active !== false && String(candidate.email || "").toLowerCase() === email
  );
  if (!user || !verifyPassword(password, user.passwordHash)) {
    registerLoginFailure(req, email);
    await audit(req, user, "auth.login_failed", { email });
    return sendJson(res, 401, { error: "Login ou senha inválidos." });
  }
  clearLoginFailures(req, email);
  const session = sessionCookies(user, config);
  res.setHeader("Set-Cookie", session.headers);
  await audit(req, user, "auth.login", {});
  return sendJson(res, 200, { user: publicUser(user), csrfToken: session.csrf });
}

async function completeFirstAccess(req, res, payload) {
  const token = String(payload.token || "");
  const password = String(payload.password || "");
  if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return sendJson(res, 400, { error: "Use ao menos 10 caracteres, com maiúscula, minúscula e número." });
  }
  const state = getState();
  const tokenHash = hashToken(token, config.sessionSecret);
  const record = state.authTokens[tokenHash];
  if (!record || record.type !== "first-access" || new Date(record.expiresAt).getTime() < Date.now()) {
    return sendJson(res, 400, { error: "Link inválido ou expirado. Solicite um novo primeiro acesso." });
  }
  const user = state.users.find((candidate) => candidate.id === record.userId && candidate.active !== false);
  if (!user) return sendJson(res, 400, { error: "Usuário não encontrado ou inativo." });
  user.passwordHash = hashPassword(password);
  user.mustChangePassword = false;
  delete state.authTokens[tokenHash];
  await saveState(state);
  await audit(req, user, "auth.first_access_completed", {});
  return sendJson(res, 200, { ok: true });
}

function applySecurityHeaders(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
  );
  if (config.productionLike) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  if (config.allowedOrigin && req.headers.origin === config.allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", config.allowedOrigin);
    res.setHeader("Vary", "Origin");
  }
}

function sendJson(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > Math.max(1_000_000, config.maxUploadBytes * 1.5)) {
        reject(new Error("Payload muito grande"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const publicFiles = new Set(["/index.html", "/app.js", "/styles.css", "/data.js", "/assets/logo-adt.png"]);
  if (!publicFiles.has(pathname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const file = path.join(APP_DIR, pathname);
  fs.readFile(file, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png" };
    res.setHeader("Cache-Control", ext === ".html" ? "no-store" : "public, max-age=3600");
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(req, res);
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const route = url.pathname;

    if (route === "/health" && req.method === "GET") {
      return sendJson(res, 200, { status: "ok", environment: config.nodeEnv, storage: config.storageDriver, database: config.databaseUrl ? "postgres" : "json" });
    }
    if (route === "/api/auth/login" && req.method === "POST") {
      return login(req, res, JSON.parse(await readBody(req)));
    }
    if (route === "/api/auth/first-access" && req.method === "POST") {
      return completeFirstAccess(req, res, JSON.parse(await readBody(req)));
    }
    if (route === "/api/auth/me" && req.method === "GET") {
      const user = requireAuthentication(req, res);
      if (!user) return;
      const cookies = sessionCookies(user, config);
      res.setHeader("Set-Cookie", cookies.headers);
      return sendJson(res, 200, { user: publicUser(user), csrfToken: cookies.csrf });
    }
    if (route === "/api/auth/logout" && req.method === "POST") {
      if (!requireCsrf(req, res)) return;
      const user = currentAuthenticatedUser(req);
      res.setHeader("Set-Cookie", clearSessionCookies(config));
      await audit(req, user, "auth.logout", {});
      return sendJson(res, 200, { ok: true });
    }

    if (route === "/api/state" && req.method === "GET") {
      const user = requireAuthentication(req, res);
      if (!user) return;
      return sendJson(res, 200, stateForUser(getState(), user));
    }
    if (route === "/api/state" && req.method === "POST") {
      const user = requireAuthentication(req, res);
      if (!user || !requireCsrf(req, res)) return;
      const incoming = JSON.parse(await readBody(req));
      const saved = await saveState(stateUpdateForUser(getState(), incoming, user));
      await audit(req, user, "state.updated", { exportedAt: saved.exportedAt });
      return sendJson(res, 200, stateForUser(saved, user));
    }
    if (route === "/api/invite" && req.method === "POST") {
      const user = requireAuthentication(req, res, ["Administrador"]);
      if (!user || !requireCsrf(req, res)) return;
      const payload = JSON.parse(await readBody(req));
      const result = await sendInvite(payload);
      await audit(req, user, "user.invite_sent", { userId: payload.userId });
      return sendJson(res, 200, result);
    }
    if (route.match(/^\/api\/users\/[^/]+\/first-access$/) && req.method === "POST") {
      const user = requireAuthentication(req, res, ["Administrador"]);
      if (!user || !requireCsrf(req, res)) return;
      const userId = decodeURIComponent(route.split("/")[3]);
      const result = await createFirstAccess(userId);
      await audit(req, user, "user.first_access_created", { userId });
      return sendJson(res, 200, { user: publicUser(result.user), link: result.link });
    }
    if (route === "/api/notifications/send" && req.method === "POST") {
      const user = requireAuthentication(req, res, ["Administrador", "Consultor de implantação", "Contabilidade", "Franqueado"]);
      if (!user || !requireCsrf(req, res)) return;
      const payload = JSON.parse(await readBody(req));
      const notification = payload.notification || {};
      const allowedTypes = new Set(["document-upload", "unit-ready-70"]);
      if (!allowedTypes.has(notification.type)) return sendJson(res, 400, { error: "Tipo de notificação inválido." });
      if (user.role === "Franqueado") {
        if (notification.type !== "document-upload" || notification.unitId !== user.unitId) {
          return sendJson(res, 403, { error: "Notificação fora da sua unidade." });
        }
        notification.recipientRoles = ["Administrador", "Contabilidade"];
      }
      return sendJson(res, 200, await sendOperationalNotification({ notification }));
    }
    if (route === "/api/alerts/run" && req.method === "POST") {
      const user = requireAuthentication(req, res, ["Administrador", "Consultor de implantação"]);
      if (!user || !requireCsrf(req, res)) return;
      const result = await runAlerts();
      await audit(req, user, "alerts.run", { attempts: result.attempts });
      return sendJson(res, 200, result);
    }
    if (route === "/api/alerts/outbox" && req.method === "GET") {
      const user = requireAuthentication(req, res, ["Administrador"]);
      if (!user) return;
      return sendJson(res, 200, readJson(OUTBOX_FILE, []));
    }
    if (route === "/api/files" && req.method === "POST") {
      const user = requireAuthentication(req, res);
      if (!user || !requireCsrf(req, res)) return;
      const payload = JSON.parse(await readBody(req));
      const unitId = String(payload.unitId || user.unitId || "");
      if (user.role === "Franqueado" && unitId !== user.unitId) {
        return sendJson(res, 403, { error: "Você não pode enviar arquivos para outra unidade." });
      }
      const uploaded = await storage.put(payload.file, { unitId, userId: user.id, kind: payload.kind || "document" });
      await audit(req, user, "file.uploaded", { unitId, key: uploaded.key, name: uploaded.name });
      return sendJson(res, 201, uploaded);
    }
    if (route.startsWith("/api/files/") && req.method === "GET") {
      const user = requireAuthentication(req, res);
      if (!user) return;
      const key = decodeURIComponent(route.slice("/api/files/".length));
      if (user.role === "Franqueado" && !key.startsWith(`${user.unitId}/`)) {
        return sendJson(res, 403, { error: "Arquivo fora da sua unidade." });
      }
      const file = await storage.get(key);
      res.setHeader("Content-Type", file.contentType || "application/octet-stream");
      if (file.contentLength) res.setHeader("Content-Length", file.contentLength);
      res.setHeader("Cache-Control", "private, max-age=300");
      file.body.on?.("error", () => res.destroy());
      return file.body.pipe(res);
    }

    serveStatic(req, res);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) sendJson(res, error.code === "ENOENT" ? 404 : 500, { error: error.message || "Erro interno" });
  }
});

async function start() {
  const initialized = await repository.initialize(defaultState());
  const migration = migrateAuthentication(initialized);
  if (migration.changed) await repository.save(migration.state);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Implanta TODOS | ${config.nodeEnv} | http://127.0.0.1:${PORT}/`);
  });

  setInterval(() => {
    runAlerts().catch((error) => appendOutbox({ channel: "system", result: { sent: false, reason: error.message } }));
  }, Math.max(1, config.alertIntervalMinutes) * 60 * 1000);
}

async function shutdown() {
  server.close(async () => {
    await repository.close();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
