document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const citationsContainer = document.getElementById('citationsContainer');
  const breachFilter = document.getElementById('breachFilter');
  const keywordSearch = document.getElementById('keywordSearch');

  const drawer = document.getElementById('drawer');
  const openDrawerBtn = document.getElementById('openDrawerBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');

  const previewModal = document.getElementById('previewModal');
  const previewJson = document.getElementById('previewJson');
  const modalClose = document.getElementById('modalClose');
  const modalCancel = document.getElementById('modalCancel');
  const modalConfirm = document.getElementById('modalConfirm');

  const btnValidate = document.getElementById('btnValidate');
  const downloadBar = document.getElementById('downloadBar');
  const btnDownload = document.getElementById('btnDownload');

  // Form fields
  const F = (id) => document.getElementById(id);
  const fields = {
    id: F('f-id'),
    case_name: F('f-case_name'),
    citation: F('f-citation'),
    year: F('f-year'),
    court: F('f-court'),
    jurisdiction: F('f-jurisdiction'),
    canonical_breach_tag: F('f-canonical_breach_tag'),
    summary: F('f-summary'),
    legal_principle: F('f-legal_principle'),
    holding: F('f-holding'),
    compliance_flags: F('f-compliance_flags'),
    key_points: F('f-key_points'),
    tags: F('f-tags'),
    observed_conduct: F('f-observed_conduct'),
    anomaly_detected: F('f-anomaly_detected'),
    breached_law_or_rule: F('f-breached_law_or_rule'),
    authority_basis: F('f-authority_basis'),
    case_link: F('f-case_link'),
    full_case_text: F('f-full_case_text'),
    sources: F('f-sources'),
    added_by: F('f-added_by'),
    source_confidence: F('f-source_confidence'),
  };

  // Drawer open/close
  if (openDrawerBtn && drawer) {
    openDrawerBtn.addEventListener('click', () => {
      drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    });
  }
  if (closeDrawerBtn && drawer) {
    closeDrawerBtn.addEventListener('click', () => {
      drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    });
  }

  // Data paths
  const CITATIONS_URL = 'data/citations/citations.json';
  const BREACHES_URL  = 'data/breaches/breaches.json';

  let allCitations = [];
  let breaches = [];

  // Helpers
  const extractUrls = (text) => {
    if (!text) return [];
    const re = /(https?:\/\/[^\s)<>\]]+)/gi;
    const out = [];
    let m; while ((m = re.exec(text)) !== null) out.push(m[1].replace(/[),.;]+$/, ''));
    return [...new Set(out)];
  };
  const host = (u) => { try { return new URL(u).hostname; } catch { return u; } };
  const splitCSV = (s) => (s || '').split(',').map(x => x.trim()).filter(Boolean);
  const splitCSVorNL = (s) => (s || '').split(/[,|\n]+/).map(x => x.trim()).filter(Boolean);

  // Validation
  function validateEntry(entry, existingIdsSet) {
    const errs = [];
    const req = ['id','case_name','citation','year','court','jurisdiction','summary'];

    req.forEach(k => {
      if (!entry[k] && entry[k] !== 0) errs.push(`Missing required field: ${k}`);
    });

    // ID uniqueness (case-insensitive)
    const idNorm = (entry.id || '').trim().toLowerCase();
    if (existingIdsSet.has(idNorm)) errs.push('ID already exists.');

    // Year range
    const y = Number(entry.year);
    const currentYear = new Date().getFullYear();
    if (!Number.isFinite(y) || y < 1800 || y > currentYear + 1) {
      errs.push(`Year must be a number between 1800 and ${currentYear + 1}.`);
    }

    // URL validation for sources
    const urlOk = (u) => /^https?:\/\/[^\s]+$/i.test(u);
    const badUrls = (entry.sources || []).filter(u => !urlOk(u));
    if (badUrls.length) errs.push(`Invalid source URLs:\n- ${badUrls.join('\n- ')}`);

    return errs;
  }

  // Render cards
  function renderCitations(list) {
    const container = citationsContainer;
    container.innerHTML = '';
    if (!list.length) { container.innerHTML = '<p>No matching citations.</p>'; return; }

    list.forEach(c => {
      const card = document.createElement('div');
      card.className = 'citation-card';

      let srcs = Array.isArray(c.sources) ? c.sources : [];
      if (!srcs.length) srcs = extractUrls(c.authority_basis);

      const sourcesHtml = srcs.length
        ? `<p><strong>Sources:</strong> ${
            srcs.map(u => `<a href="${u}" target="_blank" rel="noopener">${host(u)}</a>`).join(' · ')
          }</p>` : '';

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
      container.appendChild(card);
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
    } catch (e) {
      console.warn('Breaches unavailable:', e.message);
      breachFilter.innerHTML = '<option value="all">All</option>';
    }
    breachFilter.addEventListener('change', applyFilters);
    keywordSearch.addEventListener('input', applyFilters);
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

  // Build entry from form
  function buildEntryFromForm() {
    const nowIso = new Date().toISOString();
    const sources = splitCSVorNL(fields.sources.value);

    return {
      id: (fields.id.value || '').trim(),
      case_name: (fields.case_name.value || '').trim(),
      citation: (fields.citation.value || '').trim(),
      year: (fields.year.value || '').trim(),
      court: (fields.court.value || '').trim(),
      jurisdiction: (fields.jurisdiction.value || '').trim(),
      summary: (fields.summary.value || '').trim(),

      legal_principle: (fields.legal_principle.value || '').trim(),
      holding: (fields.holding.value || '').trim(),
      compliance_flags: splitCSV(fields.compliance_flags.value),
      key_points: splitCSV(fields.key_points.value),
      tags: splitCSV(fields.tags.value),

      observed_conduct: (fields.observed_conduct.value || '').trim(),
      anomaly_detected: (fields.anomaly_detected.value || '').trim(),
      breached_law_or_rule: (fields.breached_law_or_rule.value || '').trim(),
      authority_basis: (fields.authority_basis.value || '').trim(),
      canonical_breach_tag: (fields.canonical_breach_tag.value || '').trim(),

      case_link: (fields.case_link.value || '').trim(),
      full_case_text: (fields.full_case_text.value || '').trim(),

      sources,
      printable: true,

      // audit (optional, not rendered)
      _audit: {
        added_at: nowIso,
        added_by: (fields.added_by.value || '').trim(),
        source_confidence: (fields.source_confidence.value || '').trim()
      }
    };
  }

  // Validate & preview
  btnValidate.addEventListener('click', () => {
    // Build object
    const entry = buildEntryFromForm();

    // Uniqueness set
    const idSet = new Set(allCitations.map(c => (c.id || '').trim().toLowerCase()));

    // Validate
    const errs = validateEntry(entry, idSet);
    if (errs.length) {
      alert(`Please fix the following issues:\n\n- ${errs.join('\n- ')}`);
      return;
    }

    // Preview JSON
    previewJson.textContent = JSON.stringify(entry, null, 2);
    previewModal.classList.add('open');
    previewModal.setAttribute('aria-hidden', 'false');

    // Confirm handler
    const onConfirm = () => {
      // Add to memory list
      allCitations.push({
        ...entry,
        year: Number(entry.year) // normalize year to number
      });

      // Re-render view and show download bar
      renderCitations(allCitations);
      downloadBar.hidden = false;

      // Close modal & drawer
      previewModal.classList.remove('open');
      previewModal.setAttribute('aria-hidden', 'true');
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');

      // Cleanup
      modalConfirm.removeEventListener('click', onConfirm);
    };

    modalConfirm.addEventListener('click', onConfirm, { once: true });
  });

  // Modal close/cancel
  [modalClose, modalCancel].forEach(btn => {
    btn.addEventListener('click', () => {
      previewModal.classList.remove('open');
      previewModal.setAttribute('aria-hidden', 'true');
    });
  });

  // Download updated citations.json (client-side)
  btnDownload.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(allCitations, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.href = url;
    a.download = `citations-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Init
  loadBreaches();
  loadCitations();
});
