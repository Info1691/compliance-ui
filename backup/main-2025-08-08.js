document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const citationsContainer = document.getElementById('citationsContainer');
  const breachFilter = document.getElementById('breachFilter');
  const keywordSearch = document.getElementById('keywordSearch');

  const drawer = document.getElementById('drawer');
  const openDrawerBtn = document.getElementById('openDrawerBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');

  // Drawer open/close (guarded)
  if (openDrawerBtn && drawer) {
    openDrawerBtn.addEventListener('click', () => {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
    });
  }
  if (closeDrawerBtn && drawer) {
    closeDrawerBtn.addEventListener('click', () => {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    });
  }

  // Data paths (GitHub Pages under /docs)
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
    while ((m = re.exec(text)) !== null) {
      out.push(m[1].replace(/[),.;]+$/, ''));
    }
    return [...new Set(out)];
  };
  const host = (u) => { try { return new URL(u).hostname; } catch { return u; } };

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

      // Sources: prefer c.sources[]; else extract from authority_basis
      let srcs = Array.isArray(c.sources) ? c.sources : [];
      if (!srcs.length) srcs = extractUrls(c.authority_basis);

      const sourcesHtml = srcs.length
        ? `<p><strong>Sources:</strong> ${
            srcs.map(u => `<a href="${u}" target="_blank" rel="noopener">${host(u)}</a>`).join(' · ')
          }</p>`
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
      allCitations = await r.json();
      renderCitations(allCitations);
    } catch (e) {
      console.error('Error loading citations:', e);
      citationsContainer.innerHTML = `<p>Error loading citations.</p>
        <pre style="white-space:pre-wrap;font-size:12px;background:#fff;border:1px solid #eee;padding:8px;">${e.message}</pre>`;
    }
  }

  // Init
  loadBreaches();
  loadCitations();
});
