const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const nodes = new Map();
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { value: '', innerHTML: '', hidden: false, style: {}, addEventListener() {}, classList: { toggle() {}, contains() { return false; }, add() {}, remove() {} } });
  return nodes.get(id);
}
const data = new Map();
const context = vm.createContext({ console, Intl, Date, Set, Map, URLSearchParams, Headers, crypto: require('node:crypto').webcrypto,
  OpeningSchedule: require('./schedule'), localStorage: { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) },
  window: { location: { protocol: 'https:', search: '' }, ENXOVAL_DATA: { items: [], statuses: [], categories: [], priorities: [] }, addEventListener() {} },
  document: { getElementById: node, querySelector: node, querySelectorAll: () => [], addEventListener() {} } });
vm.runInContext(fs.readFileSync(__dirname + '/app.js', 'utf8').replace(/initializeApp\(\);\s*$/, ''), context);
vm.runInContext(`
users = [normalizeUser({id:'admin', role:'Administrador', active:true})];
activeUserId = authenticatedUserId = 'admin';
units = [normalizeUnit({id:'unit-a', name:'Unidade A', active:true, plannedOpeningDate:'2026-12-31', documentLeadDays:10})];
items = [normalizeItem({id:'item-a', item:'Obra', prazo:'15 DIAS'})];
checklist = {}; documents = {}; selectedUnitId = 'unit-a';
refreshOpeningSchedule(); renderDashboardUnitFilter(); renderOpeningNotice();
`, context);
assert.match(nodes.get('dashboardUnitFilter').innerHTML, /Unidade A/);
assert.match(nodes.get('openingScheduleNotice').innerHTML, /31\/12\/2026/);
assert.equal(vm.runInContext("appState().documents['unit-a::doc-01'].vencimento", context), '2026-12-21');
assert.equal(vm.runInContext("appState().documents['unit-a::doc-01'].status", context), 'Solicitado');
assert.equal(vm.runInContext("appState().checklist['unit-a::item-a'].vencimento", context), '2026-12-16');
vm.runInContext("users=[normalizeUser({id:'owner',role:'Franqueado',unitId:'unit-a'})]; activeUserId=authenticatedUserId='owner'; renderOpeningNotice();", context);
assert.match(nodes.get('openingScheduleNotice').innerHTML, /Unidade A/);
console.log('PASS: full app loads, unit fields survive normalization, selector populated, owner notice, persisted item/document schedule');
