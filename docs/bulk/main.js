/* Bulk Uploader — JSON/CSV/TXT + Accepted marker + single merged output
   Never writes. Prepares merged JSON for copy-paste to data/citations.json
*/

(function () {
  // ---------- config ----------
  const REGISTRY_PATHS = [
    'data/citations.json',     // primary
    'citations.json'           // fallback (root)
  ];

  // ---------- dom ----------
  const $ = (s) => document.querySelector(s);
  const els = {
    file: $('#fileInput'),
    paste: $('#pasteBox'),
    parseBtn: $('#parseBtn'),
    clearBtn: $('#clearBtn'),
    results: $('#results'),
    acceptedList: $('#acceptedList'),
    acceptedCount: $('#acceptedCount'),
    overwrite: $('#overwrite'),
    sortBy: $('#sortBy'),
    generateBtn: $('#generateBtn'),
    mergedOutput: $('#mergedOutput'),
  };

  // ---------- state ----------
  let existing = [];      // current registry
  let parsed = [];        // valid entries from most recent input
  let notes = [];         // parse notes

  // ---------- init ----------
  (async function init() {
    existing = await loadRegistry();
    renderMerged(existing);
    setStatus('Loaded existing registry: ' + existing.length + ' entries.');
  })();

  // ---------- registry loader with fallbacks ----------
  async function loadRegistry() {
    for (const url of REGISTRY_PATHS) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (r.ok) return await r.json();
      } catch (_) {}
    }
    return [];
  }

  // ---------- ui renderers ----------
  function setStatus(msg) {
    els.results.textContent = msg;
  }

  function renderAccepted(list) {
    els.acceptedList.innerHTML = '';
    els.acceptedCount.textContent = String(list.length);
    for (const e of list) {
      const li = document.createElement('li');
      li.textContent = (e.case_name || e.title || e.id || '(untitled)') +
                       (e.citation ? ` — ${e.citation}` : '');
      els.acceptedList.appendChild(li);
    }
  }

  function renderMerged(list) {
    els.mergedOutput.textContent = JSON.stringify(list, null, 2);
  }

  // ---------- validators ----------
  const idRe = /^[a-z0-9-]+$/; // “lowercase letters, numbers, hyphens”
  function validateEntry(e) {
    const errs = [];

    // required
    if (!e.id) errs.push('id required');
    if (!e.case_name) errs.push('case_name required');
    if (!e.citation) errs.push('citation required');
    if (!e.year) errs.push('year required');

    // formats
    if (e.id && !idRe.test(e.id)) errs.push('id must be lowercase letters, numbers, hyphens');
    if (e.year && !/^\d{4}$/.test(String(e.year))) errs.push('year must be a 4-digit integer');

    // normalize nice-to-have fields
    e.jurisdiction ||= 'Jersey';
    e.court ||= 'Royal Court';

    return errs;
  }

  function normalizeEntry(e) {
    // ensure known keys exist (keeps JSON shape consistent)
    return {
      id: e.id || '',
      case_name: e.case_name || '',
      citation: e.citation || '',
      year: Number(e.year) || '',
      court: e.court || 'Royal Court',
      jurisdiction: e.jurisdiction || 'Jersey',
      summary: e.summary || '',
      holding: e.holding || '',
      source: e.source || '',
      compliance_flags: e.compliance_flags || '',
      tags: e.tags || '',
      observed_conduct: e.observed_conduct || '',
      anomaly_detected: e.anomaly_detected || '',
      breached_law_or_rule: e.breached_law_or_rule || '',
      authority_basis: e.authority_basis || '',
      canonical_breach_tag: e.canonical_breach_tag || '',
      case_link: e.case_link || '',
      full_text: e.full_text || ''   // TXT path puts text here (optional)
    };
  }

  // ---------- parsers ----------
  async function readFileAsText(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsText(file);
    });
  }

  function parseJSON(src) {
    const out = [];
    const arr = JSON.parse(src); // throws if not valid
    if (!Array.isArray(arr)) throw new Error('JSON must be an array of objects');
    for (const raw of arr) out.push(normalizeEntry(raw));
    return out;
  }

  function parseCSV(src) {
    // tiny CSV parser (no quoted newlines). Fine for our simple headers.
    const lines = src.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines.shift().split(',').map(h => h.trim());
    const out = [];
    for (const ln of lines) {
      const cols = ln.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = (cols[i] || '').trim());
      out.push(normalizeEntry(obj));
    }
    return out;
  }

  function guessFromFilename(name = '') {
    // e.g. "State House Trust v Friend [2025] JRC 158.txt"
    const noExt = name.replace(/\.[^/.]+$/, '');
    const citationMatch = noExt.match(/\[(\d{4})\]\s*JRC\s*([0-9A-Za-z]+)/i);
    const year = citationMatch ? citationMatch[1] : '';
    const jrcNum = citationMatch ? citationMatch[2] : '';
    const citation = citationMatch ? `[${year}] JRC ${jrcNum}` : '';
    const caseName = noExt.replace(/\s*\[\d{4}\].*$/,'').trim();
    const id = (caseName + '-' + year)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/(^-|-$)/g,'');

    return { id, case_name: caseName, year, citation };
  }

  function parseTXT(src, filename) {
    const meta = guessFromFilename(filename || '');
    const entry = normalizeEntry({
      ...meta,
      // Put the whole TXT into full_text so you can view it in your viewer if desired
      full_text: src
    });
    return [entry];
  }

  async function parseAny(file, pasted) {
    notes = [];
    let raw = '';
    if (file) raw = await readFileAsText(file);
    else raw = pasted || '';

    if (!raw.trim()) return { valid: [], errors: ['No input provided'] };

    try {
      if (file && /\.json$/i.test(file.name)) {
        return { valid: parseJSON(raw), errors: [] };
      }
      if (file && /\.csv$/i.test(file.name)) {
        return { valid: parseCSV(raw), errors: [] };
      }
      if (file && /\.txt$/i.test(file.name)) {
        return { valid: parseTXT(raw, file.name), errors: [] };
      }

      // If no file / unknown extension: try JSON → CSV → TXT fallback
      try { return { valid: parseJSON(raw), errors: [] }; } catch {}
      try { return { valid: parseCSV(raw), errors: [] }; } catch {}
      return { valid: parseTXT(raw, ''), errors: [] };

    } catch (err) {
      return { valid: [], errors: [String(err.message || err)] };
    }
  }

  // ---------- merge generator ----------
  function generateMerged() {
    const overwrite = !!els.overwrite.checked;
    const sortBy = els.sortBy.value || 'case_name';

    // index by id
    const map = new Map(existing.map(e => [e.id, e]));

    for (const n of parsed) {
      if (!n.id) continue; // should not happen after validation
      if (map.has(n.id)) {
        if (overwrite) map.set(n.id, n); // replace
        // else keep existing
      } else {
        map.set(n.id, n);
      }
    }

    // back to array + sort
    const out = Array.from(map.values());
    out.sort((a, b) => {
      const av = (a[sortBy] ?? '').toString().toLowerCase();
      const bv = (b[sortBy] ?? '').toString().toLowerCase();
      if (sortBy === 'year') return (Number(a.year)||0) - (Number(b.year)||0) || av.localeCompare(bv);
      return av.localeCompare(bv);
    });

    renderMerged(out);
  }

  // ---------- events ----------
  els.parseBtn.addEventListener('click', async () => {
    const file = els.file.files && els.file.files[0];
    const pasted = els.paste.value;

    setStatus('Parsing…');
    const { valid, errors } = await parseAny(file, pasted);

    if (errors.length) {
      setStatus('Validation errors:\n\n• ' + errors.join('\n• '));
      renderAccepted([]);
      parsed = [];
      return;
    }

    // validate each entry
    const ok = [];
    const errLines = [];
    valid.forEach((v, i) => {
      const errs = validateEntry(v);
      if (errs.length) {
        errLines.push(`#${i+1}: ` + errs.join('. ') + '.');
      } else {
        ok.push(v);
      }
    });

    parsed = ok;
    if (errLines.length) {
      setStatus('Validation errors:\n\n' + errLines.join('\n'));
    } else {
      setStatus(`All ${ok.length} entries are valid.`);
    }
    renderAccepted(ok);
  });

  els.generateBtn.addEventListener('click', () => {
    generateMerged();
  });

  els.clearBtn.addEventListener('click', () => {
    els.file.value = '';
    els.paste.value = '';
    parsed = [];
    renderAccepted([]);
    setStatus('Cleared.');
    renderMerged(existing);
  });
})();
