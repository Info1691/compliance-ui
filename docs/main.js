document.addEventListener('DOMContentLoaded', () => {
  const citationsContainer = document.getElementById('citationsContainer');
  const breachFilter = document.getElementById('breachFilter');
  const keywordSearch = document.getElementById('keywordSearch');

  const CITATION_PATHS = ['data/citations/citations.json'];
  const BREACHES_PATH = 'data/breaches/breaches.json';

  let citations = [];
  let breaches = [];
  let aliasToCanonical = {};

  // ---------- helpers ----------
  const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, '');

  const extractUrls = (text) => {
    if (!text) return [];
    // find http/https links; ignore trailing punctuation
    const re = /(https?:\/\/[^\s)>\]]+)/gi;
    const out = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      let url = m[1].replace(/[),.;]+$/,'');
      out.push(url);
    }
    // de-dup
    return [...new Set(out)];
  };

  const host = (u) => {
    try { return new URL(u).hostname; } catch { return u; }
  };

  // ---------- render ----------
  function renderCitations(list) {
    citationsContainer.innerHTML = '';
    if (!list.length) {
      citationsContainer.innerHTML = '<p>No matching citations.</p>';
      return;
    }

    list.forEach(citation => {
      const card = document.createElement('div');
      card.className = 'citation-card';

      // Sources: prefer citation.sources (array); else extract from authority_basis
      let srcs = Array.isArray(citation.sources) ? citation.sources : [];
      if (!srcs.length) srcs = extractUrls(citation.authority_basis);

      const sourcesHtml = srcs.length
        ? `<p><strong>Sources:</strong> ${srcs.map(u => `<a href="${u}" target="_blank" rel="noopener">${host(u)}</a>`).join(' · ')}</p>`
        : '';

      card.innerHTML = `
        <h2>${citation.case_name || ''}</h2>
        <p><strong>Citation:</strong> ${citation.citation || ''}</p>
        <p><strong>Year:</strong> ${citation.year ?? ''}</p>
        <p><strong>Court:</strong> ${citation.court || ''}</p>
        <p><strong>Jurisdiction:</strong> ${citation.jurisdiction || ''}</p>
        ${citation.summary ? `<p><strong>Summary:</strong> ${citation.summary}</p>` : ''}
        ${citation.legal_principle ? `<p><strong>Legal Principle:</strong> ${citation.legal_principle}</p>` : ''}
        ${citation.holding ? `<p><strong>Holding:</strong> ${citation.holding}</p>` : ''}
        ${citation.authority_basis ? `<p><strong>Authority Basis:</strong> ${citation.authority_basis}</p>` : ''}
        ${sourcesHtml}
        ${Array.isArray(citation.compliance_flags) && citation.compliance_flags.length
          ? `<p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}</p>` : ''
        }
      `;
      citationsContainer.appendChild(card);
    });
  }

  // ---------- filtering ----------
  function buildAliasMap() {
    aliasToCanonical = {};
    breaches.forEach(b => {
      if (!b || !b.tag) return;
      aliasToCanonical[normalize(b.tag)] = b.tag;
      if (Array.isArray(b.aliases)) {
        b.aliases.forEach(a => aliasToCanonical[normalize(a)] = b.tag);
      }
    });
  }

  function populateBreachDropdown() {
    breachFilter.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = 'All';
    breachFilter.appendChild(optAll);

    // sort by tag
    breaches
      .slice()
      .sort((a,b)=> (a.tag||'').localeCompare(b.tag||''))
      .forEach(b => {
        const o = document.createElement('option');
        o.value = b.tag;
        o.textContent = b.tag;
        breachFilter.appendChild(o);
      });

    breachFilter.addEventListener('change', applyFilters);
    keywordSearch.addEventListener('input', applyFilters);
  }

  function applyFilters() {
    const selected = breachFilter.value;
    const q = (keywordSearch.value || '').toLowerCase().trim();

    const filtered = citations.filter(c => {
      // breach filtering uses compliance_flags exact tag matches
      const tagOk = selected === 'all'
        ? true
        : Array.isArray(c.compliance_flags) && c.compliance_flags.includes(selected);

      if (!tagOk) return false;

      if (!q) return true;

      // keyword search across several fields
      const hay = [
        c.case_name, c.citation, c.summary, c.legal_principle, c.holding,
        c.authority_basis, Array.isArray(c.tags) ? c.tags.join(' ') : ''
      ].join(' ').toLowerCase();

      return hay.includes(q);
    });

    renderCitations(filtered);
  }

  // ---------- load ----------
  async function loadAll() {
    try {
      // load breaches first (for dropdown)
      const bRes = await fetch(BREACHES_PATH);
      if (!bRes.ok) throw new Error('breaches fetch failed');
      breaches = await bRes.json();
      buildAliasMap();
      populateBreachDropdown();
    } catch (e) {
      console.error('Error loading breaches:', e);
      // still continue; UI can work without dropdown
    }

    try {
      // load citations (supports multiple files if needed later)
      const parts = await Promise.all(
        CITATION_PATHS.map(async p => {
          const r = await fetch(p);
          if (!r.ok) throw new Error(`citations fetch failed: ${p}`);
          return r.json();
        })
      );
      // flatten arrays
      citations = parts.flat();
      renderCitations(citations);
    } catch (e) {
      console.error('Error loading citations:', e);
      citationsContainer.innerHTML = '<p>Error loading citations.</p>';
    }
  }

  loadAll();
});
