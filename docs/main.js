document.addEventListener('DOMContentLoaded', () => {
  const drawer = document.getElementById('drawer');
  const openDrawerBtn = document.getElementById('openDrawerBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const citationsContainer = document.getElementById('citationsContainer');
  const breachFilter = document.getElementById('breachFilter');
  const keywordSearch = document.getElementById('keywordSearch');

  // Drawer wiring
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

  // Data endpoints (cache-bust with v=timestamp)
  const citationsURL = `./data/citations/citations.json?v=${Date.now()}`;
  const breachesURL  = `./data/breaches/breaches.json?v=${Date.now()}`;

  // Load + render
  Promise.all([
    fetch(citationsURL),
    fetch(breachesURL)
  ])
  .then(async ([citRes, breachRes]) => {
    // Use info logs to avoid red console noise
    console.info('CITATIONS fetch:', citRes.status, citRes.url);
    console.info('BREACHES fetch:', breachRes.status, breachRes.url);

    if (!citRes.ok || !breachRes.ok) throw new Error('Failed to fetch data');
    const citations = await citRes.json();
    const breachTags = await breachRes.json();

    populateFilter(breachTags);
    renderCitations(citations);

    // Wire up filter/search
    breachFilter.addEventListener('change', () => {
      renderCitations(filterSearch(citations));
    });
    keywordSearch.addEventListener('input', () => {
      renderCitations(filterSearch(citations));
    });
  })
  .catch(err => {
    console.error('Error loading citations or breaches:', err);
    if (citationsContainer) citationsContainer.innerHTML = `<p>Error loading citations.</p>`;
  });

  function populateFilter(tags) {
    if (!Array.isArray(tags)) return;
    breachFilter.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = 'All';
    breachFilter.appendChild(optAll);

    tags.forEach(t => {
      const opt = document.createElement('option');
      opt.value = String(t).trim();
      opt.textContent = String(t).trim();
      breachFilter.appendChild(opt);
    });
  }

  function filterSearch(all) {
    const byTag = breachFilter.value.trim().toLowerCase();
    const q = keywordSearch.value.trim().toLowerCase();

    return all.filter(item => {
      // tag match?
      let tagPass = true;
      if (byTag) {
        const flags = Array.isArray(item.compliance_flags) ? item.compliance_flags : [];
        tagPass = flags.some(f => String(f).toLowerCase() === byTag);
      }
      if (!tagPass) return false;

      // keyword match across few fields
      if (!q) return true;
      const hay = [
        item.case_name, item.citation, item.summary, item.legal_principle,
        item.holding, item.authority_basis, (item.sources || []).join(' ')
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  function renderCitations(list) {
    if (!citationsContainer) return;
    if (!Array.isArray(list) || list.length === 0) {
      citationsContainer.innerHTML = `<p>No citations found.</p>`;
      return;
    }
    citationsContainer.innerHTML = list.map(renderCard).join('');
  }

  function safeText(v){ return v ? String(v) : ''; }
  function line(label, v){
    const txt = safeText(v);
    if (!txt) return '';
    return `<p><strong>${label}:</strong> ${txt}</p>`;
  }

  function renderCard(citation){
    const sources = Array.isArray(citation.sources) ? citation.sources : [];
    const flags = Array.isArray(citation.compliance_flags) ? citation.compliance_flags : [];

    // Build “Sources” as clickable list when the string looks like a URL
    const sourcesHtml = sources.length
      ? sources.map(s => {
          const t = String(s);
          const isUrl = /^https?:\/\//i.test(t);
          return isUrl
            ? `<a href="${t}" target="_blank" rel="noopener">${t}</a>`
            : t;
        }).join('<br/>')
      : '';

    return `
      <div class="citation-card">
        <h2>${safeText(citation.case_name)}</h2>
        ${line('Citation', citation.citation)}
        ${line('Year', citation.year)}
        ${line('Court', citation.court)}
        ${line('Jurisdiction', citation.jurisdiction)}
        ${line('Summary', citation.summary)}
        ${line('Legal Principle', citation.legal_principle)}
        ${line('Holding', citation.holding)}
        ${line('Authority Basis', citation.authority_basis)}
        ${sourcesHtml ? `<p><strong>Sources:</strong><br/>${sourcesHtml}</p>` : ''}
        ${flags.length ? `<p><strong>Compliance Flags:</strong> ${flags.join(', ')}</p>` : ''}
      </div>
    `;
  }

  //
  // (Optional) Drawer form wire-up remains noop unless you’re ready to enable saving
  //
  const validateSaveBtn = document.getElementById('validateSave');
  const formStatus = document.getElementById('formStatus');
  if (validateSaveBtn) {
    validateSaveBtn.addEventListener('click', () => {
      // Only local validation stub so far
      if (formStatus) {
        formStatus.style.display = 'block';
        formStatus.textContent = 'Validation passed (stub). Download/commit flow handled via Bulk Import.';
      }
    });
  }
});
