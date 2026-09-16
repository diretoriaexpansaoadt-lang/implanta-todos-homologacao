(function (root) {
  'use strict';
  const DAY = 86400000;
  function validDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  }
  function today() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }
  function shift(date, days) { return new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10); }
  function distance(a, b) { return Math.round((Date.parse(a) - Date.parse(b)) / DAY); }
  function lead(value) {
    const match = /^\s*(\d+)\s*(?:DIAS?)?\s*$/i.exec(String(value ?? ''));
    return match && Number(match[1]) <= 3650 ? Number(match[1]) : null;
  }
  function rows(state, unit) {
    const opening = unit.plannedOpeningDate;
    if (!validDate(opening)) return [];
    const items = (state.items || []).map(item => {
      const key = `${unit.id}::${item.id}`;
      const entry = state.checklist?.[key] || {};
      const days = lead(entry.prazo ?? item.prazo ?? item.Prazo);
      return { key, kind: 'item', name: item.item || item.Item || 'Item', entry, days,
        due: days === null ? '' : shift(opening, -days), done: Boolean(entry.done || entry.status === 'Comprado' || entry.status === 'Cancelado') };
    });
    const documentNames = ['Alvará de Vigilância Sanitária', 'Alvará de localização e funcionamento', 'Alvará do Corpo de Bombeiros', 'Cartão CNPJ', 'Certidão Federal', 'Regularidade do FGTS', 'Certidão Municipal', 'Certidão do TJ', 'Certificado Digital', 'Contrato Social', 'Contrato de aluguel', 'Inscrição Estadual e Municipal', 'Registro do Conselho de Fonoaudiologia'];
    const documents = documentNames.map((name, index) => {
      const id = `doc-${String(index + 1).padStart(2, '0')}`;
      const key = `${unit.id}::${id}`;
      const entry = state.documents?.[key] || {};
      const days = lead(entry.prazo) ?? lead(unit.documentLeadDays);
      return { key, kind: 'document', name, entry, days,
        due: days === null ? '' : shift(opening, -days), done: entry.status === 'Concluido' && Boolean(entry.approvedAt) };
    });
    return [...items, ...documents];
  }
  function forecast(state, unit, date = today()) {
    const tasks = rows(state, unit);
    let delay = 0;
    for (const task of tasks) {
      if (!task.due) continue;
      const completed = task.entry.scheduleCompletedOn;
      const reference = task.done ? (validDate(completed) ? completed : task.due) : date;
      delay = Math.max(delay, distance(reference, task.due));
    }
    return { planned: unit.plannedOpeningDate || '', date: validDate(unit.plannedOpeningDate) ? shift(unit.plannedOpeningDate, delay) : '', delay,
      missing: tasks.filter(task => !task.due).length, tasks };
  }
  function apply(state, date = today()) {
    state.checklist ||= {};
    state.documents ||= {};
    for (const unit of state.units || []) {
      if (unit.active === false || unit.implementationArchivedAt || !validDate(unit.plannedOpeningDate)) continue;
      for (const task of rows(state, unit)) {
        const target = task.kind === 'item' ? state.checklist : state.documents;
        const entry = task.kind === 'document' ? { status: 'Solicitado', prazo: '', note: '', file: null, ...task.entry } : { ...task.entry };
        // Completion dates are fixed on first observation, never moved by later notes.
        if (task.done) entry.scheduleCompletedOn ||= date;
        else delete entry.scheduleCompletedOn;
        if (task.due) entry.vencimento = task.due;
        target[task.key] = entry;
      }
      const result = forecast(state, unit, date);
      unit.adjustedOpeningDate = result.date;
      unit.openingDelayDays = result.delay;
    }
    return state;
  }
  const api = { validDate, today, shift, distance, lead, rows, forecast, apply };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OpeningSchedule = api;
})(typeof window !== 'undefined' ? window : globalThis);
