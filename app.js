const STORAGE_KEY = "enxoval-app-items-v2";
const LEGACY_STORAGE_KEY = "enxoval-app-items-v1";
const USERS_STORAGE_KEY = "enxoval-app-users-v3";
const ACTIVE_USER_STORAGE_KEY = "enxoval-app-active-user-v3";
const AUTH_USER_STORAGE_KEY = "enxoval-app-auth-user-v1";
const UNITS_STORAGE_KEY = "enxoval-app-units-v1";
const CHECKLIST_STORAGE_KEY = "enxoval-app-checklist-v1";
const DOCUMENTS_STORAGE_KEY = "enxoval-app-documents-v1";
const DOCUMENT_GUIDANCE_STORAGE_KEY = "enxoval-app-document-guidance-v1";
const ITEM_PHOTOS_STORAGE_KEY = "enxoval-app-item-photos-v1";
const NOTIFICATIONS_STORAGE_KEY = "enxoval-app-notifications-v1";
const MILESTONES_STORAGE_KEY = "enxoval-app-milestones-v1";
const SELECTED_UNIT_STORAGE_KEY = "enxoval-app-selected-unit-v1";
const baseData = window.ENXOVAL_DATA || { items: [], categories: [], statuses: [], priorities: [] };
const API_ENABLED = /^https?:$/.test(window.location.protocol);
let csrfToken = "";
const DOCUMENT_STATUSES = ["Solicitado", "Processando", "Recusado", "Concluido"];
const DOCUMENT_TYPES = [
  {
    name: "Alvará de Vigilância Sanitária",
    guidance: "Solicitar na Vigilância Sanitária do município ou pelo portal integrado da prefeitura/REDESIM, quando disponível. Primeiro, verificar se a atividade exige licença sanitária. Depois, reunir CNPJ, contrato social, endereço da unidade, responsável técnico, documentos do imóvel e comprovante de pagamento da taxa. Algumas cidades exigem vistoria antes da emissão.",
  },
  {
    name: "Alvará de localização e funcionamento",
    guidance: "Solicitar na prefeitura da cidade onde a unidade funcionará. O franqueado deve fazer a consulta prévia do endereço, confirmar se a atividade pode operar no local, informar CNAE, metragem e dados da empresa, pagar taxas municipais e aguardar liberação ou vistoria, conforme o município.",
  },
  {
    name: "Alvará do Corpo de Bombeiros",
    guidance: "Solicitar no sistema do Corpo de Bombeiros do estado. O franqueado deve verificar se o imóvel se enquadra como baixo risco, CLCB, ou exige AVCB. Em geral, precisa apresentar dados do imóvel, projeto ou declaração técnica, equipamentos de segurança, pagar taxa e, quando exigido, passar por vistoria.",
  },
  {
    name: "Cartão CNPJ",
    guidance: "Emitir gratuitamente no site da Receita Federal. Basta acessar a consulta de CNPJ, informar o número do CNPJ e imprimir o Comprovante de Inscrição e Situação Cadastral.",
  },
  {
    name: "Certidão Conjunta de Débitos Federais e Dívida Ativa da União",
    guidance: "Emitir no portal da Receita Federal/PGFN. Informar o CNPJ e gerar a certidão. Caso não seja emitida, consultar pendências no e-CAC, regularizar débitos ou obrigações acessórias e tentar novamente.",
  },
  {
    name: "Certidão de Regularidade do FGTS (CRF)",
    guidance: "Emitir no site da Caixa, em “Consulta Regularidade do Empregador”. Informar o CNPJ. Se houver pendência, regularizar depósitos, guias ou dados cadastrais do FGTS antes de nova emissão.",
  },
  {
    name: "Certidão Negativa de Tributos Municipais",
    guidance: "Solicitar no portal da prefeitura. Informar inscrição municipal ou CNPJ. Se houver débitos de ISS, taxas ou alvarás, regularizar junto à Secretaria Municipal da Fazenda.",
  },
  {
    name: "Certidão Negativa ou Positiva do TJ do Estado",
    guidance: "Solicitar no site do Tribunal de Justiça do estado da unidade. Normalmente fica em “Certidões”. Informar CNPJ, razão social e tipo de certidão exigida. Se constar processo, emitir a certidão positiva ou positiva com efeito de negativa, conforme o caso.",
  },
  {
    name: "Certificado Digital",
    guidance: "Contratar com uma Autoridade Certificadora credenciada pela ICP-Brasil. Escolher o tipo, normalmente e-CNPJ A1 ou A3, enviar documentos da empresa e dos sócios, validar a identidade por vídeo ou presencialmente e instalar o certificado.",
  },
  {
    name: "Contrato Social",
    guidance: "Solicitar ao contador ou acessar a Junta Comercial do estado. O franqueado deve manter a versão atualizada, com alterações contratuais consolidadas, quadro societário correto, endereço e atividades compatíveis com a operação.",
  },
  {
    name: "Contrato de aluguel",
    guidance: "Providenciar a versão assinada e vigente do contrato de locação do imóvel da unidade. Conferir identificação das partes, endereço completo, prazo, valor, reajuste, responsabilidades por obras e autorização de uso para a atividade. Antes da assinatura, validar com a contabilidade e o jurídico se o endereço e as condições atendem à operação da franquia.",
  },
  {
    name: "Inscrição Estadual e Municipal",
    guidance: "A inscrição municipal é solicitada na prefeitura, geralmente junto ao alvará. A inscrição estadual é solicitada na Secretaria da Fazenda do estado quando a atividade exige cadastro estadual. O contador deve validar a obrigatoriedade conforme CNAE e modelo de operação.",
  },
  {
    name: "Registro do Conselho Regional de Fonoaudiologia",
    guidance: "Solicitar no Conselho Regional de Fonoaudiologia da região da unidade. A pessoa jurídica deve apresentar requerimento, contrato social, CNPJ, dados do responsável técnico fonoaudiólogo e demais documentos exigidos pelo conselho regional.",
  },
].map((documentType, index) => ({ id: `doc-${String(index + 1).padStart(2, "0")}`, ...documentType }));

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

let items = loadItems();
let currentView = "dashboard";
let selectedIssues = new Set();
let showArchivedDocuments = false;

const ROLE_PERMISSIONS = {
  "Administrador": {
    views: ["dashboard", "items", "pending", "alerts", "purchases", "categories", "myUnit", "documents", "units", "users"],
    editItems: true,
    manageUsers: true,
    manageUnits: true,
    viewAllUnits: true,
    updateAnyChecklist: true,
    updateOwnChecklist: true,
    editOwnValue: true,
    uploadProof: true,
    approveProof: true,
    manageItemPhotos: true,
    viewAllDocuments: true,
    uploadDocuments: false,
    manageDocuments: true,
    approveDocuments: true,
    rejectDocuments: true,
    manageDocumentGuidance: true,
    exportData: true,
    resetData: true,
    changeStatus: true,
  },
  "Consultor de implantação": {
    views: ["dashboard", "items", "pending", "alerts", "purchases", "categories", "myUnit", "documents", "units"],
    editItems: true,
    manageUsers: false,
    manageUnits: true,
    viewAllUnits: true,
    updateAnyChecklist: true,
    updateOwnChecklist: false,
    editOwnValue: false,
    uploadProof: false,
    approveProof: true,
    manageItemPhotos: false,
    viewAllDocuments: true,
    uploadDocuments: false,
    manageDocuments: true,
    approveDocuments: true,
    rejectDocuments: false,
    manageDocumentGuidance: false,
    exportData: true,
    resetData: false,
    changeStatus: true,
  },
  "Franqueado": {
    views: ["dashboard", "items", "pending", "purchases", "myUnit", "documents"],
    editItems: false,
    manageUsers: false,
    manageUnits: false,
    viewAllUnits: false,
    updateAnyChecklist: false,
    updateOwnChecklist: true,
    editOwnValue: true,
    uploadProof: true,
    approveProof: false,
    manageItemPhotos: false,
    viewAllDocuments: false,
    uploadDocuments: true,
    manageDocuments: false,
    approveDocuments: false,
    rejectDocuments: false,
    manageDocumentGuidance: false,
    exportData: false,
    resetData: false,
    changeStatus: true,
  },
  "Contabilidade": {
    views: ["documents"],
    editItems: false,
    manageUsers: false,
    manageUnits: false,
    viewAllUnits: true,
    updateAnyChecklist: false,
    updateOwnChecklist: false,
    editOwnValue: false,
    uploadProof: false,
    approveProof: false,
    manageItemPhotos: false,
    viewAllDocuments: true,
    uploadDocuments: false,
    manageDocuments: true,
    approveDocuments: true,
    rejectDocuments: true,
    manageDocumentGuidance: true,
    exportData: false,
    resetData: false,
    changeStatus: false,
  },
};

const PERMISSION_LABELS = [
  ["dashboard", "Ver Dashboard"],
  ["items", "Ver Base de Itens"],
  ["pending", "Ver Pendências"],
  ["alerts", "Ver Alertas"],
  ["purchases", "Ver Compras"],
  ["categories", "Ver Categorias"],
  ["myUnit", "Ver Minha Unidade"],
  ["documents", "Ver Documentos"],
  ["units", "Ver todas as unidades"],
  ["editItems", "Editar itens, valores e prazos"],
  ["changeStatus", "Alterar status"],
  ["manageUnits", "Criar unidades"],
  ["updateOwnChecklist", "Atualizar checklist próprio"],
  ["updateAnyChecklist", "Atualizar qualquer checklist"],
  ["editOwnValue", "Editar valor da própria unidade"],
  ["uploadProof", "Enviar foto do item"],
  ["approveProof", "Aprovar comprovantes"],
  ["manageItemPhotos", "Cadastrar fotos dos produtos"],
  ["uploadDocuments", "Enviar documentos"],
  ["manageDocuments", "Gerenciar prazos dos documentos"],
  ["approveDocuments", "Aprovar documentos"],
  ["rejectDocuments", "Recusar documentos com orientação"],
  ["manageDocumentGuidance", "Editar orientações dos documentos"],
  ["exportData", "Exportar dados"],
  ["manageUsers", "Cadastrar usuários"],
  ["resetData", "Restaurar base"],
];

const statusColors = {
  "A Comprar": "#2a9d8f",
  "Cotando": "#e9c46a",
  "Comprado": "#17324d",
  "A Definir": "#e76f51",
  "Cancelado": "#64748b",
};

let users = loadUsers();
ensureAdministratorAccess();
ensureAccountingAccess();
let units = loadUnits();
ensureFranchiseeUnits();
let checklist = loadChecklist();
let documents = loadDocuments();
let documentGuidance = loadDocumentGuidance();
let itemPhotos = loadItemPhotos();
let notifications = loadObjectStorage(NOTIFICATIONS_STORAGE_KEY, []);
let milestones = loadObjectStorage(MILESTONES_STORAGE_KEY, {});
let activeUserId = loadActiveUserId();
let selectedUnitId = loadSelectedUnitId();
let selectedItemsUnitId = loadSelectedUnitId();

async function apiFetch(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }
  const response = await fetch(url, { ...options, headers, credentials: "same-origin" });
  if (response.status === 401 && !url.includes("/api/auth/login")) {
    authenticatedUserId = "";
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    applyAuthState();
  }
  return response;
}

function assetUrl(file) {
  return file?.url || file?.dataUrl || "";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

async function uploadAsset(file, { unitId = "", kind = "document" } = {}) {
  if (!API_ENABLED) {
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl: await readFileAsDataUrl(file),
    };
  }
  const response = await apiFetch("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      unitId,
      kind,
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: await readFileAsDataUrl(file),
      },
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Não foi possível enviar o arquivo.");
  return result;
}
let authenticatedUserId = localStorage.getItem(AUTH_USER_STORAGE_KEY) || "";
let lastRemoteSync = "";

function loadItems() {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved).map(normalizeItem);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }
  return baseData.items.map(normalizeItem);
}

function loadUsers() {
  const saved = localStorage.getItem(USERS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed.map(normalizeUser);
    } catch {
      localStorage.removeItem(USERS_STORAGE_KEY);
    }
  }
  return [
    normalizeUser({ name: "Administrador", email: "admin@local", phone: "", password: "admin123", role: "Administrador", active: true }),
    normalizeUser({ name: "Consultor de implantação", email: "consultor@local", phone: "", password: "consultor123", role: "Consultor de implantação", active: true }),
    normalizeUser({ name: "Contabilidade", email: "contabilidade@local", phone: "", password: "contabilidade123", role: "Contabilidade", active: true }),
    normalizeUser({ name: "Franqueado", email: "franqueado@local", phone: "", password: "franqueado123", role: "Franqueado", active: true }),
  ];
}

function loadUnits() {
  const saved = localStorage.getItem(UNITS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.map(normalizeUnit);
    } catch {
      localStorage.removeItem(UNITS_STORAGE_KEY);
    }
  }
  return [];
}

function normalizeUnit(unit) {
  return {
    id: unit.id || crypto.randomUUID(),
    name: unit.name || unit.nome || "Unidade sem nome",
    city: unit.city || "",
    franchiseeUserId: unit.franchiseeUserId || "",
    createdAt: unit.createdAt || new Date().toISOString(),
    active: unit.active !== false,
    implementationArchivedAt: unit.implementationArchivedAt || "",
    implementationArchivedBy: unit.implementationArchivedBy || "",
    documentFinalApprovals: unit.documentFinalApprovals && typeof unit.documentFinalApprovals === "object" ? unit.documentFinalApprovals : {},
    documentsArchivedAt: unit.documentsArchivedAt || "",
  };
}

function isImplementationArchived(unit) {
  return Boolean(unit?.implementationArchivedAt);
}

function isDocumentsArchived(unit) {
  return Boolean(unit?.documentsArchivedAt);
}

function operationalUnits() {
  return units.filter((unit) => unit.active && !isImplementationArchived(unit));
}

function documentQueueUnits() {
  return units.filter((unit) => unit.active && !isDocumentsArchived(unit));
}

function saveUnits() {
  localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units));
}

function loadChecklist() {
  const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
  if (!saved) return {};
  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
    return {};
  }
}

function saveChecklist() {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklist));
}

function loadDocuments() {
  const saved = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
  if (!saved) return {};
  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    localStorage.removeItem(DOCUMENTS_STORAGE_KEY);
    return {};
  }
}

function saveDocuments() {
  localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
}

function loadDocumentGuidance() {
  const saved = localStorage.getItem(DOCUMENT_GUIDANCE_STORAGE_KEY);
  if (!saved) return {};
  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    localStorage.removeItem(DOCUMENT_GUIDANCE_STORAGE_KEY);
    return {};
  }
}

function saveDocumentGuidance() {
  localStorage.setItem(DOCUMENT_GUIDANCE_STORAGE_KEY, JSON.stringify(documentGuidance));
}

function documentGuidanceText(documentId) {
  const customText = documentGuidance[documentId];
  if (typeof customText === "string") return customText;
  return DOCUMENT_TYPES.find((item) => item.id === documentId)?.guidance || "";
}

function loadItemPhotos() {
  const saved = localStorage.getItem(ITEM_PHOTOS_STORAGE_KEY);
  if (!saved) return {};
  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    localStorage.removeItem(ITEM_PHOTOS_STORAGE_KEY);
    return {};
  }
}

function saveItemPhotos() {
  localStorage.setItem(ITEM_PHOTOS_STORAGE_KEY, JSON.stringify(itemPhotos));
}

function loadObjectStorage(key, fallback) {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

function saveNotifications() {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

function saveMilestones() {
  localStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(milestones));
}

function normalizeUser(user) {
  const role = ROLE_PERMISSIONS[user.role] ? user.role : "Franqueado";
  return {
    id: user.id || crypto.randomUUID(),
    name: user.name || user.nome || "Usuário",
    email: user.email || "",
    phone: user.phone || user.telefone || user.whatsapp || "",
    password: user.password || user.senha || "",
    mustChangePassword: user.mustChangePassword === true,
    role,
    unitId: role === "Franqueado" ? (user.unitId || "") : "",
    active: user.active !== false,
  };
}

function isGlobalUnitRole(role) {
  return ["Administrador", "Consultor de implantação", "Contabilidade"].includes(role);
}

function defaultPasswordForRole(role) {
  if (role === "Administrador") return "admin123";
  if (role === "Contabilidade") return "contabilidade123";
  if (role === "Consultor de implantação") return "consultor123";
  return "franqueado123";
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";
  for (let index = 0; index < 10; index += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

function accessLink() {
  return window.location.href.split("#")[0];
}

function firstAccessMessage(user, link) {
  return [
    `Olá ${user.name || "usuário"}, seja bem-vindo(a) à plataforma de implantação da Audição de TODOS.`,
    "",
    "Segue seu primeiro acesso:",
    `Criar senha: ${link}`,
    `Login: ${user.email || ""}`,
    "",
    "O link é individual, expira e só pode ser usado uma vez.",
  ].join("\n");
}

async function requestFirstAccessLink(user) {
  if (!API_ENABLED) return accessLink();
  const response = await apiFetch(`/api/users/${encodeURIComponent(user.id)}/first-access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Não foi possível gerar o primeiro acesso.");
  return result.link;
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy failed");
}

async function copyFirstAccess(user) {
  try {
    const link = await requestFirstAccessLink(user);
    await copyText(firstAccessMessage(user, link));
    alert(`Primeiro acesso de ${user.name} copiado. Agora é só colar no WhatsApp ou e-mail.`);
  } catch (error) {
    alert(error.message || "Não foi possível copiar automaticamente.");
  }
}

function saveUsers() {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function ensureAdministratorAccess() {
  const adminEmail = "admin@local";
  let admin = users.find((user) => user.email.toLowerCase() === adminEmail);
  if (!admin) {
    admin = normalizeUser({ name: "Administrador", email: adminEmail, phone: "", password: "admin123", role: "Administrador", active: true });
    users.unshift(admin);
  }
  admin.name = admin.name || "Administrador";
  admin.role = "Administrador";
  if (!API_ENABLED) admin.password = "admin123";
  admin.active = true;
  saveUsers();
}

function ensureAccountingAccess() {
  const email = "contabilidade@local";
  let user = users.find((candidate) => candidate.email.toLowerCase() === email);
  if (!user) {
    user = normalizeUser({ name: "Contabilidade", email, phone: "", password: "contabilidade123", role: "Contabilidade", active: true });
    users.push(user);
  }
  user.name = user.name || "Contabilidade";
  user.role = "Contabilidade";
  if (!API_ENABLED) user.password = user.password || "contabilidade123";
  user.active = true;
  saveUsers();
}

function createUnit(name, franchiseeUserId = "") {
  const cleanName = String(name || "").trim() || "Nova unidade";
  const existing = units.find((unit) => unit.name.toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    if (franchiseeUserId && !existing.franchiseeUserId) existing.franchiseeUserId = franchiseeUserId;
    return existing;
  }
  const unit = normalizeUnit({ name: cleanName, franchiseeUserId });
  units.push(unit);
  return unit;
}

function ensureFranchiseeUnits() {
  let changed = false;
  units.forEach((unit) => {
    const owner = users.find((user) => user.id === unit.franchiseeUserId);
    if (unit.franchiseeUserId && (!owner || owner.role !== "Franqueado")) {
      unit.franchiseeUserId = "";
      changed = true;
    }
  });
  users.forEach((user) => {
    if (isGlobalUnitRole(user.role)) {
      if (user.unitId) {
        user.unitId = "";
        changed = true;
      }
      return;
    }
    if (user.role !== "Franqueado") return;
    if (user.unitId && units.some((unit) => unit.id === user.unitId)) return;
    const unit = createUnit(`Unidade ${user.name}`, user.id);
    user.unitId = unit.id;
    if (!unit.franchiseeUserId) unit.franchiseeUserId = user.id;
    changed = true;
  });
  if (changed) {
    saveUnits();
    saveUsers();
  }
}

function linkFranchiseeToUnit(user, unitId) {
  if (!user || user.role !== "Franqueado") return;
  units.forEach((unit) => {
    if (unit.franchiseeUserId === user.id && unit.id !== unitId) unit.franchiseeUserId = "";
  });
  const unit = units.find((candidate) => candidate.id === unitId && candidate.active);
  user.unitId = unit?.id || "";
  if (unit) unit.franchiseeUserId = user.id;
}

function loadSelectedUnitId() {
  const saved = localStorage.getItem(SELECTED_UNIT_STORAGE_KEY);
  if (saved && units.some((unit) => unit.id === saved && unit.active)) return saved;
  return units.find((unit) => unit.active)?.id || "";
}

function unitForUser(user) {
  if (!user) return null;
  return units.find((unit) => unit.id === user.unitId && unit.active) ||
    units.find((unit) => unit.franchiseeUserId === user.id && unit.active) ||
    null;
}

function currentUnit() {
  return unitForUser(currentUser());
}

function myUnitContextUnit() {
  if (!can("viewAllUnits")) return currentUnit();
  const activeUnits = operationalUnits();
  if (!selectedUnitId || !activeUnits.some((unit) => unit.id === selectedUnitId)) {
    selectedUnitId = activeUnits[0]?.id || "";
  }
  return activeUnits.find((unit) => unit.id === selectedUnitId) || null;
}

function checklistKey(unitId, itemId) {
  return `${unitId}::${itemId}`;
}

function checklistEntry(unitId, itemId) {
  return checklist[checklistKey(unitId, itemId)] || { done: false, note: "", updatedAt: "" };
}

function itemForUnit(item, unitId) {
  if (!unitId) return item;
  const entry = checklistEntry(unitId, item.id);
  return {
    ...item,
    fornecedor: entry.fornecedor ?? item.fornecedor,
    fornecedorLink: entry.fornecedorLink ?? item.fornecedorLink,
    valor: entry.valor ?? item.valor,
    quantidade: entry.quantidade ?? item.quantidade,
    prazo: entry.prazo ?? item.prazo,
    vencimento: entry.vencimento ?? item.vencimento,
    status: unitItemStatus(unitId, item),
    prioridade: entry.prioridade ?? item.prioridade,
  };
}

function isChecklistDone(unitId, itemId) {
  return Boolean(checklistEntry(unitId, itemId).done);
}

function unitItemStatus(unitId, item) {
  if (!unitId) return item.status;
  const entry = checklistEntry(unitId, item.id);
  if (entry.status) return entry.status;
  if (entry.done) return "Comprado";
  return "A Comprar";
}

function setChecklistEntry(unitId, itemId, patch) {
  if (!unitId || !itemId) return;
  const before = weightedUnitProgress(unitId).percent;
  const key = checklistKey(unitId, itemId);
  checklist[key] = { ...checklistEntry(unitId, itemId), ...patch, updatedAt: new Date().toISOString() };
  saveChecklist();
  const after = weightedUnitProgress(unitId).percent;
  if (before < 70 && after >= 70 && !milestones[unitId]?.ready70At) {
    const unit = units.find((candidate) => candidate.id === unitId);
    milestones[unitId] = { ...(milestones[unitId] || {}), ready70At: new Date().toISOString(), percent: after };
    saveMilestones();
    const notification = createNotification({
      type: "unit-ready-70",
      title: `${unit?.name || "Unidade"} atingiu ${after}%`,
      message: "unidade já está apta para marcar a data da inauguração",
      detail: `${unit?.name || "Unidade"} · ${unit ? unitOwnerName(unit) : "Franqueado"} · progresso ponderado de ${after}%`,
      unitId,
      recipientRoles: ["Administrador", "Consultor de implantação"],
    });
    dispatchNotificationEmail(notification);
  }
  saveRemoteState();
}

function setUnitItemStatus(unitId, itemId, status) {
  setChecklistEntry(unitId, itemId, { status, done: status === "Comprado" });
}

function allowedStatusOptions() {
  if (currentUser()?.role === "Franqueado") return ["A Comprar", "Cotando", "A Definir"];
  return baseData.statuses;
}

function proofForItem(unitId, itemId) {
  return checklistEntry(unitId, itemId).proof || null;
}

function proofIsApproved(unitId, itemId) {
  return Boolean(checklistEntry(unitId, itemId).approvedAt);
}

function canUploadProofForUnit(unitId) {
  const ownUnit = currentUnit()?.id === unitId;
  return can("uploadProof") && ownUnit;
}

function canApproveProofForUnit(unitId) {
  return can("approveProof") && Boolean(unitId);
}

function proofControls(item, unitId) {
  if (!unitId) return `<span class="proof-empty">Selecione uma unidade</span>`;
  const entry = checklistEntry(unitId, item.id);
  const proof = entry.proof;
  const approved = proofIsApproved(unitId, item.id);
  const proofUrl = assetUrl(proof);
  const preview = proofUrl
    ? `<a class="proof-thumb" href="${escapeAttr(proofUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeAttr(proofUrl)}" alt="Comprovante" /></a>`
    : `<span class="proof-empty">Sem foto</span>`;
  const upload = canUploadProofForUnit(unitId) && !approved
    ? `<label class="proof-upload">Enviar foto<input type="file" accept="image/*" data-proof-upload="${escapeHtml(item.id)}" /></label>`
    : "";
  const approve = canApproveProofForUnit(unitId) && proof && !approved
    ? `<button class="ghost-button small-action" data-proof-approve="${escapeHtml(item.id)}">Aprovar</button>`
    : "";
  const approvedBadge = approved ? `<span class="badge done">Aprovado</span>` : "";
  return `<div class="proof-cell" data-unit-id="${escapeHtml(unitId)}">${preview}${upload}${approve}${approvedBadge}</div>`;
}

function itemPhoto(itemId) {
  return itemPhotos[itemId] || null;
}

function itemNameControl(item) {
  const photo = itemPhoto(item.id);
  const name = item.item || "Item sem nome";
  if (!assetUrl(photo)) {
    return `<span class="item-name-text">${escapeHtml(name)}</span>`;
  }
  return `<button class="item-name-button" type="button" data-view-item-photo="${escapeHtml(item.id)}" title="Ver foto do produto">${escapeHtml(name)}</button>`;
}

function itemPhotoControls(item) {
  const photo = itemPhoto(item.id);
  const photoUrl = assetUrl(photo);
  const preview = photoUrl
    ? `<button class="proof-thumb product-thumb" type="button" data-view-item-photo="${escapeHtml(item.id)}"><img src="${escapeAttr(photoUrl)}" alt="Foto do produto" /></button>`
    : `<span class="proof-empty">Sem foto</span>`;
  const upload = can("manageItemPhotos")
    ? `<label class="proof-upload">Subir foto<input type="file" accept="image/*" data-item-photo-upload="${escapeHtml(item.id)}" /></label>`
    : "";
  const remove = can("manageItemPhotos") && photoUrl
    ? `<button class="ghost-button small-action" data-item-photo-remove="${escapeHtml(item.id)}">Remover</button>`
    : "";
  return `<div class="proof-cell product-photo-cell">${preview}${upload}${remove}</div>`;
}

function openItemPhoto(itemId) {
  const item = items.find((candidate) => candidate.id === itemId);
  const photo = itemPhoto(itemId);
  if (!assetUrl(photo)) return alert("Este item ainda nao tem foto cadastrada.");
  const modal = document.getElementById("itemPhotoModal");
  document.getElementById("itemPhotoTitle").textContent = item?.item || "Foto do produto";
  const image = document.getElementById("itemPhotoImage");
  image.src = assetUrl(photo);
  image.alt = item?.item || "Foto do produto";
  document.getElementById("itemPhotoCaption").textContent = photo.name ? `Arquivo: ${photo.name}` : "";
  modal.classList.add("is-visible");
}

function closeItemPhotoModal() {
  const modal = document.getElementById("itemPhotoModal");
  modal.classList.remove("is-visible");
  document.getElementById("itemPhotoImage").removeAttribute("src");
}

function openDocumentGuidance(documentId) {
  const documentType = DOCUMENT_TYPES.find((item) => item.id === documentId);
  if (!documentType) return;
  const modal = document.getElementById("documentGuidanceModal");
  const editor = document.getElementById("documentGuidanceText");
  const canEdit = can("manageDocumentGuidance");
  document.getElementById("documentGuidanceTitle").textContent = documentType.name;
  editor.value = documentGuidanceText(documentId);
  editor.readOnly = !canEdit;
  editor.dataset.documentId = documentId;
  document.getElementById("saveDocumentGuidanceBtn").hidden = !canEdit;
  document.getElementById("documentGuidanceMode").textContent = canEdit
    ? "Você pode atualizar esta orientação para todos os perfis."
    : "Orientação para consulta.";
  modal.classList.add("is-visible");
}

function closeDocumentGuidanceModal() {
  const modal = document.getElementById("documentGuidanceModal");
  modal.classList.remove("is-visible");
  const editor = document.getElementById("documentGuidanceText");
  editor.value = "";
  delete editor.dataset.documentId;
}

function documentKey(unitId, documentId) {
  return `${unitId}::${documentId}`;
}

function documentEntry(unitId, documentId) {
  return documents[documentKey(unitId, documentId)] || {
    status: "Solicitado",
    prazo: "",
    vencimento: "",
    note: "",
    file: null,
    approvedAt: "",
    approvedBy: "",
    rejectedAt: "",
    rejectedBy: "",
    rejectionReason: "",
    updatedAt: "",
  };
}

function setDocumentEntry(unitId, documentId, patch) {
  if (!unitId || !documentId) return;
  const key = documentKey(unitId, documentId);
  documents[key] = { ...documentEntry(unitId, documentId), ...patch, updatedAt: new Date().toISOString() };
  const unit = units.find((candidate) => candidate.id === unitId);
  if (unit && !allDocumentsApproved(unitId)) {
    unit.documentFinalApprovals = {};
    unit.documentsArchivedAt = "";
    saveUnits();
  }
  saveDocuments();
  saveRemoteState();
}

function allDocumentsApproved(unitId) {
  return DOCUMENT_TYPES.length > 0 && DOCUMENT_TYPES.every((doc) => {
    const entry = documentEntry(unitId, doc.id);
    return entry.status === "Concluido" && Boolean(assetUrl(entry.file)) && Boolean(entry.approvedAt);
  });
}

function documentFinalApproval(unit, role) {
  return unit?.documentFinalApprovals?.[role] || null;
}

function canGiveDocumentFinalApproval(unit) {
  const role = currentUser()?.role || "";
  return ["Administrador", "Contabilidade"].includes(role) &&
    allDocumentsApproved(unit.id) &&
    !isDocumentsArchived(unit) &&
    !documentFinalApproval(unit, role);
}

function canUploadDocumentForUnit(unitId) {
  const ownUnit = currentUnit()?.id === unitId;
  return can("uploadDocuments") && ownUnit;
}

function canRemoveRejectedDocumentForUnit(unitId, entry) {
  const unit = units.find((candidate) => candidate.id === unitId);
  return !isDocumentsArchived(unit) && canUploadDocumentForUnit(unitId) && entry.status === "Recusado" && Boolean(assetUrl(entry.file));
}

function canApproveDocumentForUnit(unitId) {
  return can("approveDocuments") && Boolean(unitId);
}

function canRejectDocumentForUnit(unitId) {
  return can("rejectDocuments") && Boolean(unitId);
}

function documentAlertInfo(entry) {
  if (entry.status === "Concluido") return { label: "Concluido", className: "done", days: null };
  if (entry.status === "Recusado") return { label: "Aguardando correção", className: "rejected", days: null };
  const days = daysUntil(entry.vencimento);
  if (days === null) return { label: "Sem data", className: "nodate", days: null };
  if (days < 0) return { label: "Vencido", className: "overdue", days };
  if (days === 0) return { label: "Vence hoje", className: "today", days };
  if (days <= 7) return { label: "Prox. 7 dias", className: "soon", days };
  if (days <= 30) return { label: "Prox. 30 dias", className: "watch", days };
  return { label: "No prazo", className: "ok", days };
}

function documentAlertText(entry) {
  const info = documentAlertInfo(entry);
  if (info.label === "Vencido") return `Vencido ha ${Math.abs(info.days)} dia(s)`;
  if (info.label === "Vence hoje") return "Vence hoje";
  if (info.days !== null && info.days > 0) return `Faltam ${info.days} dia(s)`;
  return info.label;
}

function documentStatusClass(status) {
  return {
    Solicitado: "buy",
    Processando: "quote",
    Recusado: "cancel",
    Concluido: "done",
  }[status] || "cancel";
}

function documentStatusSelect(unitId, documentId, status) {
  if (!can("manageDocuments") || status === "Concluido" || status === "Recusado") {
    return `<span class="badge ${documentStatusClass(status)}">${escapeHtml(status)}</span>`;
  }
  const options = DOCUMENT_STATUSES.filter((option) => option !== "Concluido" && option !== "Recusado");
  return `<select class="cell-select" data-document-field="status" data-unit-id="${escapeHtml(unitId)}" data-document-id="${escapeHtml(documentId)}">${options.map((option) => `<option value="${escapeHtml(option)}" ${option === status ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>`;
}

function openDocumentRejection(unitId, documentId) {
  if (!canRejectDocumentForUnit(unitId)) return;
  const unit = units.find((item) => item.id === unitId);
  const documentType = DOCUMENT_TYPES.find((item) => item.id === documentId);
  const entry = documentEntry(unitId, documentId);
  if (!unit || !documentType || !assetUrl(entry.file)) {
    return alert("É necessário que o franqueado envie o documento antes da recusa.");
  }
  document.getElementById("documentRejectionTitle").textContent = documentType.name;
  document.getElementById("documentRejectionUnit").textContent = `${unit.name} · ${unitOwnerName(unit)}`;
  const reason = document.getElementById("documentRejectionReason");
  reason.value = entry.rejectionReason || "";
  reason.dataset.unitId = unitId;
  reason.dataset.documentId = documentId;
  document.getElementById("documentRejectionModal").classList.add("is-visible");
  reason.focus();
}

function closeDocumentRejectionModal() {
  document.getElementById("documentRejectionModal").classList.remove("is-visible");
  const reason = document.getElementById("documentRejectionReason");
  reason.value = "";
  delete reason.dataset.unitId;
  delete reason.dataset.documentId;
}

function documentFilePreview(entry) {
  const fileUrl = assetUrl(entry.file);
  if (!fileUrl) return `<span class="proof-empty">Nenhum arquivo enviado</span>`;
  const isImage = String(entry.file.type || "").startsWith("image/");
  const preview = isImage
    ? `<a class="proof-thumb document-thumb" href="${escapeAttr(fileUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeAttr(fileUrl)}" alt="Documento" /></a>`
    : "";
  return `${preview}<a class="supplier-link" href="${escapeAttr(fileUrl)}" download="${escapeAttr(entry.file.name || "documento")}" title="${escapeAttr(entry.file.name || "Documento enviado")}">Baixar</a><span class="document-file-name">${escapeHtml(entry.file.name || "Documento enviado")}</span>`;
}

function unitProgress(unitId) {
  const total = items.length;
  const done = items.filter((item) => isChecklistDone(unitId, item.id)).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const overdue = items.filter((item) => !isChecklistDone(unitId, item.id) && alertInfo(itemForUnit(item, unitId)).label === "Vencido").length;
  const dueSoon = items.filter((item) => {
    const alert = alertInfo(itemForUnit(item, unitId)).label;
    return !isChecklistDone(unitId, item.id) && (alert === "Vence hoje" || alert === "Próx. 7 dias");
  }).length;
  return { total, done, open: total - done, percent, overdue, dueSoon };
}

function itemProgressWeight(item) {
  return String(item.categoria || "").trim().toLowerCase() === "papelaria" ? 0.2 : 1;
}

function weightedUnitProgress(unitId) {
  const totalWeight = sum(items, itemProgressWeight);
  const completedWeight = sum(items.filter((item) => isChecklistDone(unitId, item.id)), itemProgressWeight);
  return {
    totalWeight,
    completedWeight,
    percent: totalWeight ? Math.round((completedWeight / totalWeight) * 100) : 0,
  };
}

function createNotification({ type, title, message, detail = "", unitId = "", documentId = "", recipientRoles = [] }) {
  const notification = {
    id: crypto.randomUUID(),
    type,
    title,
    message,
    detail,
    unitId,
    documentId,
    recipientRoles,
    createdAt: new Date().toISOString(),
    createdBy: currentUser()?.id || "",
  };
  notifications.unshift(notification);
  notifications = notifications.slice(0, 500);
  saveNotifications();
  saveRemoteState();
  renderAppNotifications();
  return notification;
}

function removeDocumentNotifications(unitId, documentId) {
  const before = notifications.length;
  notifications = notifications.filter((notification) =>
    notification.type !== "document-upload" ||
    notification.unitId !== unitId ||
    notification.documentId !== documentId
  );
  if (notifications.length === before) return false;
  saveNotifications();
  saveRemoteState();
  renderAppNotifications();
  return true;
}

function visibleNotifications() {
  const role = currentUser()?.role || "";
  return notifications
    .filter((notification) => notification.recipientRoles?.includes(role))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function notificationIcon(type) {
  return type === "document-upload" ? "DOC" : "70%";
}

function renderNotificationList(containerId, typeFilter = "") {
  const container = document.getElementById(containerId);
  if (!container) return;
  const rows = visibleNotifications().filter((notification) => !typeFilter || notification.type === typeFilter);
  container.innerHTML = rows.length ? rows.map((notification) => `
    <article class="app-notification ${escapeAttr(notification.type)}">
      <span class="notification-icon">${escapeHtml(notificationIcon(notification.type))}</span>
      <div>
        <strong>${escapeHtml(notification.title)}</strong>
        <p>${escapeHtml(notification.message)}</p>
        ${notification.detail ? `<small>${escapeHtml(notification.detail)}</small>` : ""}
      </div>
      <time>${escapeHtml(formatDateTime(notification.createdAt))}</time>
    </article>
  `).join("") : `<div class="empty compact-empty">Nenhuma notificação operacional.</div>`;
}

function renderAppNotifications() {
  const documentPanel = document.getElementById("documentNotifications")?.closest(".operational-alerts-panel");
  if (documentPanel) documentPanel.hidden = !["Administrador", "Contabilidade"].includes(currentUser()?.role || "");
  renderNotificationList("operationalNotifications");
  renderNotificationList("documentNotifications", "document-upload");
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

async function dispatchNotificationEmail(notification) {
  if (!API_ENABLED) return { sent: false, reason: "versão local sem serviço de e-mail" };
  try {
    const response = await apiFetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notification }),
    });
    return await response.json();
  } catch {
    return { sent: false, reason: "serviço de e-mail indisponível" };
  }
}

function unitOpeningForecast(unitId) {
  const progress = unitProgress(unitId);
  if (!progress.total) return { label: "Sem itens para prever", date: "", className: "nodate" };
  if (!progress.open) return { label: "Pronta para inaugurar", date: todayIso(), className: "ready" };

  const openItems = items.filter((item) => !isChecklistDone(unitId, item.id)).map((item) => itemForUnit(item, unitId));
  const dueDates = openItems
    .map((item) => normalizeDate(item.vencimento))
    .filter(Boolean)
    .sort();

  if (dueDates.length) {
    const date = dueDates[dueDates.length - 1];
    const days = daysUntil(date);
    const label = days !== null && days < 0
      ? `Previsão atrasada desde ${formatDate(date)}`
      : `Previsão ${formatDate(date)}`;
    return { label, date, className: days !== null && days < 0 ? "overdue" : "ok" };
  }

  const estimatedDays = Math.max(7, Math.ceil(progress.open * 1.5));
  const date = addDaysIso(estimatedDays);
  return { label: `Estimativa ${formatDate(date)}`, date, className: "estimated" };
}

function unitInvestment(unitId) {
  const planned = sum(items, (item) => totalOf(itemForUnit(item, unitId)));
  const bought = sum(items.filter((item) => isChecklistDone(unitId, item.id)), (item) => totalOf(itemForUnit(item, unitId)));
  return { planned, bought, open: Math.max(0, planned - bought) };
}

function allUnitsDashboardMetrics() {
  const activeUnits = operationalUnits();
  const unitInvestmentTotals = allUnitsInvestment();
  const progressRows = activeUnits.map((unit) => unitProgress(unit.id));
  return {
    plannedInvestment: unitInvestmentTotals.planned,
    boughtInvestment: unitInvestmentTotals.bought,
    itemCount: sum(progressRows, (progress) => progress.total),
    pendingCount: sum(progressRows, (progress) => progress.open),
    overdueCount: sum(progressRows, (progress) => progress.overdue),
    dueSoonCount: sum(progressRows, (progress) => progress.dueSoon),
    toBuyCount: sum(progressRows, (progress) => progress.open),
    boughtCount: sum(progressRows, (progress) => progress.done),
  };
}

function unitDashboardMetrics(unitId) {
  const progress = unitProgress(unitId);
  const investment = unitInvestment(unitId);
  return {
    plannedInvestment: investment.planned,
    boughtInvestment: investment.bought,
    itemCount: progress.total,
    pendingCount: progress.open,
    overdueCount: progress.overdue,
    dueSoonCount: progress.dueSoon,
    toBuyCount: items.filter((item) => unitItemStatus(unitId, item) !== "Comprado").length,
    boughtCount: progress.done,
  };
}

function allUnitsInvestment() {
  const activeUnits = operationalUnits();
  return activeUnits.reduce((acc, unit) => {
    const investment = unitInvestment(unit.id);
    acc.planned += investment.planned;
    acc.bought += investment.bought;
    acc.open += investment.open;
    return acc;
  }, { planned: 0, bought: 0, open: 0 });
}

function loadActiveUserId() {
  const saved = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
  if (saved && users.some((user) => user.id === saved && user.active)) return saved;
  return users.find((user) => user.role === "Administrador" && user.active)?.id || users[0]?.id || "";
}

function currentUser() {
  return users.find((user) => user.id === activeUserId && user.active) || users.find((user) => user.active) || users[0];
}

function authenticatedUser() {
  return users.find((user) => user.id === authenticatedUserId && user.active) || null;
}

function isAuthenticated() {
  return Boolean(authenticatedUser());
}

function syncActiveWithAuthenticated() {
  const user = authenticatedUser();
  if (!user) return;
  activeUserId = user.id;
  localStorage.setItem(ACTIVE_USER_STORAGE_KEY, activeUserId);
}

function applyAuthState() {
  const loginScreen = document.getElementById("loginScreen");
  const appShell = document.querySelector(".app-shell");
  const logged = isAuthenticated();
  loginScreen.classList.toggle("is-hidden", logged);
  appShell.classList.toggle("is-locked", !logged);
  if (logged) syncActiveWithAuthenticated();
}

function configureLoginMode() {
  const firstAccess = new URLSearchParams(window.location.search).has("firstAccess");
  document.getElementById("loginEmailLabel").hidden = firstAccess;
  document.getElementById("loginEmailInput").required = !firstAccess;
  document.getElementById("loginPasswordConfirmLabel").hidden = !firstAccess;
  document.getElementById("loginPasswordConfirmInput").required = firstAccess;
  document.getElementById("loginPasswordInput").autocomplete = firstAccess ? "new-password" : "current-password";
  document.getElementById("loginInstruction").textContent = firstAccess
    ? "Crie uma senha com pelo menos 10 caracteres, incluindo letra maiúscula, minúscula e número."
    : "Acesse com seu e-mail e senha.";
  document.getElementById("loginSubmitBtn").textContent = firstAccess ? "Criar senha" : "Entrar";
}

async function restoreServerSession() {
  if (!API_ENABLED) return false;
  try {
    const response = await apiFetch("/api/auth/me", { cache: "no-store" });
    if (!response.ok) return false;
    const result = await response.json();
    csrfToken = result.csrfToken || "";
    const sessionUser = normalizeUser(result.user);
    users = [sessionUser, ...users.filter((user) => user.id !== sessionUser.id)];
    authenticatedUserId = sessionUser.id;
    activeUserId = sessionUser.id;
    localStorage.setItem(AUTH_USER_STORAGE_KEY, authenticatedUserId);
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, activeUserId);
    return true;
  } catch {
    return false;
  }
}

function currentPermissions() {
  return ROLE_PERMISSIONS[currentUser()?.role || "Franqueado"] || ROLE_PERMISSIONS["Franqueado"];
}

function can(permission) {
  const permissions = currentPermissions();
  if (permissions.views.includes(permission)) return true;
  return Boolean(permissions[permission]);
}

function canView(view) {
  return currentPermissions().views.includes(view);
}

function fallbackView() {
  return currentPermissions().views[0] || "dashboard";
}

function normalizeItem(item) {
  const fornecedor = item["Fornecedor/Local"] ?? item.fornecedor ?? "";
  const link = item["Link Compra"] ?? item["Link de Compra"] ?? item.fornecedorLink ?? item.linkCompra ?? "";
  return {
    id: item.id || crypto.randomUUID(),
    categoria: item["Categoria"] ?? item.categoria ?? "",
    item: item["Item"] ?? item.item ?? "",
    descricao: item["Descrição"] ?? item.descricao ?? "",
    fornecedor,
    fornecedorLink: normalizeUrl(link || (isLikelyUrl(fornecedor) ? fornecedor : "")),
    valor: toNumber(item["Valor Unitário"] ?? item.valor),
    quantidade: toNumber(item["Quantidade"] ?? item.quantidade),
    prazo: item["Prazo"] ?? item.prazo ?? "",
    vencimento: normalizeDate(item["Vencimento"] ?? item.vencimento ?? deriveDueDate(item["Prazo"] ?? item.prazo ?? "")),
    status: item["Status"] ?? item.status ?? "A Comprar",
    prioridade: item["Prioridade"] ?? item.prioridade ?? "Normal",
    observacoes: item["Observações"] ?? item.observacoes ?? "",
    fonte: item["Fonte"] ?? item.fonte ?? "",
    linha: item["Linha"] ?? item.linha ?? "",
  };
}

function todayIso() {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return local.toISOString().slice(0, 10);
}

function addDaysIso(days) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeDate(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (br) {
    const [, day, month, year] = br;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return "";
}

function deriveDueDate(prazo) {
  const match = /(\d+)\s*DIAS?/i.exec(String(prazo || ""));
  if (!match) return "";
  return addDaysIso(Number(match[1]));
}

function daysUntil(dateIso) {
  if (!dateIso) return null;
  const today = new Date(`${todayIso()}T00:00:00`);
  const due = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  return Math.round((due - today) / 86400000);
}

function alertInfo(item) {
  if (item.status === "Comprado" || item.status === "Cancelado") {
    return { label: "Concluído", className: "done", days: null };
  }
  const days = daysUntil(item.vencimento);
  if (days === null) return { label: "Sem data", className: "nodate", days: null };
  if (days < 0) return { label: "Vencido", className: "overdue", days };
  if (days === 0) return { label: "Vence hoje", className: "today", days };
  if (days <= 7) return { label: "Próx. 7 dias", className: "soon", days };
  if (days <= 30) return { label: "Próx. 30 dias", className: "watch", days };
  return { label: "No prazo", className: "ok", days };
}

function alertText(item) {
  const info = alertInfo(item);
  if (info.label === "Vencido") return `Vencido há ${Math.abs(info.days)} dia(s)`;
  if (info.label === "Vence hoje") return "Vence hoje";
  if (info.days !== null && info.days > 0) return `Faltam ${info.days} dia(s)`;
  return info.label;
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  const state = document.getElementById("savedState");
  state.textContent = "Salvo localmente";
  state.style.color = "#64748b";
}

function saveAll() {
  saveItems();
  saveUsers();
  saveUnits();
  saveChecklist();
  saveDocuments();
  saveDocumentGuidance();
  saveItemPhotos();
  saveNotifications();
  saveMilestones();
  saveRemoteState();
}

function markDirty() {
  const state = document.getElementById("savedState");
  state.textContent = "Alterações não salvas";
  state.style.color = "#e76f51";
}

function appState() {
  return {
    exportedAt: new Date().toISOString(),
    activeUserId,
    selectedUnitId,
    items,
    users,
    units,
    checklist,
    documents,
    documentGuidance,
    itemPhotos,
    notifications,
    milestones,
  };
}

function applyAppState(state) {
  if (!state || typeof state !== "object") return false;
  const loggedId = authenticatedUserId;
  if (Array.isArray(state.items)) items = state.items.map(normalizeItem);
  if (Array.isArray(state.users)) users = state.users.map(normalizeUser);
  if (Array.isArray(state.units)) units = state.units.map(normalizeUnit);
  if (!API_ENABLED) {
    ensureAdministratorAccess();
    ensureAccountingAccess();
  }
  ensureFranchiseeUnits();
  if (state.checklist && typeof state.checklist === "object" && !Array.isArray(state.checklist)) checklist = state.checklist;
  if (state.documents && typeof state.documents === "object" && !Array.isArray(state.documents)) documents = state.documents;
  if (state.documentGuidance && typeof state.documentGuidance === "object" && !Array.isArray(state.documentGuidance)) documentGuidance = state.documentGuidance;
  if (state.itemPhotos && typeof state.itemPhotos === "object" && !Array.isArray(state.itemPhotos)) itemPhotos = state.itemPhotos;
  if (Array.isArray(state.notifications)) notifications = state.notifications;
  if (state.milestones && typeof state.milestones === "object" && !Array.isArray(state.milestones)) milestones = state.milestones;
  activeUserId = users.find((user) => user.id === loggedId && user.active)?.id ||
    users.find((user) => user.id === state.activeUserId && user.active)?.id ||
    loadActiveUserId();
  selectedUnitId = units.find((unit) => unit.id === state.selectedUnitId && unit.active)?.id || loadSelectedUnitId();
  localStorage.setItem(ACTIVE_USER_STORAGE_KEY, activeUserId);
  localStorage.setItem(SELECTED_UNIT_STORAGE_KEY, selectedUnitId);
  saveItems();
  saveUsers();
  saveUnits();
  saveChecklist();
  saveDocuments();
  saveDocumentGuidance();
  saveItemPhotos();
  saveNotifications();
  saveMilestones();
  return true;
}

async function loadRemoteState() {
  if (!API_ENABLED) return false;
  try {
    const response = await apiFetch("/api/state", { cache: "no-store" });
    if (!response.ok) return false;
    const state = await response.json();
    lastRemoteSync = state.exportedAt || "";
    return applyAppState(state);
  } catch {
    return false;
  }
}

async function refreshRemoteState() {
  if (!API_ENABLED || !isAuthenticated()) return;
  try {
    const response = await apiFetch("/api/state", { cache: "no-store" });
    if (!response.ok) return;
    const state = await response.json();
    if ((state.exportedAt || "") && state.exportedAt === lastRemoteSync) return;
    lastRemoteSync = state.exportedAt || "";
    const loggedId = authenticatedUserId;
    applyAppState(state);
    authenticatedUserId = users.some((user) => user.id === loggedId && user.active) ? loggedId : "";
    if (authenticatedUserId) activeUserId = authenticatedUserId;
    applyAuthState();
    if (isAuthenticated()) render();
  } catch {
    // Mantem a tela atual se o backend estiver momentaneamente indisponivel.
  }
}

async function saveRemoteState() {
  if (!API_ENABLED) return false;
  try {
    const response = await apiFetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(appState()),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function sendUserInvite(user) {
  const payload = { userId: user.id };
  if (!user.email || user.email.endsWith("@local")) {
    alert("Cadastre um e-mail válido para enviar o acesso.");
    return { sent: false, reason: "e-mail inválido" };
  }
  if (API_ENABLED) {
    try {
      const response = await apiFetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      alert(result.sent
        ? `Acesso enviado para ${user.email}.`
        : `O acesso não foi enviado. ${result.reason || "Verifique a configuração do serviço de e-mail."}`);
      return result;
    } catch {
      alert("Não foi possível conectar ao serviço de envio de e-mail.");
      return { sent: false, reason: "serviço de envio indisponível" };
    }
  }
  alert("O envio automático de acesso funciona na versão online da plataforma. Abra o app publicado ou pelo servidor para enviar o e-mail.");
  return { sent: false, reason: "versão local sem serviço de e-mail" };
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  const parsed = Number(String(value).replace(/[R$\s.]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : "";
}

function isLikelyUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function normalizeUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(text)) return `https://${text}`;
  return text;
}

function safeExternalUrl(value) {
  const url = normalizeUrl(value);
  return /^https?:\/\//i.test(url) ? url : "";
}

function totalOf(item) {
  const value = toNumber(item.valor);
  const qty = toNumber(item.quantidade);
  if (value === "" || qty === "") return 0;
  return value * qty;
}

function isPending(item) {
  if (item.status === "Comprado") return false;
  return (
    item.status === "A Definir" ||
    item.valor === "" ||
    item.quantidade === "" ||
    !String(item.prazo || "").trim() ||
    String(item.prazo || "").trim().toUpperCase() === "A DEFINIR" ||
    !String(item.vencimento || "").trim()
  );
}

function isPendingForUnit(item, unitId) {
  if (unitId && unitItemStatus(unitId, item) === "Comprado") return false;
  return isPending(item);
}

function pendingReasons(item) {
  const reasons = [];
  if (item.status === "A Definir") reasons.push("Status");
  if (item.valor === "") reasons.push("Valor");
  if (item.quantidade === "") reasons.push("Quantidade");
  if (!String(item.prazo || "").trim() || String(item.prazo || "").trim().toUpperCase() === "A DEFINIR") reasons.push("Prazo");
  if (!String(item.vencimento || "").trim()) reasons.push("Vencimento");
  return reasons;
}

function groupBy(itemsToGroup, keyFn) {
  return itemsToGroup.reduce((acc, item) => {
    const key = keyFn(item) || "Sem informação";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function statusClass(status) {
  return {
    "A Comprar": "buy",
    "Cotando": "quote",
    "Comprado": "done",
    "A Definir": "def",
    "Cancelado": "cancel",
  }[status] || "cancel";
}

function priorityClass(priority) {
  return {
    "Alta": "high",
    "Média": "medium",
    "Normal": "normal",
    "Baixa": "low",
  }[priority] || "normal";
}

function statusForCurrentContext(item) {
  const unit = itemsContextUnit();
  return unit ? unitItemStatus(unit.id, item) : item.status;
}

function itemsContextUnit() {
  if (can("viewAllUnits")) {
    const activeUnits = operationalUnits();
    if (!selectedItemsUnitId || !activeUnits.some((unit) => unit.id === selectedItemsUnitId)) {
      selectedItemsUnitId = selectedUnitId || activeUnits[0]?.id || "";
    }
    return activeUnits.find((unit) => unit.id === selectedItemsUnitId) || null;
  }
  return currentUnit();
}

function setView(view) {
  if (!canView(view)) view = fallbackView();
  currentView = view;
  document.querySelectorAll(".nav-item").forEach((btn) => btn.classList.toggle("is-active", btn.dataset.view === view));
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("is-visible"));
  document.getElementById(`${view}View`).classList.add("is-visible");
  const titles = {
    dashboard: "Dashboard Executivo",
    items: "Base de Itens",
    pending: "Pendências",
    alerts: "Alertas e notificações",
    purchases: "Compras",
    categories: "Categorias",
    myUnit: "Minha Unidade",
    documents: "Documentos",
    units: "Unidades e implantação",
    users: "Usuários e permissões",
  };
  document.getElementById("viewTitle").textContent = view === "myUnit" && can("viewAllUnits")
    ? "Acompanhamento das Unidades"
    : titles[view];
  render();
}

function render() {
  if (!canView(currentView)) currentView = fallbackView();
  applyPermissions();
  renderActiveUserSelect();
  renderFilters();
  renderDashboard();
  if (currentView === "items") renderItemsTable();
  if (currentView === "pending") renderPending();
  if (currentView === "alerts") renderAlerts();
  if (currentView === "purchases") renderPurchases();
  if (currentView === "categories") renderCategories();
  if (currentView === "myUnit") renderMyUnit();
  if (currentView === "documents") renderDocuments();
  if (currentView === "units") renderUnits();
  if (currentView === "users") renderUsers();
}

function applyPermissions() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    const allowed = canView(btn.dataset.view);
    btn.hidden = !allowed;
  });
  document.querySelectorAll(".nav-item").forEach((btn) => btn.classList.toggle("is-active", btn.dataset.view === currentView));
  document.querySelectorAll(".view").forEach((section) => section.classList.toggle("is-visible", section.id === `${currentView}View`));
  document.getElementById("exportCsvBtn").disabled = !can("exportData");
  document.getElementById("exportJsonBtn").disabled = !can("exportData");
  document.getElementById("resetBtn").disabled = !can("resetData");
  document.getElementById("saveBtn").disabled = !(can("editItems") || can("manageUsers") || can("updateOwnChecklist") || can("updateAnyChecklist") || can("manageDocuments") || can("uploadDocuments"));
  document.getElementById("importJsonInput").disabled = !can("editItems");
  document.querySelector(".file-button").classList.toggle("is-disabled", !can("editItems"));
}

function renderActiveUserSelect() {
  const select = document.getElementById("activeUserSelect");
  if (!select) return;
  const auth = authenticatedUser();
  const authPermissions = ROLE_PERMISSIONS[auth?.role || "Franqueado"] || ROLE_PERMISSIONS["Franqueado"];
  const canSwitchUsers = Boolean(auth && authPermissions.manageUsers);
  if (isAuthenticated() && !canSwitchUsers) syncActiveWithAuthenticated();
  const current = users.some((user) => user.id === activeUserId && user.active) ? activeUserId : currentUser()?.id;
  activeUserId = current;
  localStorage.setItem(ACTIVE_USER_STORAGE_KEY, activeUserId);
  select.innerHTML = users
    .filter((user) => user.active && (!isAuthenticated() || canSwitchUsers || user.id === activeUserId))
    .map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name)} · ${escapeHtml(user.role)}</option>`)
    .join("");
  select.value = users.some((user) => user.id === current && user.active) ? current : currentUser()?.id;
  select.disabled = !canSwitchUsers;
}

function renderFilters() {
  fillSelect("categoryFilter", unique(items.map((item) => item.categoria)), "Todas as categorias");
  fillSelect("myUnitCategoryFilter", unique(items.map((item) => item.categoria)), "Todas as categorias");
  fillSelect("selectedUnitCategoryFilter", unique(items.map((item) => item.categoria)), "Todas as categorias");
  fillSelect("statusFilter", baseData.statuses, "Todos os status");
  fillSelect("priorityFilter", baseData.priorities, "Todas as prioridades");
  renderItemsUnitFilter();
}

function renderItemsUnitFilter() {
  const select = document.getElementById("itemsUnitFilter");
  if (!select) return;
  const unit = itemsContextUnit();
  select.hidden = !can("viewAllUnits");
  if (can("viewAllUnits")) {
    select.innerHTML = units
      .filter((candidate) => candidate.active && !isImplementationArchived(candidate))
      .map((candidate) => `<option value="${escapeHtml(candidate.id)}">${escapeHtml(candidate.name)} · ${escapeHtml(unitOwnerName(candidate))}</option>`)
      .join("");
    select.value = unit?.id || "";
  } else {
    select.innerHTML = unit ? `<option value="${escapeHtml(unit.id)}">${escapeHtml(unit.name)}</option>` : `<option value="">Sem unidade</option>`;
    select.value = unit?.id || "";
  }
}

function fillSelect(id, options, label) {
  const select = document.getElementById(id);
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${label}</option>` + options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("");
  select.value = current;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function renderDashboard() {
  const pending = items.filter(isPending);
  const alerts = items.map(alertInfo);
  const unit = currentUnit();
  const emptyMetrics = {
    plannedInvestment: 0,
    boughtInvestment: 0,
    itemCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    dueSoonCount: 0,
    toBuyCount: 0,
    boughtCount: 0,
  };
  const metrics = can("viewAllUnits") ? allUnitsDashboardMetrics() : unit
    ? (isImplementationArchived(unit) ? emptyMetrics : unitDashboardMetrics(unit.id))
    : {
    plannedInvestment: sum(items, totalOf),
    boughtInvestment: 0,
    itemCount: items.length,
    pendingCount: pending.length,
    overdueCount: alerts.filter((alert) => alert.label === "Vencido").length,
    dueSoonCount: alerts.filter((alert) => alert.label === "Vence hoje" || alert.label === "Próx. 7 dias").length,
    toBuyCount: items.filter((item) => item.status === "A Comprar").length,
    boughtCount: items.filter((item) => item.status === "Comprado").length,
  };
  document.getElementById("kpiTotal").textContent = money.format(metrics.plannedInvestment);
  document.getElementById("kpiUnitBoughtInvestment").textContent = money.format(metrics.boughtInvestment);
  document.getElementById("kpiItems").textContent = number.format(metrics.itemCount);
  document.getElementById("kpiPending").textContent = number.format(metrics.pendingCount);
  document.getElementById("kpiOverdue").textContent = number.format(metrics.overdueCount);
  document.getElementById("kpiDueSoon").textContent = number.format(metrics.dueSoonCount);
  document.getElementById("kpiToBuy").textContent = number.format(metrics.toBuyCount);
  document.getElementById("kpiBought").textContent = number.format(metrics.boughtCount);
  fitKpiValues();
  renderCategoryBars();
  renderStatusDonut();
  renderSuppliers();
  renderDashboardUnitProgress();
}

function dashboardScopedItems() {
  if (can("viewAllUnits")) {
    return units
      .filter((unit) => unit.active && !isImplementationArchived(unit))
      .flatMap((unit) => items.map((item) => ({
        unit,
        baseItem: item,
        item: itemForUnit(item, unit.id),
        done: isChecklistDone(unit.id, item.id),
      })));
  }
  const unit = currentUnit();
  if (!unit || isImplementationArchived(unit)) return [];
  return items.map((item) => ({ unit, baseItem: item, item: itemForUnit(item, unit.id), done: isChecklistDone(unit.id, item.id) }));
}

function fitKpiValues() {
  document.querySelectorAll(".kpi strong").forEach((value) => {
    value.style.fontSize = "";
    let size = Number.parseFloat(getComputedStyle(value).fontSize);
    while (value.scrollWidth > value.clientWidth && size > 13) {
      size -= 1;
      value.style.fontSize = `${size}px`;
    }
  });
}

function renderDashboardUnitProgress() {
  const panel = document.getElementById("unitDashboardPanel");
  const container = document.getElementById("dashboardUnitProgress");
  if (!panel || !container) return;
  panel.hidden = !can("viewAllUnits");
  if (!can("viewAllUnits")) {
    container.innerHTML = "";
    return;
  }
  const activeUnits = operationalUnits();
  if (!activeUnits.length) {
    container.innerHTML = `<div class="empty">Nenhuma unidade cadastrada.</div>`;
    return;
  }
  container.innerHTML = activeUnits
    .map((unit) => ({ unit, progress: unitProgress(unit.id), investment: unitInvestment(unit.id), forecast: unitOpeningForecast(unit.id), owner: unitOwnerName(unit) }))
    .sort((a, b) => a.progress.percent - b.progress.percent || a.unit.name.localeCompare(b.unit.name, "pt-BR"))
    .map(({ unit, progress, investment, forecast, owner }) => `
      <button class="dashboard-unit-row" data-dashboard-unit="${escapeHtml(unit.id)}">
        <div>
          <strong>${escapeHtml(unit.name)}</strong>
          <span>${escapeHtml(owner)}</span>
          <em class="opening-forecast ${forecast.className}">${escapeHtml(forecast.label)}</em>
        </div>
        <div class="progress-bar"><i style="width:${progress.percent}%"></i></div>
        <div class="dashboard-unit-metrics">
          <b>${progress.percent}%</b>
          <span>${progress.done}/${progress.total} concluídos</span>
          <span>${money.format(investment.bought)} comprados</span>
          <span>${money.format(investment.planned)} previsto</span>
          <span>${money.format(investment.open)} a comprar</span>
          <span>${progress.open} itens em aberto</span>
          <span>${progress.overdue} vencidos</span>
        </div>
      </button>
    `).join("");
}

function renderCategoryBars() {
  const scopedRows = dashboardScopedItems();
  const groups = groupBy(scopedRows, (row) => row.item.categoria);
  const rows = Object.entries(groups).map(([category, group]) => ({
    category,
    total: sum(group, (row) => totalOf(row.item)),
    pending: group.filter((row) => !row.done && isPendingForUnit(row.baseItem, row.unit?.id)).length,
  }));
  const sort = document.getElementById("categorySort").value;
  rows.sort((a, b) => {
    if (sort === "name") return a.category.localeCompare(b.category, "pt-BR");
    if (sort === "pending") return b.pending - a.pending;
    return b.total - a.total;
  });
  const max = Math.max(...rows.map((row) => row.total), 1);
  document.getElementById("categoryBars").innerHTML = rows.map((row) => `
    <div class="bar-row">
      <div class="bar-label" title="${escapeHtml(row.category)}">${escapeHtml(row.category)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, (row.total / max) * 100)}%"></div></div>
      <div class="bar-value">${money.format(row.total)}</div>
    </div>
  `).join("");
}

function renderStatusDonut() {
  const scopedRows = dashboardScopedItems();
  const statuses = unique([...baseData.statuses, ...scopedRows.map((row) => row.item.status)]);
  const counts = statuses.map((status) => ({ status, count: scopedRows.filter((row) => row.item.status === status).length }));
  const total = Math.max(sum(counts, (row) => row.count), 1);
  let current = 0;
  const parts = counts.map((row) => {
    const start = current;
    const end = current + (row.count / total) * 360;
    current = end;
    return `${statusColors[row.status] || "#64748b"} ${start}deg ${end}deg`;
  });
  document.getElementById("statusDonut").style.background = `conic-gradient(${parts.join(",")})`;
  document.getElementById("statusLegend").innerHTML = counts.map((row) => `
    <div class="legend-row">
      <span><i class="legend-key" style="background:${statusColors[row.status] || "#64748b"}"></i>${escapeHtml(row.status)}</span>
      <strong>${row.count}</strong>
    </div>
  `).join("");
}

function renderSuppliers() {
  const scopedItems = dashboardScopedItems().map((row) => row.item).filter((item) => item.fornecedor);
  const groups = groupBy(scopedItems, (item) => item.fornecedor);
  const rows = Object.entries(groups)
    .map(([supplier, group]) => ({ supplier, total: sum(group, totalOf), link: group.find((item) => safeExternalUrl(item.fornecedorLink || item.fornecedor)) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  document.getElementById("supplierList").innerHTML = rows.map((row) => `
    <div class="supplier-row"><span title="${escapeHtml(row.supplier)}">${escapeHtml(truncate(row.supplier, 34))}</span><strong>${money.format(row.total)}</strong>${row.link ? supplierLink(row.link, "Abrir") : ""}</div>
  `).join("");
}

function getFilteredItems() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const status = document.getElementById("statusFilter").value;
  const priority = document.getElementById("priorityFilter").value;
  const unit = itemsContextUnit();
  return items.filter((item) => {
    const scoped = itemForUnit(item, unit?.id);
    const hay = `${scoped.item} ${scoped.descricao} ${scoped.fornecedor} ${scoped.fornecedorLink} ${scoped.categoria}`.toLowerCase();
    return (!query || hay.includes(query)) &&
      (!category || scoped.categoria === category) &&
      (!status || scoped.status === status) &&
      (!priority || scoped.prioridade === priority);
  });
}

function renderItemsTable() {
  const body = document.querySelector("#itemsTable tbody");
  const rows = getFilteredItems();
  const unit = itemsContextUnit();
  const canEditUnitParams = can("editItems");
  const canEditOwnValue = can("editOwnValue") && currentUnit()?.id === unit?.id;
  const baseDisabled = canEditUnitParams ? "" : "disabled";
  const valueDisabled = (canEditUnitParams || canEditOwnValue) ? "" : "disabled";
  const statusDisabled = can("changeStatus") ? "" : "disabled";
  body.innerHTML = rows.map((item) => {
    const scoped = itemForUnit(item, unit?.id);
    const approved = unit?.id ? proofIsApproved(unit.id, item.id) : false;
    const rowStatusDisabled = currentUser()?.role === "Franqueado" && approved ? "disabled" : statusDisabled;
    return `
    <tr data-id="${escapeHtml(item.id)}">
      <td>${escapeHtml(scoped.categoria)}</td>
      <td>${canEditUnitParams ? `<input class="cell-input" data-field="item" value="${escapeAttr(scoped.item)}" />` : itemNameControl(item)}</td>
      <td>${itemPhotoControls(item)}</td>
      <td><input class="cell-input" data-field="fornecedor" value="${escapeAttr(scoped.fornecedor)}" ${baseDisabled} /></td>
      <td><div class="link-cell"><input class="cell-input" data-field="fornecedorLink" type="url" placeholder="https://..." value="${escapeAttr(scoped.fornecedorLink)}" ${baseDisabled} />${supplierLink(scoped, "Abrir")}</div></td>
      <td><input class="cell-input money" data-field="valor" type="number" step="0.01" value="${escapeAttr(scoped.valor)}" ${valueDisabled} /></td>
      <td><input class="cell-input" data-field="quantidade" type="number" step="0.01" value="${escapeAttr(scoped.quantidade)}" ${baseDisabled} /></td>
      <td class="total">${money.format(totalOf(scoped))}</td>
      <td><input class="cell-input" data-field="prazo" value="${escapeAttr(scoped.prazo)}" ${baseDisabled} /></td>
      <td><input class="cell-input" data-field="vencimento" type="date" value="${escapeAttr(scoped.vencimento)}" ${baseDisabled} /></td>
      <td><span class="alert-pill ${alertInfo(scoped).className}">${escapeHtml(alertText(scoped))}</span></td>
      <td>${proofControls(item, unit?.id)}</td>
      <td>${selectHtml("status", scoped.status, allowedStatusOptions(), rowStatusDisabled)}</td>
      <td>${selectHtml("prioridade", scoped.prioridade, baseData.priorities, baseDisabled)}</td>
    </tr>
  `;
  }).join("");
}

function selectHtml(field, value, options, disabled = "") {
  const normalizedOptions = options.includes(value) ? options : [value, ...options].filter(Boolean);
  return `<select class="cell-select" data-field="${field}" ${disabled}>${normalizedOptions.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>`;
}

function supplierLink(item, label = "Comprar") {
  const url = safeExternalUrl(item.fornecedorLink || item.fornecedor);
  if (!url) return "";
  return `<a class="supplier-link" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" title="${escapeAttr(url)}">${escapeHtml(label)}</a>`;
}

function renderPending() {
  const query = document.getElementById("pendingSearchInput").value.trim().toLowerCase();
  const unit = itemsContextUnit();
  const rows = items.filter((item) => isPendingForUnit(item, unit?.id)).filter((item) => {
    const hay = `${item.item} ${item.categoria} ${item.fornecedor} ${pendingReasons(item).join(" ")}`.toLowerCase();
    return !query || hay.includes(query);
  });
  const list = document.getElementById("pendingList");
  if (!rows.length) {
    list.innerHTML = `<div class="empty">Nenhuma pendência encontrada.</div>`;
    return;
  }
  list.innerHTML = rows.map((item) => `
    <article class="issue">
      <input type="checkbox" data-issue="${escapeHtml(item.id)}" ${selectedIssues.has(item.id) ? "checked" : ""} />
      <div>
        <h4>${escapeHtml(item.item || "Item sem nome")}</h4>
        <p>${escapeHtml(item.categoria)} · ${escapeHtml(item.fornecedor || "Sem fornecedor")} · ${money.format(totalOf(item))} · ${escapeHtml(formatDate(item.vencimento) || "sem vencimento")}</p>
        <div class="issue-reasons">${pendingReasons(item).map((reason) => `<span class="reason">${escapeHtml(reason)}</span>`).join("")}</div>
        ${supplierLink(item, "Abrir fornecedor")}
      </div>
      <span class="badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
    </article>
  `).join("");
}

function renderAlerts() {
  renderAppNotifications();
  const query = document.getElementById("alertSearchInput").value.trim().toLowerCase();
  const filter = document.getElementById("alertFilter").value;
  const alertUnits = can("viewAllUnits") ? operationalUnits() : [currentUnit()].filter((unit) => unit && !isImplementationArchived(unit));
  const rows = alertUnits
    .flatMap((unit) => items.map((item) => {
      const scoped = itemForUnit(item, unit.id);
      return { unit, item: scoped, alert: alertInfo(scoped), done: isChecklistDone(unit.id, item.id) };
    }))
    .filter(({ item, alert, done }) => !done && alert.label !== "Concluído" && alert.label !== "No prazo")
    .filter(({ unit, item, alert }) => {
      const hay = `${unit.name} ${unitOwnerName(unit)} ${item.item} ${item.categoria} ${item.fornecedor} ${alert.label}`.toLowerCase();
      return (!query || hay.includes(query)) && (!filter || alert.label === filter);
    })
    .sort((a, b) => {
      const ad = a.alert.days ?? 9999;
      const bd = b.alert.days ?? 9999;
      return ad - bd;
    });
  const list = document.getElementById("alertsList");
  if (!rows.length) {
    list.innerHTML = `<div class="empty">Nenhum alerta encontrado.</div>`;
    return;
  }
  list.innerHTML = rows.map(({ unit, item, alert }) => `
    <article class="alert-card ${alert.className}">
      <div>
        <span class="alert-pill ${alert.className}">${escapeHtml(alertText(item))}</span>
        <h4>${escapeHtml(item.item || "Item sem nome")}</h4>
        <p>${escapeHtml(unit.name)} · ${escapeHtml(unitOwnerName(unit))} · ${escapeHtml(item.categoria)} · ${escapeHtml(item.fornecedor || "Sem fornecedor")} · vencimento ${escapeHtml(formatDate(item.vencimento) || "sem data")}</p>
        ${supplierLink(item, "Comprar")}
        ${isDeadlineAlert(item) ? alertContactLinks(unit, item) : ""}
      </div>
      <div class="alert-actions">
        ${can("editItems") ? `<button class="ghost-button" data-alert-id="${escapeHtml(item.id)}" data-days="7">+7 dias</button>
        <button class="ghost-button" data-alert-id="${escapeHtml(item.id)}" data-days="15">+15 dias</button>` : ""}
        ${can("changeStatus") ? `<button class="ghost-button" data-alert-id="${escapeHtml(item.id)}" data-status="Cotando">Cotando</button>` : ""}
      </div>
    </article>
  `).join("");
}

function renderPurchases() {
  document.querySelectorAll(".purchase-lane").forEach((lane) => {
    const status = lane.dataset.status;
    const unit = itemsContextUnit();
    const laneItems = items.map((item) => itemForUnit(item, unit?.id)).filter((item) => item.status === status).sort((a, b) => totalOf(b) - totalOf(a)).slice(0, 24);
    lane.querySelector("div").innerHTML = laneItems.length ? laneItems.map((item) => `
      <article class="purchase-card">
        <strong>${escapeHtml(item.item || "Item sem nome")}</strong>
        <p>${escapeHtml(item.categoria)} · ${escapeHtml(item.fornecedor || "Sem fornecedor")} · ${escapeHtml(formatDate(item.vencimento) || "sem vencimento")}</p>
        ${supplierLink(item, "Comprar")}
        <span class="badge ${priorityClass(item.prioridade)}">${escapeHtml(item.prioridade)}</span>
        <span class="alert-pill ${alertInfo(item).className}">${escapeHtml(alertText(item))}</span>
        <span class="badge ${statusClass(item.status)}">${money.format(totalOf(item))}</span>
      </article>
    `).join("") : `<div class="empty">Sem itens.</div>`;
  });
}

function renderCategories() {
  const unit = itemsContextUnit();
  const scopedItems = items.map((item) => itemForUnit(item, unit?.id));
  const groups = groupBy(scopedItems, (item) => item.categoria);
  const rows = Object.entries(groups)
    .map(([category, group]) => ({
      category,
      total: sum(group, totalOf),
      count: group.length,
      pending: group.filter(isPending).length,
      bought: group.filter((item) => item.status === "Comprado").length,
    }))
    .sort((a, b) => b.total - a.total);
  document.getElementById("categoryGrid").innerHTML = rows.map((row) => `
    <section class="category-tile">
      <h3>${escapeHtml(row.category)}</h3>
      <div class="category-metrics">
        <div class="metric-row"><span>Total</span><strong>${money.format(row.total)}</strong></div>
        <div class="metric-row"><span>Itens</span><strong>${row.count}</strong></div>
        <div class="metric-row"><span>Pendências</span><strong>${row.pending}</strong></div>
        <div class="metric-row"><span>Comprados</span><strong>${row.bought}</strong></div>
      </div>
    </section>
  `).join("");
}

function unitOwnerName(unit) {
  const user = users.find((candidate) => candidate.id === unit.franchiseeUserId || candidate.unitId === unit.id);
  return user?.name || "Sem franqueado vinculado";
}

function unitOwner(unit) {
  return users.find((candidate) => candidate.id === unit.franchiseeUserId || candidate.unitId === unit.id) || null;
}

function managementUsers() {
  return users.filter((user) => user.active && (user.role === "Administrador" || user.role === "Consultor de implantação"));
}

function uniqueUsers(rows) {
  const seen = new Set();
  return rows.filter((user) => {
    if (!user || seen.has(user.id)) return false;
    seen.add(user.id);
    return true;
  });
}

function alertRecipients(unit) {
  if (!can("viewAllUnits")) return uniqueUsers([currentUser()].filter(Boolean));
  return uniqueUsers([unitOwner(unit), ...managementUsers()]);
}

function cleanPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

function alertMessage(unit, item) {
  return [
    `Alerta de implantação - ${unit.name}`,
    `Item: ${item.item || "Item sem nome"}`,
    `Categoria: ${item.categoria || "Sem categoria"}`,
    `Vencimento: ${formatDate(item.vencimento) || "sem data"}`,
    `Situação: ${alertText(item)}`,
    `Valor estimado: ${money.format(totalOf(item))}`,
  ].join("\n");
}

function alertMailLink(unit, item, recipients) {
  const emails = recipients.map((user) => user.email).filter((email) => email && !email.endsWith("@local"));
  if (!emails.length) return "";
  const subject = `Alerta de prazo - ${unit.name} - ${item.item || "Item"}`;
  return `<a class="supplier-link alert-contact" href="mailto:${escapeAttr(emails.join(","))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(alertMessage(unit, item))}">E-mail</a>`;
}

function alertWhatsappLinks(unit, item, recipients) {
  const message = encodeURIComponent(alertMessage(unit, item));
  return recipients
    .map((user) => ({ user, phone: cleanPhone(user.phone) }))
    .filter(({ phone }) => phone)
    .map(({ user, phone }) => `<a class="supplier-link alert-contact" href="https://wa.me/${escapeAttr(phone)}?text=${message}" target="_blank" rel="noopener noreferrer">WhatsApp ${escapeHtml(user.name)}</a>`)
    .join("");
}

function alertContactLinks(unit, item) {
  const recipients = alertRecipients(unit);
  const links = [alertMailLink(unit, item, recipients), alertWhatsappLinks(unit, item, recipients)].filter(Boolean).join("");
  return links ? `<div class="alert-contact-list">${links}</div>` : `<div class="contact-missing">Cadastre e-mail/WhatsApp para enviar alertas.</div>`;
}

function isDeadlineAlert(item) {
  const label = alertInfo(item).label;
  return ["Vencido", "Vence hoje", "Próx. 7 dias", "Próx. 30 dias"].includes(label);
}

function getChecklistRows(unitId, options = {}) {
  const query = document.getElementById(options.searchId || "")?.value.trim().toLowerCase() || "";
  const category = document.getElementById(options.categoryId || "")?.value || "";
  const status = document.getElementById(options.statusId || "")?.value || "";
  return items.filter((item) => {
    const done = isChecklistDone(unitId, item.id);
    const hay = `${item.item} ${item.descricao} ${item.fornecedor} ${item.categoria}`.toLowerCase();
    return (!query || hay.includes(query)) &&
      (!category || item.categoria === category) &&
      (!status || (status === "done" ? done : !done));
  });
}

function renderChecklist(unitId, containerId, options = {}) {
  const container = document.getElementById(containerId);
  const unit = units.find((candidate) => candidate.id === unitId && candidate.active);
  if (!container) return;
  if (!unit) {
    container.innerHTML = `<div class="empty">Nenhuma unidade selecionada.</div>`;
    return;
  }
  const rows = getChecklistRows(unitId, options);
  const disabled = options.allowEdit ? "" : "disabled";
  if (!rows.length) {
    container.innerHTML = `<div class="empty">Nenhum item encontrado para estes filtros.</div>`;
    return;
  }
  container.innerHTML = rows.map((item) => {
    const scoped = itemForUnit(item, unitId);
    const entry = checklistEntry(unitId, item.id);
    const done = Boolean(entry.done);
    return `
      <article class="checklist-item ${done ? "is-done" : ""}" data-unit-id="${escapeHtml(unitId)}" data-item-id="${escapeHtml(item.id)}">
        <label class="check-toggle" title="Marcar item como concluído">
          <input type="checkbox" data-checklist-field="done" ${done ? "checked" : ""} ${disabled} />
          <span></span>
        </label>
        <div class="checklist-main">
          <div class="checklist-title">
            <strong>${escapeHtml(scoped.item || "Item sem nome")}</strong>
            <span class="badge ${statusClass(scoped.status)}">${escapeHtml(scoped.status)}</span>
            <span class="alert-pill ${alertInfo(scoped).className}">${escapeHtml(alertText(scoped))}</span>
          </div>
          <p>${escapeHtml(scoped.categoria)} · ${escapeHtml(scoped.fornecedor || "Sem fornecedor")} · ${money.format(totalOf(scoped))} · venc. ${escapeHtml(formatDate(scoped.vencimento) || "sem data")}</p>
          <div class="checklist-actions">
            ${supplierLink(scoped, "Comprar")}
            <input class="check-note" data-checklist-field="note" placeholder="Observação da unidade" value="${escapeAttr(entry.note || "")}" ${disabled} />
          </div>
          ${proofControls(item, unitId)}
          ${!done && isDeadlineAlert(scoped) ? alertContactLinks(unit, scoped) : ""}
        </div>
      </article>
    `;
  }).join("");
}

function renderMyUnit() {
  renderMyUnitSelector();
  renderMyUnitComparison();
  const unit = myUnitContextUnit();
  const title = document.getElementById("myUnitTitle");
  const subtitle = document.getElementById("myUnitSubtitle");
  const progressLabel = document.getElementById("myUnitProgress");
  const forecastLabel = document.getElementById("myUnitOpeningForecast");
  if (!unit) {
    title.textContent = "Minha Unidade";
    subtitle.textContent = can("viewAllUnits") ? "Nenhuma unidade ativa disponível." : "Seu cadastro ainda não tem uma unidade vinculada.";
    progressLabel.textContent = "0%";
    forecastLabel.textContent = "Sem unidade vinculada";
    forecastLabel.className = "";
    document.getElementById("myUnitChecklist").innerHTML = `<div class="empty">${can("viewAllUnits") ? "Cadastre ou ative uma unidade para acompanhar o checklist." : "Peça ao administrador para vincular seu usuário a uma unidade."}</div>`;
    return;
  }
  const progress = unitProgress(unit.id);
  const weighted = weightedUnitProgress(unit.id);
  const forecast = unitOpeningForecast(unit.id);
  title.textContent = unit.name;
  subtitle.textContent = `${unitOwnerName(unit)} · ${progress.done} de ${progress.total} itens concluídos · ${progress.open} em aberto`;
  if (isImplementationArchived(unit)) {
    subtitle.textContent += ` · implantação arquivada em ${formatDate(unit.implementationArchivedAt.slice(0, 10))}`;
  }
  progressLabel.textContent = `${weighted.percent}%`;
  forecastLabel.textContent = forecast.label;
  forecastLabel.className = forecast.className;
  renderChecklist(unit.id, "myUnitChecklist", {
    searchId: "myUnitSearchInput",
    categoryId: "myUnitCategoryFilter",
    statusId: "myUnitStatusFilter",
    allowEdit: !isImplementationArchived(unit) && (can("updateOwnChecklist") || can("updateAnyChecklist")),
  });
}

function renderMyUnitSelector() {
  const wrap = document.getElementById("myUnitSelectorWrap");
  const select = document.getElementById("myUnitSelector");
  if (!wrap || !select) return;
  wrap.hidden = !can("viewAllUnits");
  if (!can("viewAllUnits")) return;
  const activeUnits = operationalUnits();
  const current = selectedUnitId;
  select.innerHTML = activeUnits.length
    ? activeUnits.map((unit) => `<option value="${escapeHtml(unit.id)}">${escapeHtml(unit.name)} · ${escapeHtml(unitOwnerName(unit))}</option>`).join("")
    : `<option value="">Nenhuma unidade ativa</option>`;
  selectedUnitId = activeUnits.some((unit) => unit.id === current) ? current : activeUnits[0]?.id || "";
  select.value = selectedUnitId;
  localStorage.setItem(SELECTED_UNIT_STORAGE_KEY, selectedUnitId);
}

function renderMyUnitComparison() {
  const panel = document.getElementById("myUnitComparisonPanel");
  const body = document.getElementById("myUnitComparisonBody");
  if (!panel || !body) return;
  panel.hidden = !can("viewAllUnits");
  if (!can("viewAllUnits")) {
    body.innerHTML = "";
    return;
  }
  const rows = units
    .filter((unit) => unit.active && !isImplementationArchived(unit))
    .map((unit) => ({
      unit,
      progress: unitProgress(unit.id),
      weighted: weightedUnitProgress(unit.id),
      investment: unitInvestment(unit.id),
      forecast: unitOpeningForecast(unit.id),
    }))
    .sort((a, b) => b.weighted.percent - a.weighted.percent || a.unit.name.localeCompare(b.unit.name, "pt-BR"));
  body.innerHTML = rows.length ? rows.map(({ unit, progress, weighted, investment, forecast }) => `
    <button class="unit-comparison-row ${unit.id === selectedUnitId ? "is-selected" : ""}" type="button" data-my-unit-select="${escapeHtml(unit.id)}">
      <span class="comparison-unit"><strong>${escapeHtml(unit.name)}</strong><small>${escapeHtml(unitOwnerName(unit))}</small></span>
      <span class="comparison-progress"><i style="width:${weighted.percent}%"></i><b>${weighted.percent}%</b></span>
      <span><b>${progress.done}</b><small>concluídos</small></span>
      <span><b>${progress.open}</b><small>em aberto</small></span>
      <span><b>${progress.overdue}</b><small>vencidos</small></span>
      <span><b>${money.format(investment.bought)}</b><small>investido</small></span>
      <span class="opening-forecast ${forecast.className}">${escapeHtml(forecast.label)}</span>
    </button>
  `).join("") : `<div class="empty">Nenhuma unidade ativa cadastrada.</div>`;
}

function renderUnits() {
  if (!can("viewAllUnits")) {
    document.getElementById("unitsOverview").innerHTML = `<div class="empty">Seu perfil não permite acompanhar todas as unidades.</div>`;
    return;
  }
  const query = document.getElementById("unitsSearchInput").value.trim().toLowerCase();
  const activeUnits = operationalUnits();
  if (!selectedUnitId || !activeUnits.some((unit) => unit.id === selectedUnitId)) {
    selectedUnitId = activeUnits[0]?.id || "";
  }
  const visibleUnits = activeUnits.filter((unit) => {
    const hay = `${unit.name} ${unitOwnerName(unit)} ${unit.city}`.toLowerCase();
    return !query || hay.includes(query);
  });
  const overview = document.getElementById("unitsOverview");
  overview.innerHTML = visibleUnits.length ? visibleUnits.map((unit) => {
    const progress = unitProgress(unit.id);
    const forecast = unitOpeningForecast(unit.id);
    return `
      <button class="unit-card ${unit.id === selectedUnitId ? "is-selected" : ""}" data-select-unit="${escapeHtml(unit.id)}">
        <span>${escapeHtml(unitOwnerName(unit))}</span>
        <strong>${escapeHtml(unit.name)}</strong>
        <em class="opening-forecast ${forecast.className}">${escapeHtml(forecast.label)}</em>
        <div class="progress-bar"><i style="width:${progress.percent}%"></i></div>
        <div class="unit-card-metrics">
          <b>${progress.percent}%</b>
          <em>${progress.done}/${progress.total} itens</em>
          <em>${progress.overdue} vencidos</em>
        </div>
      </button>
    `;
  }).join("") : `<div class="empty">Nenhuma unidade encontrada.</div>`;

  const selectedUnit = units.find((unit) => unit.id === selectedUnitId && unit.active);
  localStorage.setItem(SELECTED_UNIT_STORAGE_KEY, selectedUnitId || "");
  document.getElementById("selectedUnitTitle").textContent = selectedUnit
    ? `${selectedUnit.name} · ${unitOwnerName(selectedUnit)}`
    : "Selecione uma unidade";
  const forecast = selectedUnit ? unitOpeningForecast(selectedUnit.id) : null;
  const selectedForecast = document.getElementById("selectedUnitForecast");
  selectedForecast.textContent = forecast ? forecast.label : "Previsão em análise";
  selectedForecast.className = `unit-forecast-text ${forecast?.className || ""}`;
  renderSelectedUnitCompletion(selectedUnit);
  renderChecklist(selectedUnitId, "selectedUnitChecklist", {
    categoryId: "selectedUnitCategoryFilter",
    allowEdit: can("updateAnyChecklist") && !isImplementationArchived(selectedUnit),
  });
  renderArchivedUnitsHistory();
}

function canArchiveImplementation(unit) {
  const role = currentUser()?.role || "";
  return Boolean(unit) &&
    ["Administrador", "Consultor de implantação"].includes(role) &&
    !isImplementationArchived(unit) &&
    unitProgress(unit.id).total > 0 &&
    unitProgress(unit.id).done === unitProgress(unit.id).total;
}

function renderSelectedUnitCompletion(unit) {
  const container = document.getElementById("selectedUnitCompletionActions");
  if (!container) return;
  if (!unit) {
    container.innerHTML = "";
    return;
  }
  const progress = unitProgress(unit.id);
  if (isImplementationArchived(unit)) {
    const archivedBy = users.find((user) => user.id === unit.implementationArchivedBy)?.name || "perfil autorizado";
    container.innerHTML = `
      <div class="completion-banner archived">
        <div><strong>Implantação concluída e arquivada</strong><span>Encerrada por ${escapeHtml(archivedBy)} em ${escapeHtml(formatDateTime(unit.implementationArchivedAt))}.</span></div>
      </div>`;
    return;
  }
  if (progress.percent < 100) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = `
    <div class="completion-banner ready">
      <div><strong>Checklist 100% concluído</strong><span>A unidade está pronta para o encerramento formal da implantação.</span></div>
      ${canArchiveImplementation(unit) ? `<button class="primary-button" type="button" data-complete-implementation="${escapeHtml(unit.id)}">Concluir e arquivar implantação</button>` : ""}
    </div>`;
}

function renderArchivedUnitsHistory() {
  const container = document.getElementById("archivedUnitsHistory");
  const panel = container?.closest(".archived-units-panel");
  if (!container || !panel) return;
  panel.hidden = !can("viewAllUnits");
  if (!can("viewAllUnits")) return;
  const archived = units
    .filter((unit) => unit.active && isImplementationArchived(unit))
    .sort((a, b) => String(b.implementationArchivedAt).localeCompare(String(a.implementationArchivedAt)));
  container.innerHTML = archived.length ? archived.map((unit) => {
    const progress = unitProgress(unit.id);
    const archivedBy = users.find((user) => user.id === unit.implementationArchivedBy)?.name || "perfil autorizado";
    return `
      <article class="archive-history-card">
        <div><strong>${escapeHtml(unit.name)}</strong><span>${escapeHtml(unitOwnerName(unit))}</span></div>
        <span class="badge done">${progress.percent}% concluído</span>
        <span>Encerrada em ${escapeHtml(formatDateTime(unit.implementationArchivedAt))}</span>
        <span>Por ${escapeHtml(archivedBy)}</span>
        <span>${isDocumentsArchived(unit) ? "Documentação finalizada" : "Documentação ainda em acompanhamento"}</span>
      </article>`;
  }).join("") : `<div class="empty compact-empty">Nenhuma implantação arquivada.</div>`;
}

function documentsContextUnits() {
  if (can("viewAllDocuments")) {
    const activeUnits = showArchivedDocuments
      ? units.filter((unit) => unit.active && isDocumentsArchived(unit))
      : documentQueueUnits();
    const selected = document.getElementById("documentsUnitFilter")?.value || "";
    return selected ? activeUnits.filter((unit) => unit.id === selected) : activeUnits;
  }
  return [currentUnit()].filter((unit) => unit && (showArchivedDocuments ? isDocumentsArchived(unit) : !isDocumentsArchived(unit)));
}

function renderDocumentsUnitFilter() {
  const select = document.getElementById("documentsUnitFilter");
  if (!select) return;
  select.hidden = !can("viewAllDocuments");
  if (!can("viewAllDocuments")) {
    const unit = currentUnit();
    select.innerHTML = unit ? `<option value="${escapeHtml(unit.id)}">${escapeHtml(unit.name)}</option>` : `<option value="">Sem unidade</option>`;
    select.value = unit?.id || "";
    return;
  }
  const current = select.value;
  const availableUnits = showArchivedDocuments
    ? units.filter((unit) => unit.active && isDocumentsArchived(unit))
    : documentQueueUnits();
  select.innerHTML = `<option value="">Todas as unidades</option>` + availableUnits
    .map((unit) => `<option value="${escapeHtml(unit.id)}">${escapeHtml(unit.name)} · ${escapeHtml(unitOwnerName(unit))}</option>`)
    .join("");
  select.value = availableUnits.some((unit) => unit.id === current) ? current : "";
}

function renderDocumentsSummary(rows) {
  const summary = document.getElementById("documentsSummary");
  if (!summary) return;
  const total = rows.length;
  const requested = rows.filter((row) => row.entry.status === "Solicitado").length;
  const processing = rows.filter((row) => row.entry.status === "Processando").length;
  const rejected = rows.filter((row) => row.entry.status === "Recusado").length;
  const done = rows.filter((row) => row.entry.status === "Concluido").length;
  const overdue = rows.filter((row) => documentAlertInfo(row.entry).label === "Vencido").length;
  summary.innerHTML = `
    <div class="document-summary-card"><span>Total</span><strong>${number.format(total)}</strong></div>
    <div class="document-summary-card"><span>Solicitados</span><strong>${number.format(requested)}</strong></div>
    <div class="document-summary-card"><span>Processando</span><strong>${number.format(processing)}</strong></div>
    <div class="document-summary-card rejected"><span>Recusados</span><strong>${number.format(rejected)}</strong></div>
    <div class="document-summary-card"><span>Concluidos</span><strong>${number.format(done)}</strong></div>
    <div class="document-summary-card alert"><span>Vencidos</span><strong>${number.format(overdue)}</strong></div>
  `;
}

function renderDocumentFinalApprovals(contextUnits) {
  const container = document.getElementById("documentsFinalApprovals");
  if (!container) return;
  const relevant = contextUnits.filter((unit) =>
    isDocumentsArchived(unit) ||
    allDocumentsApproved(unit.id) ||
    Object.keys(unit.documentFinalApprovals || {}).length
  );
  container.innerHTML = relevant.length ? relevant.map((unit) => {
    const adminApproval = documentFinalApproval(unit, "Administrador");
    const accountingApproval = documentFinalApproval(unit, "Contabilidade");
    const archived = isDocumentsArchived(unit);
    const role = currentUser()?.role || "";
    const canApproveFinal = canGiveDocumentFinalApproval(unit);
    return `
      <article class="document-final-card ${archived ? "archived" : "ready"}" data-final-unit-id="${escapeHtml(unit.id)}">
        <div>
          <strong>${escapeHtml(unit.name)} · ${escapeHtml(unitOwnerName(unit))}</strong>
          <span>${archived ? `Arquivo documental concluído em ${escapeHtml(formatDateTime(unit.documentsArchivedAt))}` : "Todos os documentos foram enviados e aprovados."}</span>
        </div>
        <div class="final-approval-status">
          <span class="badge ${adminApproval ? "done" : "watch"}">Administrador: ${adminApproval ? `OK em ${escapeHtml(formatDateTime(adminApproval.at))}` : "aguardando"}</span>
          <span class="badge ${accountingApproval ? "done" : "watch"}">Contabilidade: ${accountingApproval ? `OK em ${escapeHtml(formatDateTime(accountingApproval.at))}` : "aguardando"}</span>
        </div>
        ${canApproveFinal ? `<button class="primary-button" type="button" data-document-final-approval="${escapeHtml(unit.id)}">Dar OK final como ${escapeHtml(role)}</button>` : ""}
      </article>`;
  }).join("") : "";
}

function renderDocuments() {
  renderAppNotifications();
  renderDocumentsUnitFilter();
  const query = document.getElementById("documentsSearchInput")?.value.trim().toLowerCase() || "";
  const statusFilter = document.getElementById("documentsStatusFilter")?.value || "";
  const contextUnits = documentsContextUnits();
  renderDocumentFinalApprovals(contextUnits);
  const rows = contextUnits
    .flatMap((unit) => DOCUMENT_TYPES.map((doc) => ({ unit, doc, entry: documentEntry(unit.id, doc.id) })))
    .filter(({ unit, doc, entry }) => {
      const hay = `${unit.name} ${unitOwnerName(unit)} ${doc.name} ${entry.status} ${entry.note || ""} ${entry.rejectionReason || ""} ${entry.file?.name || ""}`.toLowerCase();
      return (!query || hay.includes(query)) && (!statusFilter || entry.status === statusFilter);
    });
  renderDocumentsSummary(rows);
  const list = document.getElementById("documentsList");
  if (!list) return;
  if (!rows.length) {
    list.innerHTML = `<div class="empty">${showArchivedDocuments ? "Nenhum arquivo documental concluído." : "Nenhum documento pendente nesta fila."}</div>`;
    return;
  }
  list.innerHTML = rows.map(({ unit, doc, entry }) => {
    const alert = documentAlertInfo(entry);
    const canUpload = !isDocumentsArchived(unit) && canUploadDocumentForUnit(unit.id) && entry.status !== "Concluido";
    const canRemoveRejected = canRemoveRejectedDocumentForUnit(unit.id, entry);
    const canManage = can("manageDocuments") && !isDocumentsArchived(unit);
    const canApprove = !isDocumentsArchived(unit) && canApproveDocumentForUnit(unit.id) && assetUrl(entry.file) && entry.status === "Processando";
    const canReject = !isDocumentsArchived(unit) && canRejectDocumentForUnit(unit.id) && assetUrl(entry.file) && entry.status === "Processando";
    const rejectedBy = users.find((user) => user.id === entry.rejectedBy)?.name || "perfil autorizado";
    return `
      <article class="document-card" data-unit-id="${escapeHtml(unit.id)}" data-document-id="${escapeHtml(doc.id)}">
        <div class="document-main">
          <div class="document-title">
            <button class="document-guidance-link" type="button" data-document-guidance="${escapeHtml(doc.id)}" title="Abrir orientacao">${escapeHtml(doc.name)}</button>
            <span class="badge ${documentStatusClass(entry.status)}">${escapeHtml(entry.status)}</span>
            <span class="alert-pill ${alert.className}">${escapeHtml(documentAlertText(entry))}</span>
          </div>
          <div class="document-unit-identity">
            <span>Unidade franqueada</span>
            <strong>${escapeHtml(unit.name)}</strong>
            <em>${escapeHtml(unitOwnerName(unit))}</em>
          </div>
          <div class="document-grid">
            <label>Prazo<input class="cell-input" data-document-field="prazo" value="${escapeAttr(entry.prazo || "")}" ${canManage ? "" : "disabled"} /></label>
            <label>Vencimento<input class="cell-input" data-document-field="vencimento" type="date" value="${escapeAttr(entry.vencimento || "")}" ${canManage ? "" : "disabled"} /></label>
            <label>Status${documentStatusSelect(unit.id, doc.id, entry.status)}</label>
            <label>Observacao<input class="cell-input" data-document-field="note" value="${escapeAttr(entry.note || "")}" ${canManage ? "" : "disabled"} /></label>
          </div>
          <div class="document-file">${documentFilePreview(entry)}</div>
          ${entry.status === "Recusado" && entry.rejectionReason ? `
            <div class="document-rejection-notice">
              <strong>Documento recusado</strong>
              <p>${escapeHtml(entry.rejectionReason)}</p>
              <small>Recusado por ${escapeHtml(rejectedBy)}${entry.rejectedAt ? ` em ${escapeHtml(formatDate(entry.rejectedAt.slice(0, 10)) || entry.rejectedAt)}` : ""}.</small>
            </div>
          ` : ""}
          ${entry.approvedAt ? `<p class="document-approved">Aprovado em ${escapeHtml(formatDate(entry.approvedAt.slice(0, 10)) || entry.approvedAt)} por ${escapeHtml(users.find((user) => user.id === entry.approvedBy)?.name || "perfil autorizado")}</p>` : ""}
        </div>
        <div class="document-actions">
          ${canRemoveRejected ? `<button class="document-danger-button small-action" type="button" data-document-remove="${escapeHtml(doc.id)}">Remover documento incorreto</button>` : ""}
          ${canUpload ? `<label class="proof-upload document-upload">${entry.status === "Recusado" ? "Enviar novo documento" : "Enviar documento"}<input type="file" accept="application/pdf,image/*,.doc,.docx,.png,.jpg,.jpeg" data-document-upload="${escapeHtml(doc.id)}" /></label>` : ""}
          ${canApprove ? `<button class="primary-button small-action" data-document-approve="${escapeHtml(doc.id)}">Aprovar</button>` : ""}
          ${canReject ? `<button class="document-danger-button small-action" type="button" data-document-reject="${escapeHtml(doc.id)}">Recusar</button>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function renderUsers() {
  if (!can("manageUsers")) {
    document.getElementById("usersView").innerHTML = `<div class="empty">Você não tem permissão para gerenciar usuários.</div>`;
    return;
  }
  renderUsersTable();
  renderUserUnitFields();
  renderPermissionsMatrix();
}

function renderUserUnitFields() {
  const role = document.getElementById("userRoleInput")?.value || "Franqueado";
  const select = document.getElementById("userUnitSelect");
  const existingLabel = document.getElementById("userExistingUnitLabel");
  const newLabel = document.getElementById("userNewUnitLabel");
  const notice = document.getElementById("userGlobalUnitNotice");
  const isFranchisee = role === "Franqueado";
  if (!select || !existingLabel || !newLabel || !notice) return;
  const current = select.value;
  select.innerHTML = `<option value="">Criar uma nova unidade</option>` + units
    .filter((unit) => unit.active && !isImplementationArchived(unit))
    .map((unit) => `<option value="${escapeHtml(unit.id)}" ${unit.franchiseeUserId ? "disabled" : ""}>${escapeHtml(unit.name)}${unit.franchiseeUserId ? ` · vinculada a ${escapeHtml(unitOwnerName(unit))}` : " · disponível"}</option>`)
    .join("");
  select.value = units.some((unit) => unit.id === current && unit.active) ? current : "";
  existingLabel.hidden = !isFranchisee;
  newLabel.hidden = !isFranchisee || Boolean(select.value);
  notice.hidden = isFranchisee;
}

function renderUsersTable() {
  const body = document.querySelector("#usersTable tbody");
  body.innerHTML = users.map((user) => `
    <tr data-user-id="${escapeHtml(user.id)}">
      <td><input class="cell-input" data-user-field="name" value="${escapeAttr(user.name)}" /></td>
      <td><input class="cell-input" data-user-field="email" value="${escapeAttr(user.email)}" /></td>
      <td><input class="cell-input" data-user-field="phone" value="${escapeAttr(user.phone)}" placeholder="31999999999" /></td>
      <td>${userRoleSelect(user.role)}</td>
      <td>${unitSelect(user)}</td>
      <td><span class="password-protected">Protegida no servidor</span></td>
      <td><span class="badge ${user.active ? "done" : "cancel"}">${user.active ? "Ativo" : "Inativo"}</span></td>
      <td>
        <button class="ghost-button small-action" data-user-action="copy-access" title="Copiar link, login e senha para enviar">Copiar 1º acesso</button>
        <button class="ghost-button small-action" data-user-action="invite">Enviar acesso</button>
        <button class="ghost-button small-action" data-user-action="toggle">${user.active ? "Desativar" : "Ativar"}</button>
        <button class="ghost-button small-action" data-user-action="impersonate" ${user.active ? "" : "disabled"}>Usar</button>
      </td>
    </tr>
  `).join("");
}

function userRoleSelect(role) {
  return `<select class="cell-select" data-user-field="role">${Object.keys(ROLE_PERMISSIONS).map((option) => `<option value="${escapeHtml(option)}" ${option === role ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>`;
}

function unitSelect(user) {
  if (isGlobalUnitRole(user.role)) {
    return `<span class="all-units-badge">Todas as unidades</span>`;
  }
  return `<select class="cell-select" data-user-field="unitId">
    <option value="">Sem unidade</option>
    ${units.filter((unit) => unit.active).map((unit) => `<option value="${escapeHtml(unit.id)}" ${unit.id === user.unitId ? "selected" : ""}>${escapeHtml(unit.name)}</option>`).join("")}
  </select>`;
}

function renderPermissionsMatrix() {
  const matrix = document.getElementById("permissionsMatrix");
  matrix.innerHTML = Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => `
    <section class="permission-card">
      <h4>${escapeHtml(role)}</h4>
      <div>
        ${PERMISSION_LABELS.map(([permission, label]) => {
          const allowed = permissions.views.includes(permission) || Boolean(permissions[permission]);
          return `<p class="${allowed ? "allowed" : "denied"}"><span>${allowed ? "Sim" : "Não"}</span>${escapeHtml(label)}</p>`;
        }).join("")}
      </div>
    </section>
  `).join("");
}

function updateItem(id, field, value) {
  const unit = itemsContextUnit();
  const ownUnit = currentUnit()?.id === unit?.id;
  const allowedOwnEdit = ownUnit && ((field === "valor" && can("editOwnValue")) || (field === "status" && can("changeStatus")));
  if (!can("editItems") && !allowedOwnEdit) return;
  if (field === "status" && !can("changeStatus")) return;
  const item = items.find((row) => row.id === id);
  if (!item) return;
  if (currentUser()?.role === "Franqueado" && field === "status" && !allowedStatusOptions().includes(value)) return;
  const unitScopedFields = ["fornecedor", "fornecedorLink", "valor", "quantidade", "prazo", "vencimento", "status", "prioridade"];
  if (unit && unitScopedFields.includes(field)) {
    const patch = {};
    if (field === "status") {
      patch.status = value;
      patch.done = value === "Comprado";
    } else if (field === "valor" || field === "quantidade") {
      patch[field] = toNumber(value);
    } else if (field === "fornecedorLink") {
      patch[field] = normalizeUrl(value);
    } else {
      patch[field] = value;
    }
    setChecklistEntry(unit.id, id, patch);
    markDirty();
    render();
    return;
  }
  if (field === "valor" || field === "quantidade") {
    item[field] = toNumber(value);
  } else if (field === "fornecedorLink") {
    item[field] = normalizeUrl(value);
  } else {
    item[field] = value;
  }
  markDirty();
  renderDashboard();
  if (currentView === "pending") renderPending();
  if (currentView === "alerts") renderAlerts();
  if (currentView === "purchases") renderPurchases();
  if (currentView === "categories") renderCategories();
  if (currentView === "myUnit") renderMyUnit();
  if (currentView === "units") renderUnits();
}

function exportCsv() {
  if (!can("exportData")) return alert("Seu perfil não permite exportar dados.");
  const headers = ["Categoria", "Item", "Descrição", "Fornecedor/Local", "Link Compra", "Valor Unitário", "Quantidade", "Total Estimado", "Prazo", "Vencimento", "Alerta", "Status", "Prioridade", "Observações", "Fonte", "Linha"];
  const unit = itemsContextUnit();
  const rows = items.map((item) => itemForUnit(item, unit?.id)).map((item) => [
    item.categoria,
    item.item,
    item.descricao,
    item.fornecedor,
    item.fornecedorLink,
    item.valor,
    item.quantidade,
    totalOf(item),
    item.prazo,
    item.vencimento,
    alertText(item),
    item.status,
    item.prioridade,
    item.observacoes,
    item.fonte,
    item.linha,
  ]);
  download("implanta-todos-export.csv", [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\n"), "text/csv;charset=utf-8");
}

function exportJson() {
  if (!can("exportData")) return alert("Seu perfil não permite exportar dados.");
  download("implanta-todos-export.json", JSON.stringify(appState(), null, 2), "application/json");
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function importJson(file) {
  if (!can("editItems")) return alert("Seu perfil não permite importar dados.");
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const imported = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(imported)) throw new Error("Formato inválido");
      items = imported.map(normalizeItem);
      if (Array.isArray(parsed.users) && can("manageUsers")) {
        users = parsed.users.map(normalizeUser);
        if (Array.isArray(parsed.units)) units = parsed.units.map(normalizeUnit);
        ensureAdministratorAccess();
        ensureAccountingAccess();
        ensureFranchiseeUnits();
        if (parsed.checklist && typeof parsed.checklist === "object" && !Array.isArray(parsed.checklist)) checklist = parsed.checklist;
        if (parsed.documents && typeof parsed.documents === "object" && !Array.isArray(parsed.documents)) documents = parsed.documents;
        if (parsed.itemPhotos && typeof parsed.itemPhotos === "object" && !Array.isArray(parsed.itemPhotos)) itemPhotos = parsed.itemPhotos;
        selectedUnitId = units.find((unit) => unit.id === parsed.selectedUnitId && unit.active)?.id || units.find((unit) => unit.active)?.id || "";
        activeUserId = users.find((user) => user.id === parsed.activeUserId && user.active)?.id || users.find((user) => user.role === "Administrador" && user.active)?.id || users.find((user) => user.active)?.id || users[0]?.id || "";
        localStorage.setItem(ACTIVE_USER_STORAGE_KEY, activeUserId);
        localStorage.setItem(SELECTED_UNIT_STORAGE_KEY, selectedUnitId);
        saveUsers();
        saveUnits();
        saveChecklist();
        saveDocuments();
        saveItemPhotos();
      }
      selectedIssues.clear();
      saveItems();
      render();
    } catch (error) {
      alert("Não consegui importar este JSON.");
    }
  };
  reader.readAsText(file, "utf-8");
}

function sum(rows, fn) {
  return rows.reduce((acc, row) => acc + (Number(fn(row)) || 0), 0);
}

function truncate(text, length) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function formatDate(dateIso) {
  if (!dateIso) return "";
  const [year, month, day] = dateIso.split("-");
  if (!year || !month || !day) return "";
  return `${day}/${month}/${year}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

document.querySelectorAll(".nav-item").forEach((btn) => btn.addEventListener("click", () => setView(btn.dataset.view)));
window.addEventListener("resize", fitKpiValues);
document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const firstAccessToken = new URLSearchParams(window.location.search).get("firstAccess");
  const email = document.getElementById("loginEmailInput").value.trim().toLowerCase();
  const password = document.getElementById("loginPasswordInput").value;
  const message = document.getElementById("loginMessage");
  message.textContent = "";

  if (firstAccessToken && API_ENABLED) {
    const confirmation = document.getElementById("loginPasswordConfirmInput").value;
    if (password !== confirmation) {
      message.textContent = "As senhas não coincidem.";
      return;
    }
    const response = await apiFetch("/api/auth/first-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: firstAccessToken, password }),
    });
    const result = await response.json();
    message.textContent = response.ok ? "Senha criada. Agora entre com seu e-mail e a nova senha." : (result.error || "Não foi possível criar a senha.");
    if (response.ok) {
      window.history.replaceState({}, "", window.location.pathname);
      configureLoginMode();
      document.getElementById("loginPasswordInput").value = "";
      document.getElementById("loginPasswordConfirmInput").value = "";
    }
    return;
  }

  if (API_ENABLED) {
    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();
    if (!response.ok) {
      message.textContent = result.error || "Login ou senha inválidos.";
      return;
    }
    csrfToken = result.csrfToken || "";
    authenticatedUserId = result.user.id;
    activeUserId = result.user.id;
    localStorage.setItem(AUTH_USER_STORAGE_KEY, authenticatedUserId);
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, activeUserId);
    await loadRemoteState();
    currentView = fallbackView();
    applyAuthState();
    render();
    return;
  }

  const user = users.find((candidate) => candidate.active && candidate.email.toLowerCase() === email && candidate.password === password);
  if (!user) {
    message.textContent = "Login ou senha inválidos.";
    return;
  }
  authenticatedUserId = user.id;
  localStorage.setItem(AUTH_USER_STORAGE_KEY, authenticatedUserId);
  activeUserId = user.id;
  localStorage.setItem(ACTIVE_USER_STORAGE_KEY, activeUserId);
  currentView = fallbackView();
  applyAuthState();
  render();
});
document.getElementById("logoutBtn").addEventListener("click", async () => {
  if (API_ENABLED) await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  csrfToken = "";
  authenticatedUserId = "";
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  applyAuthState();
});
document.getElementById("saveBtn").addEventListener("click", saveAll);
document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
document.getElementById("resetBtn").addEventListener("click", () => {
  if (!can("resetData")) return alert("Seu perfil não permite restaurar a base.");
  if (confirm("Restaurar a base original do app?")) {
    localStorage.removeItem(STORAGE_KEY);
    items = baseData.items.map(normalizeItem);
    selectedIssues.clear();
    saveItems();
    render();
  }
});
document.getElementById("activeUserSelect").addEventListener("change", (event) => {
  activeUserId = event.target.value;
  localStorage.setItem(ACTIVE_USER_STORAGE_KEY, activeUserId);
  if (!canView(currentView)) currentView = fallbackView();
  render();
});
document.getElementById("importJsonInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) importJson(file);
  event.target.value = "";
});

["searchInput", "categoryFilter", "statusFilter", "priorityFilter"].forEach((id) => {
  document.getElementById(id).addEventListener("input", renderItemsTable);
});
document.getElementById("itemsUnitFilter").addEventListener("input", (event) => {
  selectedItemsUnitId = event.target.value;
  selectedUnitId = selectedItemsUnitId || selectedUnitId;
  localStorage.setItem(SELECTED_UNIT_STORAGE_KEY, selectedUnitId);
  renderItemsTable();
  renderDashboard();
});
document.getElementById("categorySort").addEventListener("input", renderCategoryBars);
document.getElementById("pendingSearchInput").addEventListener("input", renderPending);
document.getElementById("alertSearchInput").addEventListener("input", renderAlerts);
document.getElementById("alertFilter").addEventListener("input", renderAlerts);
document.getElementById("dashboardUnitProgress").addEventListener("click", (event) => {
  const button = event.target.closest("[data-dashboard-unit]");
  if (!button || !can("viewAllUnits")) return;
  selectedUnitId = button.dataset.dashboardUnit;
  localStorage.setItem(SELECTED_UNIT_STORAGE_KEY, selectedUnitId);
  setView("units");
});

["myUnitSearchInput", "myUnitCategoryFilter", "myUnitStatusFilter"].forEach((id) => {
  document.getElementById(id).addEventListener("input", renderMyUnit);
});
document.getElementById("myUnitSelector").addEventListener("change", (event) => {
  if (!can("viewAllUnits")) return;
  selectedUnitId = event.target.value;
  selectedItemsUnitId = selectedUnitId;
  localStorage.setItem(SELECTED_UNIT_STORAGE_KEY, selectedUnitId);
  renderMyUnit();
});
document.getElementById("myUnitComparisonBody").addEventListener("click", (event) => {
  const button = event.target.closest("[data-my-unit-select]");
  if (!button || !can("viewAllUnits")) return;
  selectedUnitId = button.dataset.myUnitSelect;
  selectedItemsUnitId = selectedUnitId;
  localStorage.setItem(SELECTED_UNIT_STORAGE_KEY, selectedUnitId);
  renderMyUnit();
});
document.getElementById("unitsSearchInput").addEventListener("input", renderUnits);
document.getElementById("selectedUnitCategoryFilter").addEventListener("input", renderUnits);
document.getElementById("createUnitBtn").addEventListener("click", () => {
  if (!can("manageUnits")) return alert("Seu perfil não permite criar unidades.");
  const name = prompt("Nome da nova unidade:");
  if (!name || !name.trim()) return;
  const unit = createUnit(name.trim());
  selectedUnitId = unit.id;
  saveUnits();
  localStorage.setItem(SELECTED_UNIT_STORAGE_KEY, selectedUnitId);
  render();
});

document.getElementById("unitsOverview").addEventListener("click", (event) => {
  const button = event.target.closest("[data-select-unit]");
  if (!button) return;
  selectedUnitId = button.dataset.selectUnit;
  localStorage.setItem(SELECTED_UNIT_STORAGE_KEY, selectedUnitId);
  renderUnits();
});

document.getElementById("selectedUnitCompletionActions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-complete-implementation]");
  if (!button) return;
  const unit = units.find((candidate) => candidate.id === button.dataset.completeImplementation);
  if (!canArchiveImplementation(unit)) return;
  if (!confirm(`Concluir e arquivar a implantação de ${unit.name}? Ela deixará de somar nos dashboards, mas permanecerá no histórico.`)) return;
  unit.implementationArchivedAt = new Date().toISOString();
  unit.implementationArchivedBy = currentUser()?.id || "";
  saveUnits();
  saveRemoteState();
  selectedUnitId = operationalUnits()[0]?.id || "";
  selectedItemsUnitId = selectedUnitId;
  localStorage.setItem(SELECTED_UNIT_STORAGE_KEY, selectedUnitId);
  render();
});

function handleChecklistInput(event) {
  const control = event.target.closest("[data-checklist-field]");
  if (!control) return;
  const row = event.target.closest("[data-unit-id][data-item-id]");
  if (!row) return;
  const unitId = row.dataset.unitId;
  const unit = units.find((candidate) => candidate.id === unitId);
  if (isImplementationArchived(unit)) return alert("Esta implantação está arquivada e disponível apenas para histórico.");
  const ownUnit = currentUnit()?.id === unitId;
  if (!(can("updateAnyChecklist") || (ownUnit && can("updateOwnChecklist")))) return;
  const patch = control.dataset.checklistField === "done"
    ? { done: control.checked, status: control.checked ? "Comprado" : "A Comprar" }
    : { note: control.value };
  setChecklistEntry(unitId, row.dataset.itemId, patch);
  if (control.dataset.checklistField === "done") {
    renderDashboard();
    if (currentView === "myUnit") renderMyUnit();
    if (currentView === "units") renderUnits();
  }
}

document.getElementById("myUnitChecklist").addEventListener("input", handleChecklistInput);
document.getElementById("myUnitChecklist").addEventListener("change", handleChecklistInput);
document.getElementById("selectedUnitChecklist").addEventListener("input", handleChecklistInput);
document.getElementById("selectedUnitChecklist").addEventListener("change", handleChecklistInput);

async function handleProofUpload(event) {
  const input = event.target.closest("[data-proof-upload]");
  if (!input) return;
  const itemId = input.dataset.proofUpload;
  const container = input.closest("[data-unit-id]");
  const unitId = container?.dataset.unitId || itemsContextUnit()?.id;
  const file = input.files?.[0];
  if (!unitId || !file || !canUploadProofForUnit(unitId)) return;
  try {
    const uploaded = await uploadAsset(file, { unitId, kind: "proof" });
    setChecklistEntry(unitId, itemId, {
      proof: {
        ...uploaded,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser()?.id || "",
      },
      approvedAt: "",
      approvedBy: "",
      status: unitItemStatus(unitId, items.find((item) => item.id === itemId)),
      done: false,
    });
    render();
  } catch (error) {
    alert(error.message || "Não foi possível enviar o comprovante.");
  }
}

function handleProofApproval(event) {
  const button = event.target.closest("[data-proof-approve]");
  if (!button) return;
  const itemId = button.dataset.proofApprove;
  const container = button.closest("[data-unit-id]");
  const unitId = container?.dataset.unitId || itemsContextUnit()?.id;
  if (!unitId || !canApproveProofForUnit(unitId)) return;
  const entry = checklistEntry(unitId, itemId);
  if (!entry.proof) return alert("Este item ainda não tem foto enviada.");
  setChecklistEntry(unitId, itemId, {
    status: "Comprado",
    done: true,
    approvedAt: new Date().toISOString(),
    approvedBy: currentUser()?.id || "",
  });
  render();
}

document.getElementById("myUnitChecklist").addEventListener("change", handleProofUpload);
document.getElementById("selectedUnitChecklist").addEventListener("change", handleProofUpload);
document.getElementById("myUnitChecklist").addEventListener("click", handleProofApproval);
document.getElementById("selectedUnitChecklist").addEventListener("click", handleProofApproval);

function handleItemsTableEdit(event) {
  const control = event.target.closest("[data-field]");
  if (!control) return;
  const row = event.target.closest("tr");
  updateItem(row.dataset.id, control.dataset.field, control.value);
  if (control.dataset.field === "valor" || control.dataset.field === "quantidade") {
    const item = items.find((candidate) => candidate.id === row.dataset.id);
    const unit = itemsContextUnit();
    row.querySelector(".total").textContent = money.format(totalOf(itemForUnit(item, unit?.id)));
  }
  if (control.dataset.field === "vencimento" || control.dataset.field === "status") renderItemsTable();
}

document.getElementById("itemsTable").addEventListener("input", handleItemsTableEdit);
document.getElementById("itemsTable").addEventListener("change", handleItemsTableEdit);

document.getElementById("itemsTable").addEventListener("change", async (event) => {
  const input = event.target.closest("[data-proof-upload]");
  if (!input) return;
  const itemId = input.dataset.proofUpload;
  const unit = itemsContextUnit();
  const file = input.files?.[0];
  if (!unit || !file || !canUploadProofForUnit(unit.id)) return;
  try {
    const uploaded = await uploadAsset(file, { unitId: unit.id, kind: "proof" });
    setChecklistEntry(unit.id, itemId, {
      proof: {
        ...uploaded,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser()?.id || "",
      },
      approvedAt: "",
      approvedBy: "",
    });
    render();
  } catch (error) {
    alert(error.message || "Não foi possível enviar o comprovante.");
  }
});

document.getElementById("itemsTable").addEventListener("click", (event) => {
  const photoButton = event.target.closest("[data-view-item-photo]");
  if (photoButton) {
    openItemPhoto(photoButton.dataset.viewItemPhoto);
    return;
  }
  const removeButton = event.target.closest("[data-item-photo-remove]");
  if (removeButton) {
    if (!can("manageItemPhotos")) return;
    const itemId = removeButton.dataset.itemPhotoRemove;
    if (!confirm("Remover a foto de referencia deste item?")) return;
    delete itemPhotos[itemId];
    saveItemPhotos();
    saveRemoteState();
    renderItemsTable();
    return;
  }
  const button = event.target.closest("[data-proof-approve]");
  if (!button) return;
  const itemId = button.dataset.proofApprove;
  const unit = itemsContextUnit();
  if (!unit || !canApproveProofForUnit(unit.id)) return;
  const entry = checklistEntry(unit.id, itemId);
  if (!entry.proof) return alert("Este item ainda não tem foto enviada.");
  setChecklistEntry(unit.id, itemId, {
    status: "Comprado",
    done: true,
    approvedAt: new Date().toISOString(),
    approvedBy: currentUser()?.id || "",
  });
  render();
});

document.getElementById("itemsTable").addEventListener("change", async (event) => {
  const input = event.target.closest("[data-item-photo-upload]");
  if (!input || !can("manageItemPhotos")) return;
  const itemId = input.dataset.itemPhotoUpload;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const uploaded = await uploadAsset(file, { kind: "item-photo" });
    itemPhotos[itemId] = {
      ...uploaded,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser()?.id || "",
    };
    saveItemPhotos();
    saveRemoteState();
    renderItemsTable();
  } catch (error) {
    alert(error.message || "Não foi possível enviar a foto.");
  }
});

document.getElementById("itemPhotoModal").addEventListener("click", (event) => {
  if (event.target.closest("[data-close-item-photo]")) closeItemPhotoModal();
});

document.getElementById("documentGuidanceModal")?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-document-guidance]")) closeDocumentGuidanceModal();
});

document.getElementById("saveDocumentGuidanceBtn")?.addEventListener("click", () => {
  if (!can("manageDocumentGuidance")) return;
  const editor = document.getElementById("documentGuidanceText");
  const documentId = editor.dataset.documentId;
  if (!documentId) return;
  const value = editor.value.trim();
  if (!value) return alert("A orientação não pode ficar vazia.");
  documentGuidance[documentId] = value;
  saveDocumentGuidance();
  saveRemoteState();
  closeDocumentGuidanceModal();
  renderDocuments();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.getElementById("itemPhotoModal").classList.contains("is-visible")) {
    closeItemPhotoModal();
  }
  if (event.key === "Escape" && document.getElementById("documentGuidanceModal")?.classList.contains("is-visible")) {
    closeDocumentGuidanceModal();
  }
  if (event.key === "Escape" && document.getElementById("documentRejectionModal")?.classList.contains("is-visible")) {
    closeDocumentRejectionModal();
  }
});

document.getElementById("pendingList").addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-issue]");
  if (!checkbox) return;
  if (checkbox.checked) selectedIssues.add(checkbox.dataset.issue);
  else selectedIssues.delete(checkbox.dataset.issue);
});

document.getElementById("markSelectedDefBtn").addEventListener("click", () => {
  if (!can("changeStatus")) return alert("Seu perfil não permite alterar status.");
  if (!selectedIssues.size) return;
  items.forEach((item) => {
    if (selectedIssues.has(item.id)) item.status = "Cotando";
  });
  selectedIssues.clear();
  markDirty();
  render();
});

document.getElementById("alertsList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-alert-id]");
  if (!button) return;
  const item = items.find((row) => row.id === button.dataset.alertId);
  if (!item) return;
  if (button.dataset.days) {
    if (!can("editItems")) return alert("Seu perfil não permite alterar vencimentos.");
    const base = item.vencimento && daysUntil(item.vencimento) !== null ? new Date(`${item.vencimento}T00:00:00`) : new Date(`${todayIso()}T00:00:00`);
    base.setDate(base.getDate() + Number(button.dataset.days));
    item.vencimento = base.toISOString().slice(0, 10);
  }
  if (button.dataset.status) {
    if (!can("changeStatus")) return alert("Seu perfil não permite alterar status.");
    item.status = button.dataset.status;
  }
  markDirty();
  render();
});

document.getElementById("userForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!can("manageUsers")) return;
  const name = document.getElementById("userNameInput").value.trim();
  const email = document.getElementById("userEmailInput").value.trim();
  const phone = document.getElementById("userPhoneInput").value.trim();
  const role = document.getElementById("userRoleInput").value;
  const existingUnitId = document.getElementById("userUnitSelect").value;
  const unitName = document.getElementById("userUnitInput").value.trim();
  if (!name || !email) return;
  if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
    return alert("Já existe um usuário com este e-mail.");
  }
  const password = generatePassword();
  const user = normalizeUser({ name, email, phone, password, mustChangePassword: true, role, active: true });
  if (role === "Franqueado") {
    const selectedUnit = units.find((unit) => unit.id === existingUnitId && unit.active);
    if (selectedUnit?.franchiseeUserId) {
      return alert("A unidade selecionada já está vinculada a outro franqueado.");
    }
    const unit = selectedUnit || createUnit(unitName || `Unidade ${name}`, user.id);
    linkFranchiseeToUnit(user, unit.id);
    saveUnits();
  } else {
    user.unitId = "";
  }
  users.push(user);
  saveUsers();
  const saved = await saveRemoteState();
  if (API_ENABLED && !saved) {
    users = users.filter((candidate) => candidate.id !== user.id);
    saveUsers();
    return alert("Não foi possível salvar o usuário no servidor.");
  }
  event.target.reset();
  render();
  await sendUserInvite(user);
});

function updateUserFromControl(event) {
  const control = event.target.closest("[data-user-field]");
  if (!control || !can("manageUsers")) return;
  const row = event.target.closest("tr");
  const user = users.find((candidate) => candidate.id === row.dataset.userId);
  if (!user) return;
  const field = control.dataset.userField;
  user[field] = control.value;
  if (field === "role") {
    if (isGlobalUnitRole(user.role)) {
      linkFranchiseeToUnit({ ...user, role: "Franqueado" }, "");
      user.unitId = "";
    } else if (user.role === "Franqueado" && !user.unitId) {
      const unit = createUnit(`Unidade ${user.name}`, user.id);
      linkFranchiseeToUnit(user, unit.id);
    }
    saveUnits();
  }
  if (field === "unitId") {
    const unit = units.find((candidate) => candidate.id === user.unitId);
    if (unit?.franchiseeUserId && unit.franchiseeUserId !== user.id) {
      control.value = "";
      user.unitId = "";
      return alert("Esta unidade já está vinculada a outro franqueado.");
    }
    linkFranchiseeToUnit(user, user.unitId);
    saveUnits();
  }
  saveUsers();
  saveRemoteState();
  renderActiveUserSelect();
  renderPermissionsMatrix();
  if (field === "role") renderUsersTable();
}

document.getElementById("userRoleInput").addEventListener("change", renderUserUnitFields);
document.getElementById("userUnitSelect").addEventListener("change", renderUserUnitFields);

document.getElementById("usersTable").addEventListener("input", updateUserFromControl);
document.getElementById("usersTable").addEventListener("change", updateUserFromControl);

document.getElementById("usersTable").addEventListener("click", (event) => {
  const button = event.target.closest("[data-user-action]");
  if (!button || !can("manageUsers")) return;
  const row = event.target.closest("tr");
  const user = users.find((candidate) => candidate.id === row.dataset.userId);
  if (!user) return;
  if (button.dataset.userAction === "toggle") {
    const activeUsers = users.filter((candidate) => candidate.active);
    if (user.active && activeUsers.length === 1) return alert("Mantenha pelo menos um usuário ativo.");
    if (user.active && user.id === activeUserId) return alert("Troque para outro usuário antes de desativar o usuário atual.");
    user.active = !user.active;
    if (!user.active && activeUserId === user.id) activeUserId = users.find((candidate) => candidate.active)?.id || "";
  }
  if (button.dataset.userAction === "impersonate" && user.active) {
    activeUserId = user.id;
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, activeUserId);
    if (!canView(currentView)) currentView = fallbackView();
  }
  if (button.dataset.userAction === "invite" && user.active) {
    sendUserInvite(user);
  }
  if (button.dataset.userAction === "copy-access" && user.active) {
    copyFirstAccess(user);
  }
  saveUsers();
  saveRemoteState();
  render();
});

["documentsSearchInput", "documentsUnitFilter", "documentsStatusFilter"].forEach((id) => {
  document.getElementById(id)?.addEventListener("input", renderDocuments);
});

document.getElementById("toggleArchivedDocumentsBtn")?.addEventListener("click", () => {
  showArchivedDocuments = !showArchivedDocuments;
  const button = document.getElementById("toggleArchivedDocumentsBtn");
  button.textContent = showArchivedDocuments ? "Voltar para documentos ativos" : "Ver arquivo documental";
  document.getElementById("documentsUnitFilter").value = "";
  renderDocuments();
});

document.getElementById("documentsFinalApprovals")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-document-final-approval]");
  if (!button) return;
  const unit = units.find((candidate) => candidate.id === button.dataset.documentFinalApproval);
  if (!unit || !canGiveDocumentFinalApproval(unit)) return;
  const role = currentUser()?.role || "";
  if (!confirm(`Registrar o OK final de ${role} para toda a documentação de ${unit.name}?`)) return;
  unit.documentFinalApprovals = {
    ...(unit.documentFinalApprovals || {}),
    [role]: { at: new Date().toISOString(), by: currentUser()?.id || "" },
  };
  const hasAdmin = Boolean(documentFinalApproval(unit, "Administrador"));
  const hasAccounting = Boolean(documentFinalApproval(unit, "Contabilidade"));
  if (hasAdmin && hasAccounting) {
    unit.documentsArchivedAt = new Date().toISOString();
    notifications = notifications.filter((notification) =>
      notification.type !== "document-upload" || notification.unitId !== unit.id
    );
    saveNotifications();
  }
  saveUnits();
  saveRemoteState();
  renderDocuments();
  if (hasAdmin && hasAccounting) {
    alert(`Documentação de ${unit.name} finalizada e movida para o arquivo documental.`);
  }
});

document.getElementById("documentsList")?.addEventListener("change", async (event) => {
  const control = event.target.closest("[data-document-field]");
  if (!control || !can("manageDocuments")) return;
  const row = control.closest("[data-unit-id][data-document-id]");
  if (!row) return;
  const field = control.dataset.documentField;
  const value = control.value;
  const patch = {};
  if (field === "status" && value === "Concluido" && !documentEntry(row.dataset.unitId, row.dataset.documentId).approvedAt) {
    control.value = documentEntry(row.dataset.unitId, row.dataset.documentId).status;
    return alert("Para concluir, aprove o documento enviado.");
  }
  patch[field] = field === "vencimento" ? normalizeDate(value) : value;
  setDocumentEntry(row.dataset.unitId, row.dataset.documentId, patch);
  markDirty();
  renderDocuments();
});

document.getElementById("documentsList")?.addEventListener("change", async (event) => {
  const input = event.target.closest("[data-document-upload]");
  if (!input) return;
  const row = input.closest("[data-unit-id][data-document-id]");
  const unitId = row?.dataset.unitId;
  const documentId = input.dataset.documentUpload;
  const file = input.files?.[0];
  if (!unitId || !file || !canUploadDocumentForUnit(unitId)) return;
  try {
    const uploaded = await uploadAsset(file, { unitId, kind: "document" });
    setDocumentEntry(unitId, documentId, {
      status: "Processando",
      file: {
        ...uploaded,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser()?.id || "",
      },
      approvedAt: "",
      approvedBy: "",
      rejectedAt: "",
      rejectedBy: "",
      rejectionReason: "",
    });
    const unit = units.find((candidate) => candidate.id === unitId);
    const documentType = DOCUMENT_TYPES.find((candidate) => candidate.id === documentId);
    const notification = createNotification({
      type: "document-upload",
      title: "Novo documento enviado",
      message: `${documentType?.name || "Documento"} enviado para análise.`,
      detail: `${unit?.name || "Unidade"} · ${unit ? unitOwnerName(unit) : "Franqueado"} · arquivo ${file.name}`,
      unitId,
      documentId,
      recipientRoles: ["Administrador", "Contabilidade"],
    });
    dispatchNotificationEmail(notification);
    renderDocuments();
  } catch (error) {
    alert(error.message || "Não foi possível enviar o documento.");
  }
});

document.getElementById("documentsList")?.addEventListener("click", (event) => {
  const guidanceButton = event.target.closest("[data-document-guidance]");
  if (guidanceButton) {
    openDocumentGuidance(guidanceButton.dataset.documentGuidance);
    return;
  }
  const removeButton = event.target.closest("[data-document-remove]");
  if (removeButton) {
    const row = removeButton.closest("[data-unit-id][data-document-id]");
    const unitId = row?.dataset.unitId;
    const documentId = removeButton.dataset.documentRemove;
    const entry = documentEntry(unitId, documentId);
    if (!canRemoveRejectedDocumentForUnit(unitId, entry)) return;
    if (!confirm("Remover o documento recusado? O motivo e as orientações da recusa continuarão visíveis.")) return;
    setDocumentEntry(unitId, documentId, {
      file: null,
      approvedAt: "",
      approvedBy: "",
    });
    renderDocuments();
    return;
  }
  const rejectButton = event.target.closest("[data-document-reject]");
  if (rejectButton) {
    const row = rejectButton.closest("[data-unit-id][data-document-id]");
    openDocumentRejection(row?.dataset.unitId, rejectButton.dataset.documentReject);
    return;
  }
  const button = event.target.closest("[data-document-approve]");
  if (!button) return;
  const row = button.closest("[data-unit-id][data-document-id]");
  const unitId = row?.dataset.unitId;
  const documentId = button.dataset.documentApprove;
  if (!unitId || !canApproveDocumentForUnit(unitId)) return;
  const entry = documentEntry(unitId, documentId);
  if (!assetUrl(entry.file)) return alert("Este documento ainda nao foi enviado.");
  setDocumentEntry(unitId, documentId, {
    status: "Concluido",
    approvedAt: new Date().toISOString(),
    approvedBy: currentUser()?.id || "",
    rejectedAt: "",
    rejectedBy: "",
    rejectionReason: "",
  });
  removeDocumentNotifications(unitId, documentId);
  renderDocuments();
});

document.getElementById("documentRejectionModal")?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-document-rejection]")) closeDocumentRejectionModal();
});

document.getElementById("confirmDocumentRejectionBtn")?.addEventListener("click", () => {
  const reason = document.getElementById("documentRejectionReason");
  const unitId = reason.dataset.unitId;
  const documentId = reason.dataset.documentId;
  const message = reason.value.trim();
  if (!canRejectDocumentForUnit(unitId)) return;
  if (!message) return alert("Informe o motivo da recusa e as orientações para o franqueado.");
  setDocumentEntry(unitId, documentId, {
    status: "Recusado",
    approvedAt: "",
    approvedBy: "",
    rejectedAt: new Date().toISOString(),
    rejectedBy: currentUser()?.id || "",
    rejectionReason: message,
  });
  removeDocumentNotifications(unitId, documentId);
  closeDocumentRejectionModal();
  renderDocuments();
});

async function initializeApp() {
  configureLoginMode();
  const restored = await restoreServerSession();
  if (restored) await loadRemoteState();
  if (!API_ENABLED && !isAuthenticated()) {
    authenticatedUserId = users.find((user) => user.role === "Administrador" && user.active)?.id || "";
    if (authenticatedUserId && !localStorage.getItem(AUTH_USER_STORAGE_KEY)) authenticatedUserId = "";
  }
  applyAuthState();
  if (!API_ENABLED || isAuthenticated()) saveAll();
  if (isAuthenticated()) render();
  if (API_ENABLED) window.setInterval(refreshRemoteState, 8000);
}

initializeApp();
