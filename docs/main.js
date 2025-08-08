document.addEventListener('DOMContentLoaded', () => {
  const drawer         = document.getElementById('drawer');
  const openDrawerBtn  = document.getElementById('openDrawerBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const citationsEl    = document.getElementById('citationsContainer');
  const breachFilter   = document.getElementById('breachFilter');
  const searchForm     = document.getElementById('searchForm');
  const searchInput    = document.getElementById('keywordSearch');
  const validateBtn    = document.getElementById('btnValidate');

  // ---- Drawer handlers (null-safe) ----
  if (openDrawerBtn && drawer) {
    openDrawerBtn.addEventListener('click', () => drawer.classList.add('open'));
  }
  if (closeDrawerBtn && drawer) {
    closeDrawerBtn.addEventListener('click', () => drawer.classList.remove('open'));
  }

  // ---- Load data ----
  const CITATIONS_URL = 'data/citations/citations.json';
  const BREACHES_URL  = 'data/breaches/breaches.json';

  let allCitations = [];

  function render(list) {
    if (!citationsEl) return;
    if (!Array.isArray(list) || list.length === 0) {
      citationsEl.innerHTML = '<p>No citations found.</p>';
      return;
    }
    const html = list.map(renderCard).join('');
    citationsEl.innerHTML = html;
  }

  function renderCard(c) {
    const srcs = (c.sources && c.sources.length)
      ? `<p><strong>Sources:</strong> ${c.sources.map(s => escapeHTML(s)).join(', ')}</p>`
      : '';
    const flags = (c.compliance_flags && c.compliance_flags.length)
      ? `<p><strong>Compliance Flags:</strong> ${c.compliance_flags.map(escapeHTML).join(', ')}</p>`
      : '';
    return `
      <article class="card">
        <h2>${escapeHTML(c.case_name || '')}</h2>
        <p><strong>Citation:</strong> ${escapeHTML(c.citation || '')}</p>
        <p><strong>Year:</strong> ${escapeHTML(c.year || '')}</p>
        <p><strong>Court:</strong> ${escapeHTML(c.court || '')}</p>
        <p><strong>Jurisdiction:</strong> ${escapeHTML(c.jurisdiction || '')}</p>
        <p><strong>Summary:</strong> ${escapeHTML(c.summary || '')}</p>
        ${c.legal_principle ? `<p><strong>Legal Principle:</strong> ${escapeHTML(c.legal_principle)}</p>` : ''}
        ${c.holding ? `<p><strong>Holding:</strong> ${escapeHTML(c.holding)}</p>` : ''}
        ${c.authority_basis ? `<p><strong>Authority Basis:</strong> ${escapeHTML(c.authority_basis)}</p>` : ''}
        ${srcs}
        ${flags}
      </article>
    `;
  }

  function escapeHTML(s='') {
    return String(s)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#39;');
  }

  // Populate breach filter
  fetch(BREACHES_URL)
    .then(r => r.ok ? r.json() : Promise.reject(r))
    .then(data => {
      if (!breachFilter) return;
      const tags = Array.isArray(data) ? data.map(x => x.tag).filter(Boolean) : [];
      breachFilter.innerHTML = `<option value="">All</option>` +
        [...new Set(tags)].sort().map(t => `<option>${escapeHTML(t)}</option>`).join('');
    })
    .catch(() => { /* non-fatal */ });

  // Load citations
  fetch(CITATIONS_URL)
    .then(r => r.ok ? r.json() : Promise.reject(r))
    .then(data => {
      allCitations = Array.isArray(data) ? data : [];
      render(allCitations);
    })
    .catch(err => {
      console.error('Error loading citations:', err);
      if (citationsEl) citationsEl.innerHTML = '<p>Error loading citations.</p>';
    });

  // Filter + search
  if (breachFilter) {
    breachFilter.addEventListener('change', () => applyFilters());
  }
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      applyFilters();
    });
  }

  function applyFilters() {
    const tag = breachFilter ? (breachFilter.value || '').trim().toLowerCase() : '';
    const q   = searchInput ? (searchInput.value || '').trim().toLowerCase() : '';

    const list = allCitations.filter(c => {
      const tagMatch = !tag || (Array.isArray(c.compliance_flags) && c.compliance_flags.some(f => String(f).toLowerCase().includes(tag)));
      const hay = [
        c.case_name, c.citation, c.summary, c.legal_principle, c.holding,
        c.authority_basis
      ].filter(Boolean).join(' ').toLowerCase();
      const qMatch = !q || hay.includes(q);
      return tagMatch && qMatch;
    });

    render(list);
  }

  // Drawer validate (no save to repo here; this is local validation only)
  if (validateBtn) {
    validateBtn.addEventListener('click', () => {
      const required = [
        'f-id','f-case_name','f-citation','f-year','f-court','f-jurisdiction','f-summary'
      ];
      const missing = required.filter(id => {
        const el = document.getElementById(id);
        return !el || !String(el.value).trim();
      });

      if (missing.length) {
        alert(`Please complete required fields: ${missing.join(', ')}`);
        return;
      }
      alert('Looks valid. (This form does not write to GitHub. Use Bulk Import for batch updates.)');
    });
  }
});
