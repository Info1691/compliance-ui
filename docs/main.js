document.addEventListener('DOMContentLoaded', () => {
  // ---------- Robust paths for GH Pages ----------
  // Viewer runs at /compliance-ui/ (docs/)
  const CITATIONS_URL = 'data/citations/citations.json?v=' + Date.now();
  const BREACHES_URL  = 'data/breaches/breaches.json?v=' + Date.now();

  // ---------- DOM ----------
  const citationsContainer = document.getElementById('citationsContainer');
  const breachFilter = document.getElementById('breachFilter');
  const keywordSearch = document.getElementById('keywordSearch');

  // Drawer bits (bind only if present)
  const openDrawerBtn  = document.getElementById('openDrawerBtn');
  const drawer         = document.getElementById('drawer');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const btnValidate    = document.getElementById('btnValidate');

  if (openDrawerBtn && drawer && closeDrawerBtn) {
    openDrawerBtn.addEventListener('click', () => drawer.classList.add('open'));
    closeDrawerBtn.addEventListener('click', () => drawer.classList.remove('open'));
  }
  if (btnValidate) {
    btnValidate.addEventListener('click', () => alert('Validate & Save is a no-op in viewer (manual commit only).'));
  }

  // ---------- State ----------
  let ALL_CITATIONS = [];
  let ALL_BREACH_TAGS = [];

  // ---------- Load data ----------
  Promise.all([
    fetch(CITATIONS_URL).then(r => {
      console.log('CITATIONS fetch:', r.status, r.url);
      if (!r.ok) throw new Error('citations.json HTTP ' + r.status);
      return r.json();
    }),
    fetch(BREACHES_URL).then(r => {
      console.log('BREACHES fetch:', r.status, r.url);
      if (!r.ok) throw new Error('breaches.json HTTP ' + r.status);
      return r.json();
    })
  ])
  .then(([citations, breaches]) => {
    ALL_CITATIONS  = Array.isArray(citations) ? citations : [];
    ALL_BREACH_TAGS = Array.isArray(breaches) ? breaches : [];

    renderCitations(ALL_CITATIONS);
    populateBreachFilter(ALL_BREACH_TAGS);

    // search
    if (keywordSearch) {
      keywordSearch.addEventListener('input', () => {
        applyFilters();
      });
    }
    if (breachFilter) {
      breachFilter.addEventListener('change', applyFilters);
    }
  })
  .catch(err => {
    console.error('Error loading data:', err);
    if (citationsContainer) {
      citationsContainer.innerHTML = `<p>Error loading citations.</p>
<pre style="white-space:pre-wrap">${String(err)}</pre>`;
    }
  });

  // ---------- Filtering ----------
  function applyFilters() {
    const q = (keywordSearch?.value || '').trim().toLowerCase();
    const tag = (breachFilter?.value || 'All');

    let list = ALL_CITATIONS.slice();

    if (tag && tag !== 'All') {
      list = list.filter(c => {
        const flags = Array.isArray(c.compliance_flags) ? c.compliance_flags : [];
        return flags.includes(tag);
      });
    }

    if (q) {
      list = list.filter(c => {
        const hay = [
          c.case_name, c.citation, c.summary, c.legal_principle,
          c.holding, c.authority_basis, (c.sources || []).join(' ')
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }

    renderCitations(list);
  }

  // ---------- UI helpers ----------
  function populateBreachFilter(breaches) {
    if (!breachFilter) return;
    const unique = new Set();
    breaches.forEach(b => {
      if (b && b.tag) unique.add(b.tag);
    });

    breachFilter.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = 'All';
    optAll.textContent = 'All';
    breachFilter.appendChild(optAll);

    [...unique].sort().forEach(tag => {
      const o = document.createElement('option');
      o.value = tag;
      o.textContent = tag;
      breachFilter.appendChild(o);
    });
  }

  function renderCitations(list) {
    if (!citationsContainer) return;
    if (!list || !list.length) {
      citationsContainer.innerHTML = '<p>No citations found.</p>';
      return;
    }

    citationsContainer.innerHTML = list.map(renderCard).join('\n');
  }

  function escapeHTML(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderCard(c) {
    const sources = Array.isArray(c.sources) ? c.sources : [];
    const flags   = Array.isArray(c.compliance_flags) ? c.compliance_flags : [];

    return `
      <article class="citation-card">
        <h2>${escapeHTML(c.case_name || '')}</h2>

        <p><strong>Citation:</strong> ${escapeHTML(c.citation || '')}</p>
        <p><strong>Year:</strong> ${escapeHTML(c.year || '')}</p>
        <p><strong>Court:</strong> ${escapeHTML(c.court || '')}</p>
        <p><strong>Jurisdiction:</strong> ${escapeHTML(c.jurisdiction || '')}</p>

        <p><strong>Summary:</strong> ${escapeHTML(c.summary || '')}</p>
        ${c.legal_principle ? `<p><strong>Legal Principle:</strong> ${escapeHTML(c.legal_principle)}</p>` : '' }
        ${c.holding ? `<p><strong>Holding:</strong> ${escapeHTML(c.holding)}</p>` : '' }

        ${c.authority_basis ? `<p><strong>Authority Basis:</strong> ${escapeHTML(c.authority_basis)}</p>` : '' }

        ${sources.length ? `<p><strong>Sources:</strong> ${sources.map(s => {
            // allow plain text or markdown-like (text)(url)
            return escapeHTML(s);
          }).join(', ')}</p>` : ''}

        ${flags.length ? `<p><strong>Compliance Flags:</strong> ${flags.map(escapeHTML).join(', ')}</p>` : '' }
      </article>
    `;
  }
});
