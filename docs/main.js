<script>
document.addEventListener('DOMContentLoaded', () => {
  // ---------- Elements (guarded) ----------
  const citationsContainer = document.getElementById('citationsContainer');
  const breachFilter       = document.getElementById('breachFilter');
  const keywordSearch      = document.getElementById('keywordSearch');
  const openDrawerBtn      = document.getElementById('openDrawerBtn');
  const closeDrawerBtn     = document.getElementById('closeDrawerBtn');
  const drawer             = document.getElementById('drawer');
  const goBulkBtn          = document.getElementById('goBulkBtn'); // optional

  // ---------- State ----------
  let allCitations = [];
  let breaches     = [];

  // ---------- Helpers ----------
  const bust = () => `?v=${Date.now()}`;
  const CITATIONS_URL = `data/citations/citations.json${bust()}`;
  const BREACHES_URL  = `data/breaches/breaches.json${bust()}`;

  function safeArray(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    // allow string with | separators
    return String(v).split('|').map(s => s.trim()).filter(Boolean);
  }

  function textContains(hay, needle) {
    return hay.toLowerCase().includes(needle.toLowerCase());
  }

  function htmlEscape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function renderCitation(c) {
    const sources = safeArray(c.sources);
    const flags   = safeArray(c.compliance_flags);

    return `
      <section class="card">
        <h2 class="case-name">${htmlEscape(c.case_name || '')}</h2>

        <p><strong>Citation:</strong> ${htmlEscape(c.citation || '')}</p>
        <p><strong>Year:</strong> ${htmlEscape(c.year || '')}</p>
        <p><strong>Court:</strong> ${htmlEscape(c.court || '')}</p>
        <p><strong>Jurisdiction:</strong> ${htmlEscape(c.jurisdiction || '')}</p>

        ${c.summary ? `<p><strong>Summary:</strong> ${htmlEscape(c.summary)}</p>` : ''}
        ${c.legal_principle ? `<p><strong>Legal Principle:</strong> ${htmlEscape(c.legal_principle)}</p>` : ''}
        ${c.holding ? `<p><strong>Holding:</strong> ${htmlEscape(c.holding)}</p>` : ''}

        ${c.authority_basis ? `<p><strong>Authority Basis:</strong> ${htmlEscape(c.authority_basis)}</p>` : ''}

        ${sources.length ? `<p><strong>Sources:</strong> ${
          sources.map(s => {
            // If it's a URL, link it; otherwise show plain text
            const isUrl = /^https?:\/\//i.test(s);
            return isUrl ? `<a href="${htmlEscape(s)}" target="_blank" rel="noopener">${htmlEscape(new URL(s).hostname)}</a>` 
                         : htmlEscape(s);
          }).join(', ')
        }</p>` : ''}

        ${flags.length ? `<p><strong>Compliance Flags:</strong> ${flags.map(htmlEscape).join(', ')}</p>` : ''}
      </section>
    `;
  }

  function applyFilters() {
    const kw = (keywordSearch?.value || '').trim();
    const chosen = breachFilter?.value || 'All';

    let list = [...allCitations];

    if (chosen && chosen !== 'All') {
      list = list.filter(c => safeArray(c.compliance_flags).some(f => f === chosen));
    }
    if (kw) {
      list = list.filter(c =>
        ['case_name','citation','summary','legal_principle','holding','authority_basis']
          .some(k => c[k] && textContains(String(c[k]), kw))
      );
    }

    citationsContainer.innerHTML = list.length
      ? list.map(renderCitation).join('')
      : `<p class="muted">No matching citations.</p>`;
  }

  function populateBreachFilter() {
    if (!breachFilter) return;
    const uniq = new Set();
    allCitations.forEach(c => safeArray(c.compliance_flags).forEach(f => uniq.add(f)));
    const combined = ['All', ...Array.from(uniq).sort()];
    breachFilter.innerHTML = combined.map(opt => `<option value="${htmlEscape(opt)}">${htmlEscape(opt)}</option>`).join('');
  }

  // ---------- Listeners (guarded) ----------
  if (openDrawerBtn && drawer) {
    openDrawerBtn.addEventListener('click', () => drawer.classList.add('open'));
  }
  if (closeDrawerBtn && drawer) {
    closeDrawerBtn.addEventListener('click', () => drawer.classList.remove('open'));
  }
  if (goBulkBtn) {
    goBulkBtn.addEventListener('click', () => {
      window.location.href = './bulk/';
    });
  }
  if (breachFilter) {
    breachFilter.addEventListener('change', applyFilters);
  }
  if (keywordSearch) {
    keywordSearch.addEventListener('input', applyFilters);
  }

  // ---------- Load data ----------
  (async () => {
    try {
      if (citationsContainer) citationsContainer.innerHTML = '<p>Loading citations...</p>';

      const [cRes, bRes] = await Promise.all([
        fetch(CITATIONS_URL),
        fetch(BREACHES_URL)
      ]);

      if (!cRes.ok) throw new Error('Failed to fetch citations.json');
      // breaches are optional; don’t hard-fail if missing
      if (!bRes.ok) console.warn('breaches.json not found/ok (non-fatal)');

      allCitations = await cRes.json();
      breaches     = bRes.ok ? await bRes.json() : [];

      populateBreachFilter();
      applyFilters();
    } catch (err) {
      console.error(err);
      if (citationsContainer) {
        citationsContainer.innerHTML = `<p class="error">Error loading citations.</p>`;
      }
    }
  })();
});
</script>
