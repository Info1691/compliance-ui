<script>
/* Compliance Citation Viewer — robust, complete */
document.addEventListener('DOMContentLoaded', () => {
  // --- Elements (guard everything) ---
  const drawer          = document.getElementById('drawer');
  const openDrawerBtn   = document.getElementById('openDrawerBtn');
  const closeDrawerBtn  = document.getElementById('closeDrawerBtn');
  const citationsContainer = document.getElementById('citationsContainer');
  const breachFilter    = document.getElementById('breachFilter');
  const keywordSearch   = document.getElementById('keywordSearch');
  const toBulkBtn       = document.getElementById('toBulkBtn');

  // Give the Bulk button a white background so it’s visible on the blue bar
  if (toBulkBtn) toBulkBtn.classList.add('btn-onblue');

  // --- Simple navigation (relative to /compliance-ui/) ---
  if (toBulkBtn) {
    toBulkBtn.addEventListener('click', () => {
      // Works on GitHub Pages regardless of trailing slash
      const base = location.pathname.replace(/[^/]*$/, '');
      window.location.href = base + 'bulk/';
    });
  }

  // --- Drawer open/close (no-op if elements missing) ---
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

  // --- Data state ---
  let allCitations = [];
  let filtered = [];

  // --- Fetch + render ---
  const bust = `?v=${Date.now()}`;
  const CITATIONS_URL = `data/citations/citations.json${bust}`;
  const BREACHES_URL  = `data/breaches/breaches.json${bust}`;

  (async function loadEverything() {
    try {
      const [citRes, brRes] = await Promise.all([
        fetch(CITATIONS_URL, {cache:'no-store'}),
        fetch(BREACHES_URL,  {cache:'no-store'})
      ]);

      if (!citRes.ok) throw new Error(`citations fetch failed: ${citRes.status}`);
      // breaches may be optional, don’t hard-fail the page
      if (!brRes.ok) console.warn('breaches fetch failed:', brRes.status);

      allCitations = await citRes.json().catch(() => []);
      const breaches = brRes.ok ? await brRes.json().catch(() => []) : [];

      // Populate filter (fall back to tags in data if breaches.json missing)
      const options = new Set(['All']);
      if (Array.isArray(breaches) && breaches.length) {
        breaches.forEach(b => b?.tag && options.add(b.tag));
      } else {
        allCitations.forEach(c => c?.canonical_breach_tag && options.add(c.canonical_breach_tag));
      }

      if (breachFilter) {
        breachFilter.innerHTML = '';
        [...options].forEach(tag => {
          const opt = document.createElement('option');
          opt.value = tag;
          opt.textContent = tag;
          breachFilter.appendChild(opt);
        });
      }

      filtered = allCitations.slice(0);
      render();

      // Wire filter/search
      if (breachFilter) breachFilter.addEventListener('change', applyFilters);
      if (keywordSearch) keywordSearch.addEventListener('input', applyFilters);

    } catch (err) {
      console.error('Error loading citations:', err);
      if (citationsContainer) {
        citationsContainer.innerHTML = `<p>Error loading citations.</p>`;
      }
    }
  })();

  function applyFilters() {
    const tag = (breachFilter && breachFilter.value) ? breachFilter.value : 'All';
    const q = (keywordSearch && keywordSearch.value || '').trim().toLowerCase();

    filtered = allCitations.filter(c => {
      const tagOk = (tag === 'All') || (String(c.canonical_breach_tag || '').toLowerCase() === tag.toLowerCase());
      if (!q) return tagOk;
      const hay = [
        c.case_name, c.citation, c.summary, c.legal_principle, c.holding,
        c.authority_basis, (c.sources || []).join(' ')
      ].join(' | ').toLowerCase();
      return tagOk && hay.includes(q);
    });

    render();
  }

  function render() {
    if (!citationsContainer) return;
    if (!filtered.length) {
      citationsContainer.innerHTML = `<p>No citations found.</p>`;
      return;
    }
    citationsContainer.innerHTML = filtered.map(renderCard).join('');
  }

  function renderField(label, value) {
    if (!value) return '';
    return `<p><strong>${label}:</strong> ${value}</p>`;
  }

  function renderArrayField(label, arr) {
    if (!arr || !arr.length) return '';
    const joined = arr.join(', ');
    return `<p><strong>${label}:</strong> ${joined}</p>`;
  }

  function renderSources(s) {
    if (!s || !s.length) return '';
    // expect plain URLs in sources; if they’re already markdown, they’ll still show
    const links = s.map(u => {
      try {
        const url = new URL(u);
        return `<a href="${url.href}" target="_blank" rel="noopener">${url.hostname}</a>`;
      } catch {
        return u; // already formatted or not a URL
      }
    }).join(', ');
    return `<p><strong>Sources:</strong> ${links}</p>`;
  }

  function renderCard(c) {
    const lines = [];
    lines.push(`<section class="citation-card">`);
    lines.push(`<h2 class="case-name">${escapeHtml(c.case_name || '')}</h2>`);
    lines.push(renderField('Citation', c.citation));
    lines.push(renderField('Year', c.year));
    lines.push(renderField('Court', c.court));
    lines.push(renderField('Jurisdiction', c.jurisdiction));
    lines.push(renderField('Summary', c.summary));
    lines.push(renderField('Legal Principle', c.legal_principle));
    lines.push(renderField('Holding', c.holding));
    lines.push(renderField('Authority Basis', c.authority_basis));
    lines.push(renderSources(c.sources));
    lines.push(renderArrayField('Compliance Flags', c.compliance_flags));
    lines.push(`</section>`);
    return lines.join('\n');
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }
});
</script>
