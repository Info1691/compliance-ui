/* ===============================
   Citations Viewer (Forensic Mode)
   =============================== */

// ---- Configurable Paths ----
const PATHS = {
  CITATIONS_JSON: '/data/citations/citations.json', // adjust if needed
  BREACHES_JSON:  '/data/breaches/breaches.json',   // adjust if needed
  LOGO_SRC:       'assets/logo-white-bg.png'
};

// ---- State ----
let citationsData = { timestamp: '', citations: [] };
let indexById = new Map();
let currentIndex = 0;
let breachSuggestions = [];

// ---- DOM ----
const els = {
  logo: document.getElementById('appLogo'),
  card: document.getElementById('citationCard'),
  prev: document.getElementById('prevBtn'),
  next: document.getElementById('nextBtn'),
  edit: document.getElementById('editBtn'),
  print: document.getElementById('printBtn'),
  exportBtn: document.getElementById('exportBtn'),
  drawer: document.getElementById('drawer'),
  drawerClose: document.getElementById('drawerCloseBtn'),
  drawerTitle: document.getElementById('drawerTitle'),
  form: document.getElementById('citationForm'),
  datalist: document.getElementById('breachTagSuggestions'),
  // Form fields
  f: {
    id: document.getElementById('f_id'),
    case_name: document.getElementById('f_case_name'),
    citation: document.getElementById('f_citation'),
    year: document.getElementById('f_year'),
    court: document.getElementById('f_court'),
    jurisdiction: document.getElementById('f_jurisdiction'),
    summary: document.getElementById('f_summary'),
    legal_principle: document.getElementById('f_legal_principle'),
    holding: document.getElementById('f_holding'),
    compliance_flags: document.getElementById('f_compliance_flags'),
    key_points: document.getElementById('f_key_points'),
    tags: document.getElementById('f_tags'),
    case_link: document.getElementById('f_case_link'),
    full_case_text: document.getElementById('f_full_case_text'),
    printable: document.getElementById('f_printable'),
    breached_law_or_rule: document.getElementById('f_breached_law_or_rule'),
    observed_conduct: document.getElementById('f_observed_conduct'),
    anomaly_detected: document.getElementById('f_anomaly_detected'),
    authority_basis: document.getElementById('f_authority_basis'),
    canonical_breach_tag: document.getElementById('f_canonical_breach_tag')
  },
  resetFormBtn: document.getElementById('resetFormBtn')
};

// ---- Utilities ----
function toArrayFromDelim(str) {
  if (!str) return [];
  return str.split(';').map(s => s.trim()).filter(Boolean);
}
function toDelimited(arr) {
  return (Array.isArray(arr) ? arr : []).join('; ');
}
function safeHTML(s) { return (s ?? '').toString(); }
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function buildIndex() {
  indexById.clear();
  citationsData.citations.forEach((c, i) => indexById.set(c.id, i));
}

function renderCurrent() {
  if (!citationsData.citations.length) {
    els.card.innerHTML = `<p>No citations loaded.</p>`;
    return;
  }
  const c = citationsData.citations[currentIndex];

  const fieldsHTML = `
    <h2>${safeHTML(c.case_name)}</h2>
    <div class="meta">
      <div><strong>Citation:</strong> ${safeHTML(c.citation)}</div>
      <div><strong>Year:</strong> ${safeHTML(c.year)}</div>
      <div><strong>Court:</strong> ${safeHTML(c.court)}</div>
      <div><strong>Jurisdiction:</strong> ${safeHTML(c.jurisdiction)}</div>
    </div>

    ${c.summary ? `<h3>Summary</h3><p>${safeHTML(c.summary)}</p>` : ''}

    <div class="grid-two">
      ${c.legal_principle ? `<div><h4>Legal Principle</h4><p>${safeHTML(c.legal_principle)}</p></div>` : ''}
      ${c.holding ? `<div><h4>Holding</h4><p>${safeHTML(c.holding)}</p></div>` : ''}
    </div>

    <div class="chips">
      ${Array.isArray(c.compliance_flags) && c.compliance_flags.length
        ? `<div><strong>Compliance Flags:</strong> ${c.compliance_flags.map(s => `<span class="chip">${safeHTML(s)}</span>`).join(' ')}</div>` : ''}
      ${Array.isArray(c.key_points) && c.key_points.length
        ? `<div><strong>Key Points:</strong> ${c.key_points.map(s => `<span class="chip">${safeHTML(s)}</span>`).join(' ')}</div>` : ''}
      ${Array.isArray(c.tags) && c.tags.length
        ? `<div><strong>Tags:</strong> ${c.tags.map(s => `<span class="chip">${safeHTML(s)}</span>`).join(' ')}</div>` : ''}
    </div>

    <div class="links">
      ${c.case_link ? `<a href="${safeHTML(c.case_link)}" target="_blank" rel="noopener">View Case</a>` : ''}
      ${c.printable ? `<span class="printable-flag">Printable</span>` : ''}
    </div>

    ${c.full_case_text ? `<details><summary>Full Case Text</summary><pre class="fulltext">${safeHTML(c.full_case_text)}</pre></details>` : ''}

    <details>
      <summary>Extended Compliance</summary>
      <div class="grid-two">
        <div>
          <h4>Breached Law or Rule</h4>
          <ul>${(c.breached_law_or_rule || []).map(s => `<li>${safeHTML(s)}</li>`).join('')}</ul>
        </div>
        <div>
          <h4>Authority Basis</h4>
          <ul>${(c.authority_basis || []).map(s => `<li>${safeHTML(s)}</li>`).join('')}</ul>
        </div>
      </div>
      ${c.observed_conduct ? `<h4>Observed Conduct</h4><p>${safeHTML(c.observed_conduct)}</p>` : ''}
      ${c.anomaly_detected ? `<h4>Anomaly Detected</h4><p>${safeHTML(c.anomaly_detected)}</p>` : ''}
      ${c.canonical_breach_tag ? `<p><strong>Canonical Tag:</strong> ${safeHTML(c.canonical_breach_tag)}</p>` : ''}
    </details>
  `;

  els.card.innerHTML = fieldsHTML;
}

function openDrawer(modeTitle = 'Edit Citation') {
  els.drawerTitle.textContent = modeTitle;
  els.drawer.classList.add('open');
}
function closeDrawer() { els.drawer.classList.remove('open'); }

function populateFormFromCitation(c) {
  els.f.id.value = c.id || '';
  els.f.case_name.value = c.case_name || '';
  els.f.citation.value = c.citation || '';
  els.f.year.value = c.year ?? '';
  els.f.court.value = c.court || '';
  els.f.jurisdiction.value = c.jurisdiction || '';
  els.f.summary.value = c.summary || '';
  els.f.legal_principle.value = c.legal_principle || '';
  els.f.holding.value = c.holding || '';
  els.f.compliance_flags.value = toDelimited(c.compliance_flags);
  els.f.key_points.value = toDelimited(c.key_points);
  els.f.tags.value = toDelimited(c.tags);
  els.f.case_link.value = c.case_link || '';
  els.f.full_case_text.value = c.full_case_text || '';
  els.f.printable.checked = !!c.printable;
  els.f.breached_law_or_rule.value = toDelimited(c.breached_law_or_rule);
  els.f.observed_conduct.value = c.observed_conduct || '';
  els.f.anomaly_detected.value = c.anomaly_detected || '';
  els.f.authority_basis.value = toDelimited(c.authority_basis);
  els.f.canonical_breach_tag.value = c.canonical_breach_tag || '';
}

function formToCitation() {
  // Required validation
  if (!els.f.id.checkValidity() || !els.f.case_name.checkValidity() || !els.f.citation.checkValidity() || !els.f.year.checkValidity()) {
    els.form.reportValidity();
    return null;
  }

  const obj = {
    id: els.f.id.value.trim(),
    case_name: els.f.case_name.value.trim(),
    citation: els.f.citation.value.trim(),
    year: Number(els.f.year.value),
    court: els.f.court.value.trim() || '',
    jurisdiction: els.f.jurisdiction.value.trim() || '',
    summary: els.f.summary.value.trim() || '',
    legal_principle: els.f.legal_principle.value.trim() || '',
    holding: els.f.holding.value.trim() || '',
    compliance_flags: toArrayFromDelim(els.f.compliance_flags.value),
    key_points: toArrayFromDelim(els.f.key_points.value),
    tags: toArrayFromDelim(els.f.tags.value),
    case_link: els.f.case_link.value.trim() || null,
    full_case_text: els.f.full_case_text.value,
    printable: !!els.f.printable.checked,
    breached_law_or_rule: toArrayFromDelim(els.f_breached_law_or_rule.value),
    observed_conduct: els.f_observed_conduct.value.trim() || '',
    anomaly_detected: els.f_anomaly_detected.value.trim() || '',
    authority_basis: toArrayFromDelim(els.f_authority_basis.value),
    canonical_breach_tag: els.f_canonical_breach_tag.value.trim() || ''
  };

  // ID collision check (allow if it's the current record)
  if (obj.id && indexById.has(obj.id) && indexById.get(obj.id) !== currentIndex) {
    alert(`ID "${obj.id}" is already used by another citation.`);
    return null;
  }
  return obj;
}

function loadIntoForm(index) {
  const c = citationsData.citations[index];
  populateFormFromCitation(c);
  openDrawer('Edit Citation');
}

function updateSuggestions() {
  els.datalist.innerHTML = '';
  breachSuggestions.forEach(tag => {
    const opt = document.createElement('option');
    opt.value = tag;
    els.datalist.appendChild(opt);
  });
}

function exportCurrentCitation() {
  if (!citationsData.citations.length) return;
  const c = clone(citationsData.citations[currentIndex]);
  const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${c.id || 'citation'}.json`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

// ---- Events ----
document.getElementById('prevBtn').addEventListener('click', () => {
  if (!citationsData.citations.length) return;
  currentIndex = (currentIndex - 1 + citationsData.citations.length) % citationsData.citations.length;
  renderCurrent();
});
document.getElementById('nextBtn').addEventListener('click', () => {
  if (!citationsData.citations.length) return;
  currentIndex = (currentIndex + 1) % citationsData.citations.length;
  renderCurrent();
});
document.getElementById('editBtn').addEventListener('click', () => {
  if (!citationsData.citations.length) return;
  loadIntoForm(currentIndex);
});
document.getElementById('printBtn').addEventListener('click', () => window.print());
document.getElementById('exportBtn').addEventListener('click', exportCurrentCitation);
document.getElementById('drawerCloseBtn').addEventListener('click', closeDrawer);
document.getElementById('resetFormBtn').addEventListener('click', () => {
  if (!citationsData.citations.length) return;
  populateFormFromCitation(citationsData.citations[currentIndex]);
});

// Validate & Save (staging only)
document.getElementById('citationForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const updated = formToCitation();
  if (!updated) return;

  const oldId = citationsData.citations[currentIndex].id;
  citationsData.citations[currentIndex] = updated;
  if (oldId !== updated.id) buildIndex();

  renderCurrent();
  alert('Saved to staging (in-memory). No file was written.');
  closeDrawer();
});

// ---- Init ----
async function fetchJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
  return await res.json();
}

async function init() {
  try {
    const payload = await fetchJSON(PATHS.CITATIONS_JSON);
    if (!payload || !Array.isArray(payload.citations)) {
      throw new Error('citations.json missing top-level "citations" array.');
    }
    citationsData = payload;
    buildIndex();

    // breach suggestions (optional)
    try {
      const breaches = await fetchJSON(PATHS.BREACHES_JSON);
      breachSuggestions = Array.isArray(breaches?.breaches)
        ? breaches.breaches.map(b => b.tag).filter(Boolean)
        : [];
      updateSuggestions();
    } catch (e) {
      console.warn('breaches.json not loaded; proceeding without suggestions.', e);
    }

    currentIndex = 0;
    renderCurrent();
    console.log('Citations Viewer loaded. Records:', citationsData.citations.length);
  } catch (err) {
    console.error(err);
    els.card.innerHTML = `<p class="error">Error loading citations: ${err.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', init);
