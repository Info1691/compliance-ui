/* Bulk Uploader — branded, no writes */

const PATHS = {
  // existing DB to merge into (bulk is in /bulk/, go up one level)
  CITATIONS_JSON: '../data/citations/citations.json'
};

// DOM
const dom = {
  fileInput: document.getElementById('fileInput'),
  pasteInput: document.getElementById('pasteInput'),
  parseBtn: document.getElementById('parseBtn'),
  clearBtn: document.getElementById('clearBtn'),
  validationSummary: document.getElementById('validationSummary'),
  previewWrap: document.getElementById('previewTableWrap'),
  overwriteConflicts: document.getElementById('overwriteConflicts'),
  sortBy: document.getElementById('sortBy'),
  mergeBtn: document.getElementById('mergeBtn'),
  mergedOutput: document.getElementById('mergedOutput'),
  downloadMergedBtn: document.getElementById('downloadMergedBtn'),
  copyMergedBtn: document.getElementById('copyMergedBtn'),
  conflictsPanel: document.getElementById('conflictsPanel')
};

// State
let existing = { timestamp: '', citations: [] };
let incoming = [];
let parseErrors = [];
let conflicts = [];

// Utils
const safeJSON = s => { try { return JSON.parse(s); } catch { return null; } };
const toArrayFromDelim = str => !str ? [] : String(str).split(';').map(s => s.trim()).filter(Boolean);
const isBooleanish = v => (typeof v === 'boolean') || v === 'true' || v === 'false';
const toBool = v => (typeof v === 'boolean') ? v : v === 'true';

function normalizeEntry(o) {
  const n = { ...o };
  n.id = (n.id || '').toString().trim();
  n.case_name = (n.case_name || '').toString().trim();
  n.citation = (n.citation || '').toString().trim();
  n.year = Number(n.year);
  n.court = (n.court || '').toString().trim();
  n.jurisdiction = (n.jurisdiction || '').toString().trim();
  n.summary = (n.summary || '').toString().trim();
  n.legal_principle = (n.legal_principle || '').toString().trim();
  n.holding = (n.holding || '').toString().trim();
  n.compliance_flags = Array.isArray(n.compliance_flags) ? n.compliance_flags : toArrayFromDelim(n.compliance_flags);
  n.key_points = Array.isArray(n.key_points) ? n.key_points : toArrayFromDelim(n.key_points);
  n.tags = Array.isArray(n.tags) ? n.tags : toArrayFromDelim(n.tags);
  n.case_link = (n.case_link && String(n.case_link).trim()) ? String(n.case_link).trim() : null;
  n.full_case_text = (n.full_case_text ?? '').toString();
  if (!isBooleanish(n.printable)) n.printable = false;
  n.printable = toBool(n.printable);
  n.breached_law_or_rule = Array.isArray(n.breached_law_or_rule) ? n.breached_law_or_rule : toArrayFromDelim(n.breached_law_or_rule);
  n.observed_conduct = (n.observed_conduct || '').toString().trim();
  n.anomaly_detected = (n.anomaly_detected || '').toString().trim();
  n.authority_basis = Array.isArray(n.authority_basis) ? n.authority_basis : toArrayFromDelim(n.authority_basis);
  n.canonical_breach_tag = (n.canonical_breach_tag || '').toString().trim();
  return n;
}
function validateEntry(n) {
  const errs = [];
  if (!/^[a-z0-9-]+$/.test(n.id)) errs.push('id must be lowercase letters, numbers, hyphens.');
  if (!n.case_name) errs.push('case_name required.');
  if (!n.citation) errs.push('citation required.');
  if (!Number.isInteger(n.year) || n.year < 1000 || n.year > 9999) errs.push('year must be a 4-digit integer.');
  return errs;
}
function renderPreviewTable(items) {
  if (!items.length) { dom.previewWrap.innerHTML = ''; return; }
  const headers = ['id','case_name','citation','year','court','jurisdiction','printable'];
  const th = headers.map(h => `<th>${h}</th>`).join('');
  const rows = items.map(n => `
    <tr>
      <td>${n.id}</td>
      <td>${n.case_name}</td>
      <td>${n.citation}</td>
      <td>${n.year}</td>
      <td>${n.court}</td>
      <td>${n.jurisdiction}</td>
      <td>${n.printable ? 'true' : 'false'}</td>
    </tr>
  `).join('');
  dom.previewWrap.innerHTML = `
    <div class="table-scroll">
      <table class="table">
        <thead><tr>${th}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
function showValidationReport() {
  if (!parseErrors.length) {
    dom.validationSummary.innerHTML = `<div class="ok">Parsed ${incoming.length} item(s). No validation errors.</div>`;
    return;
  }
  const list = parseErrors.map(e => `<li><strong>#${e.index}</strong>: ${e.message}</li>`).join('');
  dom.validationSummary.innerHTML = `<div class="err"><p>Validation errors:</p><ul>${list}</ul></div>`;
}
function showConflicts() {
  if (!conflicts.length) { dom.conflictsPanel.innerHTML = ''; return; }
  const list = conflicts.map(c => `
    <li>
      <strong>${c.id}</strong> already exists.
      <details>
        <summary>Compare</summary>
        <pre>${JSON.stringify({existing: c.existing, incoming: c.incoming}, null, 2)}</pre>
      </details>
    </li>
  `).join('');
  dom.conflictsPanel.innerHTML = `<div class="warn"><p>Conflicts: ${conflicts.length}</p><ul>${list}</ul></div>`;
}

// Parsing
function parseCSV(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    let cur = '', inQ = false; const cells = [];
    for (const ch of row) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cells.push(cur); cur=''; continue; }
      cur += ch;
    }
    cells.push(cur);
    const obj = {};
    headers.forEach((h, k) => obj[h] = (cells[k] ?? '').trim());
    out.push(obj);
  }
  return out;
}
function parseInputString(str) {
  const asJSON = safeJSON(str);
  if (Array.isArray(asJSON)) return asJSON;
  if (str.includes(',') && str.toLowerCase().includes('id')) return parseCSV(str);
  return null;
}

// Load existing DB
async function loadExisting() {
  const res = await fetch(PATHS.CITATIONS_JSON, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${PATHS.CITATIONS_JSON}: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const citations = Array.isArray(data) ? data : (Array.isArray(data?.citations) ? data.citations : null);
  if (!citations) throw new Error('citations.json must be an array or { citations: [...] }');
  existing = { timestamp: data.timestamp || '', citations };
}

// Merge
function generateMerged(overwrite = false, sortBy = 'case_name') {
  const index = new Map(existing.citations.map((e, i) => [e.id, i]));
  conflicts = [];
  const merged = JSON.parse(JSON.stringify(existing));
  incoming.forEach(n => {
    if (index.has(n.id)) {
      const i = index.get(n.id);
      if (overwrite) merged.citations[i] = n;
      else conflicts.push({ id: n.id, existing: merged.citations[i], incoming: n });
    } else {
      merged.citations.push(n);
      index.set(n.id, merged.citations.length - 1);
    }
  });
  merged.citations.sort((a,b) => {
    if (sortBy === 'year') return (a.year||0) - (b.year||0) || a.case_name.localeCompare(b.case_name);
    if (sortBy === 'id') return a.id.localeCompare(b.id);
    return a.case_name.localeCompare(b.case_name);
  });
  merged.timestamp = new Date().toISOString();
  return merged;
}

// Events
dom.clearBtn.addEventListener('click', () => {
  dom.fileInput.value = '';
  dom.pasteInput.value = '';
  dom.validationSummary.innerHTML = '';
  dom.previewWrap.innerHTML = '';
  dom.mergedOutput.value = '';
  dom.conflictsPanel.innerHTML = '';
  incoming = []; parseErrors = []; conflicts = [];
});

dom.parseBtn.addEventListener('click', async () => {
  parseErrors = []; conflicts = [];
  dom.validationSummary.innerHTML = 'Parsing...';
  try { await loadExisting(); }
  catch (e) { dom.validationSummary.innerHTML = `<div class="err">Failed loading existing citations: ${e.message}</div>`; return; }

  let rawItems = [];
  const file = dom.fileInput.files?.[0];
  if (file) {
    const text = await file.text();
    const parsed = parseInputString(text);
    if (!parsed) { dom.validationSummary.innerHTML = `<div class="err">Unsupported file content. Provide JSON array or CSV.</div>`; return; }
    rawItems = parsed;
  } else {
    const pasted = dom.pasteInput.value.trim();
    if (!pasted) { dom.validationSummary.innerHTML = `<div class="err">No input provided. Upload a file or paste data.</div>`; return; }
    const parsed = parseInputString(pasted);
    if (!parsed) { dom.validationSummary.innerHTML = `<div class="err">Unsupported pasted content. Provide JSON array or CSV.</div>`; return; }
    rawItems = parsed;
  }

  incoming = [];
  rawItems.forEach((o, idx) => {
    const n = normalizeEntry(o);
    const errs = validateEntry(n);
    if (errs.length) parseErrors.push({ index: idx + 1, message: errs.join(' ') });
    else incoming.push(n);
  });

  renderPreviewTable(incoming);
  showValidationReport();
});

dom.mergeBtn.addEventListener('click', () => {
  if (!incoming.length) { dom.mergedOutput.value = ''; dom.validationSummary.innerHTML = `<div class="err">Nothing to merge. Parse inputs first.</div>`; return; }
  const overwrite = !!dom.overwriteConflicts.checked;
  const sortBy = dom.sortBy.value;
  const merged = generateMerged(overwrite, sortBy);
  showConflicts();
  dom.mergedOutput.value = JSON.stringify(merged, null, 2);
});

dom.downloadMergedBtn.addEventListener('click', () => {
  const text = dom.mergedOutput.value.trim();
  if (!text) return;
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'citations.merged.json' });
  document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
});

dom.copyMergedBtn.addEventListener('click', async () => {
  const text = dom.mergedOutput.value.trim();
  if (!text) return;
  try { await navigator.clipboard.writeText(text); alert('Merged JSON copied to clipboard.'); }
  catch { dom.mergedOutput.select(); document.execCommand('copy'); alert('Merged JSON copied.'); }
});
