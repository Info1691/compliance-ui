document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const citationsContainer = document.getElementById('citationsContainer');
  const breachFilter = document.getElementById('breachFilter');
  const keywordSearch = document.getElementById('keywordSearch');

  const drawer = document.getElementById('drawer');
  const openDrawerBtn = document.getElementById('openDrawerBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');

  // Form fields
  const F = {
    id: document.getElementById('field-id'),
    case_name: document.getElementById('field-case_name'),
    citation: document.getElementById('field-citation'),
    year: document.getElementById('field-year'),
    court: document.getElementById('field-court'),
    jurisdiction: document.getElementById('field-jurisdiction'),
    legal_principle: document.getElementById('field-legal_principle'),
    summary: document.getElementById('field-summary'),
    holding: document.getElementById('field-holding'),
    compliance_flags: document.getElementById('field-compliance_flags'),
    key_points: document.getElementById('field-key_points'),
    tags: document.getElementById('field-tags'),
    observed_conduct: document.getElementById('field-observed_conduct'),
    anomaly_detected: document.getElementById('field-anomaly_detected'),
    breached_law_or_rule: document.getElementById('field-breached_law_or_rule'),
    authority_basis: document.getElementById('field-authority_basis'),
    canonical_breach_tag: document.getElementById('field-canonical_breach_tag'),
    case_link: document.getElementById('field-case_link'),
    full_case_text: document.getElementById('field-full_case_text'),
    printable: document.getElementById('field-printable')
  };
  const validateAndSaveBtn = document.getElementById('validateAndSaveBtn');

  // Drawer open/close (guarded)
  function openDrawer() {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  if (openDrawerBtn && drawer) openDrawerBtn.addEventListener('click', openDrawer);
  if (closeDrawerBtn && drawer) closeDrawerBtn.addEventListener('click', closeDrawer);

  // Data paths (relative under /compliance-ui/)
  const CITATIONS_URL = 'data/citations/citations.json';
  const BREACHES_URL  = 'data/breaches/breaches.json';

  let allCitations = [];
  let breaches = [];

  // Helpers
  const extractUrls = (text) => {
    if (!text) return [];
    const re = /(https?:\/\/[^\s)<>\]]+)/gi;
    const out = [];
    let m;
    while ((m = re.exec(text)) !== null) out.push(m[1].replace(/[),.;]+$/, ''));
    return [...new Set(out)];
  };
  const host = (u) => { try { return new URL(u).hostname; } catch { return u; } };
  const commaToArray = v => (v || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  function clearForm() {
    Object.values(F).forEach(el => {
      if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
    });
  }
  function populateForm(c) {
    F.id.value = c.id || '';
    F.case_name.value = c.case_name || '';
    F.citation.value = c.citation || '';
    F.year.value = (c.year ?? '').toString();
    F.court.value = c.court || '';
    F.jurisdiction.value = c.jurisdiction || '';
    F.legal_principle.value = c.legal_principle || '';
    F.summary.value = c.summary || '';
    F.holding.value = c.holding || '';
    F.compliance_flags.value = Array.isArray(c.compliance_flags) ? c.compliance_flags.join(', ') : (c.compliance_flags || '');
    F.key_points.value = Array.isArray(c.key_points) ? c.key_points.join(', ') : (c.key_points || '');
    F.tags.value = Array.isArray(c.tags) ? c.tags.join(', ') : (c.tags || '');
    F.observed_conduct.value = c.observed_conduct || '';
    F.anomaly_detected.value = c.anomaly_detected || '';
    F.breached_law_or_rule.value = Array.isArray(c.breached_law_or_rule) ? c.breached_law_or_rule.join(', ') : (c.breached_law_or_rule || '');
    F.authority_basis.value = Array.isArray(c.authority_basis) ? c.authority_basis.join(', ') : (c.authority_basis || '');
    F.canonical_breach_tag.value = c.canonical_breach_tag || '';
    F.case_link.value = c.case_link || '';
    F.full_case_text.value = c.full_case_text || '';
    F.printable.checked = !!c.printable;
  }

  // Render
  function renderCitations(list) {
    citationsContainer.innerHTML = '';
    if (!list.length) {
      citationsContainer.innerHTML = '<p>No matching citations.</p>';
      return;
    }

    list.forEach(c => {
      const card = document.createElement('div');
      card.className = 'citation-card';
      card.dataset.id = c.id || '';

      // Sources: prefer c.sources[]; else extract from authority_basis
      let srcs = Array.isArray(c.sources) ? c.sources : [];
      if (!srcs.length) srcs = extractUrls(c.authority_basis);

      const sourcesHtml = srcs.length
        ? `<p><strong>Sources:</strong> ${srcs.map(u => `<a href="${u}" target="_blank" rel="noopener">${host(u)}</a>`).join(' · ')}</p>`
        : '';

      card.innerHTML = `
        <h2>${c.case_name || ''}</h2>
        <p><strong>Citation:</strong> ${c.citation || ''}</p>
        <p><strong>Year:</strong> ${c.year ?? ''}</p>
        <p><strong>Court:</strong> ${c.court || ''}</p>
        <p><strong>Jurisdiction:</strong> ${c.jurisdiction || ''}</p>
        ${c.summary ? `<p><strong>Summary:</strong> ${c.summary}</p>` : ''}
        ${c.legal_principle ? `<p><strong>Legal Principle:</strong> ${c.legal_principle}</p>` : ''}
        ${c.holding ? `<p><strong>Holding:</strong> ${c.holding}</p>` : ''}
        ${c.authority_basis ? `<p><strong>Authority Basis:</strong> ${c.authority_basis}</p>` : ''}
        ${sourcesHtml}
        ${Array.isArray(c.compliance_flags) && c.compliance_flags.length
          ? `<p><strong>Compliance Flags:</strong> ${c.compliance_flags.join(', ')}</p>` : ''
        }
      `;
      citationsContainer.appendChild(card);
    });
  }

  // Click a card to edit it (fills the drawer)
  citationsContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.citation-card');
    if (!card) return;
    const id = card.dataset.id;
    const existing = allCitations.find(x => x.id === id);
    if (existing) {
      populateForm(existing);
      openDrawer();
    }
  });

  function applyFilters() {
    const tag = (breachFilter.value || '').trim().toLowerCase();
    const q = (keywordSearch.value || '').trim().toLowerCase();

    const filtered = allCitations.filter(c => {
      const flags = (c.compliance_flags || []).map(s => (s || '').toLowerCase());
      const tagOk = !tag || tag === 'all' || flags.includes(tag);

      if (!tagOk) return false;
      if (!q) return true;

      const hay = [
        c.case_name, c.citation, c.summary, c.legal_principle, c.holding,
        c.authority_basis, (Array.isArray(c.tags) ? c.tags.join(' ') : '')
      ].map(x => (x || '').toLowerCase()).join(' ');
      return hay.includes(q);
    });

    renderCitations(filtered);
  }

  // Load breaches (non-blocking)
  async function loadBreaches() {
    try {
      const r = await fetch(BREACHES_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error(`breaches fetch: HTTP ${r.status}`);
      breaches = await r.json();

      // Populate dropdown
      breachFilter.innerHTML = '<option value="all">All</option>';
      breaches
        .slice()
        .sort((a,b)=> (a.tag||'').localeCompare(b.tag||''))
        .forEach(b => {
          const opt = document.createElement('option');
          opt.value = b.tag || '';
          opt.textContent = b.tag || '';
          breachFilter.appendChild(opt);
        });

      breachFilter.addEventListener('change', applyFilters);
      keywordSearch.addEventListener('input', applyFilters);
    } catch (e) {
      console.warn('Breaches unavailable:', e.message);
      breachFilter.innerHTML = '<option value="all">All</option>';
      breachFilter.addEventListener('change', applyFilters);
      keywordSearch.addEventListener('input', applyFilters);
    }
  }

  // Load citations
  async function loadCitations() {
    try {
      const r = await fetch(CITATIONS_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error(`citations fetch: HTTP ${r.status}`);
      const payload = await r.json();
      // Accept either array or {citations:[...]}
      allCitations = Array.isArray(payload) ? payload
                   : (Array.isArray(payload?.citations) ? payload.citations : []);
      renderCitations(allCitations);
    } catch (e) {
      console.error('Error loading citations:', e);
      citationsContainer.innerHTML = `<p>Error loading citations.</p>
        <pre style="white-space:pre-wrap;font-size:12px;background:#fff;border:1px solid #eee;padding:8px;">${e.message}</pre>`;
    }
  }

  // Validate & Save (in-memory only)
  function validateAndSave() {
    const id = (F.id.value || '').trim();
    const case_name = (F.case_name.value || '').trim();
    const citation = (F.citation.value || '').trim();
    const yearStr = (F.year.value || '').trim();

    // Basic validations
    if (!id) return alert('ID is required.');
    if (!/^[a-z0-9-]+$/.test(id)) return alert('ID must be lowercase letters, numbers, and hyphens only.');
    if (!case_name) return alert('Case Name is required.');
    if (!citation) return alert('Citation is required.');
    if (!/^\d{4}$/.test(yearStr)) return alert('Year must be a 4-digit number.');

    const obj = {
      id,
      case_name,
      citation,
      year: Number(yearStr),
      court: (F.court.value || '').trim(),
      jurisdiction: (F.jurisdiction.value || '').trim(),
      legal_principle: (F.legal_principle.value || '').trim(),
      summary: (F.summary.value || '').trim(),
      holding: (F.holding.value || '').trim(),
      compliance_flags: commaToArray(F.compliance_flags.value),
      key_points: commaToArray(F.key_points.value),
      tags: commaToArray(F.tags.value),
      observed_conduct: (F.observed_conduct.value || '').trim(),
      anomaly_detected: (F.anomaly_detected.value || '').trim(),
      breached_law_or_rule: commaToArray(F.breached_law_or_rule.value),
      authority_basis: commaToArray(F.authority_basis.value),
      canonical_breach_tag: (F.canonical_breach_tag.value || '').trim(),
      case_link: (F.case_link.value || '').trim() || null,
      full_case_text: (F.full_case_text.value || ''),
      printable: !!F.printable.checked
    };

    // Upsert in memory
    const idx = allCitations.findIndex(c => c.id === id);
    if (idx >= 0) allCitations[idx] = obj;
    else allCitations.push(obj);

    // Re-apply filters & re-render
    applyFilters();

    alert('Saved to memory (no file write).');
    closeDrawer();
    clearForm();
  }

  validateAndSaveBtn.addEventListener('click', validateAndSave);

  // Init
  loadBreaches();
  loadCitations();
});
