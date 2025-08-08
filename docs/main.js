document.addEventListener('DOMContentLoaded', () => {
  const drawer = document.getElementById('drawer');
  const openDrawerBtn = document.getElementById('openDrawerBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const citationsContainer = document.getElementById('citationsContainer');
  const breachFilter = document.getElementById('breachFilter');
  const searchInput = document.getElementById('searchInput');

  // ---- Drawer wiring
  if (openDrawerBtn && drawer) openDrawerBtn.addEventListener('click', () => drawer.classList.add('open'));
  if (closeDrawerBtn && drawer) closeDrawerBtn.addEventListener('click', () => drawer.classList.remove('open'));

  // ---- Utility: try a list of URLs until one succeeds
  async function tryFetchJSON(urls, label) {
    const cacheBust = `?v=${Date.now()}`;
    const errors = [];
    for (const base of urls) {
      const url = base + cacheBust;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
          errors.push(`${label}: ${url} -> HTTP ${res.status}`);
          continue;
        }
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch (je) {
          errors.push(`${label}: ${url} -> JSON parse error: ${je.message}\nSnippet: ${text.slice(0,200)}...`);
          continue;
        }
      } catch (e) {
        errors.push(`${label}: ${url} -> Network error: ${e.message}`);
      }
    }
    const message = `Failed to load ${label} from all known paths:\n` + errors.join('\n');
    console.error(message);
    return { __error: message };
  }

  // Paths we will try (relative to /docs/) and absolute to your Pages site
  const basePath = new URL('.', location.href).pathname; // e.g. /compliance-ui/
  const CITATION_PATHS = [
    'data/citations/citations.json',
    './data/citations/citations.json',
    `${basePath}data/citations/citations.json`,
    '/compliance-ui/data/citations/citations.json'
  ];
  const BREACH_PATHS = [
    'data/breaches/breaches.json',
    './data/breaches/breaches.json',
    `${basePath}data/breaches/breaches.json`,
    '/compliance-ui/data/breaches/breaches.json'
  ];

  let allCitations = [];

  // ---- Load breaches for dropdown (non-blocking)
  (async function loadBreaches() {
    const breaches = await tryFetchJSON(BREACH_PATHS, 'breaches.json');
    if (breaches.__error) {
      breachFilter.innerHTML = '<option value="">All</option>';
      return;
    }
    breachFilter.innerHTML = '<option value="">All</option>';
    breaches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = (b.tag || '').toLowerCase();
      opt.textContent = b.tag ? `${b.category || 'Breach'} — ${b.tag}` : (b.category || 'Breach');
      breachFilter.appendChild(opt);
    });
  })();

  // ---- Load citations
  (async function loadCitations() {
    const data = await tryFetchJSON(CITATION_PATHS, 'citations.json');
    if (data.__error) {
      citationsContainer.innerHTML = `<p>Error loading citations.</p><pre style="white-space:pre-wrap">${data.__error}</pre>`;
      return;
    }
    allCitations = Array.isArray(data) ? data : [];
    render(allCitations);
  })();

  // ---- Render & filter
  function render(list) {
    citationsContainer.innerHTML = '';
    if (!list || list.length === 0) {
      citationsContainer.innerHTML = '<p>No citations found.</p>';
      return;
    }
    list.forEach(c => {
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = `
        <h3>${c.case_name || ''}</h3>
        <p><strong>Citation:</strong> ${c.citation || ''}</p>
        <p><strong>Year:</strong> ${c.year || ''}</p>
        <p><strong>Court:</strong> ${c.court || ''}</p>
        <p><strong>Jurisdiction:</strong> ${c.jurisdiction || ''}</p>
        <p><strong>Summary:</strong> ${c.summary || ''}</p>
      `;
      citationsContainer.appendChild(el);
    });
  }

  function applyFilters() {
    const tag = (breachFilter.value || '').trim().toLowerCase();
    const q = (searchInput.value || '').trim().toLowerCase();

    const filtered = allCitations.filter(c => {
      const flags = (c.compliance_flags || []).map(s => (s || '').toLowerCase());
      const matchesTag = !tag || flags.includes(tag);
      const hay = [
        c.case_name, c.citation, c.summary, c.legal_principle, c.holding,
        c.observed_conduct, c.anomaly_detected, c.breached_law_or_rule, c.authority_basis
      ].map(x => (x || '').toLowerCase()).join(' ');
      const matchesSearch = !q || hay.indexOf(q) >= 0;
      return matchesTag && matchesSearch;
    });

    render(filtered);
  }

  breachFilter.addEventListener('change', applyFilters);
  searchInput.addEventListener('input', applyFilters);
});
