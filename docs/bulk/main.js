(function () {
  // ---- CONFIG ----
  const REGISTRY_URLS = [
    'data/citations.json',         // primary (your repo)
    'citations.json'               // loose fallback if you ever move it
  ];

  // ---- DOM ----
  const $ = (id) => document.getElementById(id);
  const els = {
    file: $('fileInput'),
    fileName: $('fileName'),
    autoFill: $('autoFill'),
    paste: $('pasteBox'),
    parse: $('parseBtn'),
    clear: $('clearBtn'),
    preview: $('preview'),
    acceptedList: $('acceptedList'),
    acceptedCount: $('acceptedCount'),
    overwrite: $('overwrite'),
    sortBy: $('sortBy'),
    genBtn: $('genBtn'),
    copyBtn: $('copyBtn'),
    downloadBtn: $('downloadBtn'),
    status: $('status'),
    targetPath: $('targetPath')
  };

  // ---- STATE ----
  let parsedEntries = [];   // entries from upload/paste (validated)
  let mergedEntries = [];   // registry merged preview
  let registry = [];        // existing registry we fetched
  let registryUrlUsed = ''; // which URL succeeded

  // ---- UTIL ----
  const slug = (s) => (s || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/\s+/g, '-');

  const pretty = (obj) => JSON.stringify(obj, null, 2);

  const showStatus = (msg) => { els.status.textContent = msg || ''; };
  const setPreview = (obj) => { els.preview.textContent = pretty(obj ?? []); };

  function parseCSV(text) {
    // very small CSV helper (expects header row; commas; no quoted commas)
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim());
      const obj = {};
      headers.forEach((h, i) => obj[h] = cols[i] ?? '');
      return obj;
    });
  }

  function inferFromTxtName(name) {
    // Example: "State House Trust v Friend [2025] JRC 158.txt"
    const base = name.replace(/\.[^.]+$/, '');
    const yearMatch = base.match(/\[(\d{4})]/);
    const year = yearMatch ? +yearMatch[1] : undefined;

    // citation: looks like "[2025] JRC 158"
    const citMatch = base.match(/\[\d{4}\]\s+[A-Z]+(?:\s*\d+)?(?:\s*\d+)?/);
    const citation = citMatch ? citMatch[0] : '';

    // crude case_name: strip citation tail
    let case_name = base.replace(/\s*\[\d{4}\].*$/, '').trim();
    case_name = case_name.replace(/[_\-]+/g, ' ');

    // id: slug with year suffix
    const id = slug(case_name + (year ? '-' + year : ''));

    return {
      id,
      case_name,
      citation,
      year: year ?? '',
      court: '',            // user can edit later
      jurisdiction: '',     // user can edit later
      summary: '',
      holding: '',
      source: '',
      compliance_flags: '',
      tags: '',
      observed_conduct: '',
      anomaly_detected: '',
      breached_law_or_rule: '',
      authority_basis: '',
      canonical_breach_tag: '',
      case_link: '',
      full_text: ''         // summary is expected later; keep raw long text OUT
    };
  }

  function validateEntry(e) {
    const errs = [];
    if (!/^[a-z0-9-]+$/.test(e.id || '')) errs.push('id must be lowercase letters, numbers, hyphens');
    if (!e.case_name) errs.push('case_name required');
    if (!/\[\d{4}\]/.test(e.citation || '')) errs.push('citation must include year like [2025]');
    if (!(String(e.year || '').match(/^\d{4}$/))) errs.push('year must be a 4-digit integer');
    return errs;
  }

  function showAccepted(list) {
    els.acceptedList.innerHTML = '';
    list.forEach((e) => {
      const li = document.createElement('li');
      li.textContent = `${e.case_name} — ${e.citation}`;
      els.acceptedList.appendChild(li);
    });
    els.acceptedCount.textContent = String(list.length);
  }

  async function loadRegistryIfNeeded() {
    if (registry.length) return;
    let lastErr;
    for (const url of REGISTRY_URLS) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error(`${url} → ${r.status}`);
        const data = await r.json();
        if (!Array.isArray(data)) throw new Error('registry is not an array');
        registry = data;
        registryUrlUsed = url;
        els.targetPath.textContent = url;
        return;
      } catch (e) { lastErr = e; }
    }
    showStatus(`Note: could not fetch existing registry (${lastErr?.message}). You can still generate JSON from what was accepted.`);
  }

  function mergeEntries() {
    const overwrite = els.overwrite.checked;
    const byId = new Map(registry.map(x => [x.id, x]));
    parsedEntries.forEach(e => {
      if (byId.has(e.id) && !overwrite) return;
      byId.set(e.id, e);
    });
    let arr = Array.from(byId.values());
    const sortBy = els.sortBy.value;
    arr.sort((a, b) => {
      if (sortBy === 'year') return (a.year||0) - (b.year||0);
      return String(a[sortBy]||'').localeCompare(String(b[sortBy]||''), 'en', { sensitivity: 'base' });
    });
    mergedEntries = arr;
    setPreview(mergedEntries);
    showStatus(`Merged ${parsedEntries.length} new entr${parsedEntries.length===1?'y':'ies'} with ${registry.length} existing.`);
  }

  // ---- EVENTS ----
  els.file.addEventListener('change', () => {
    const f = els.file.files?.[0];
    els.fileName.textContent = f ? f.name : '';
  });

  els.clear.addEventListener('click', () => {
    els.file.value = '';
    els.fileName.textContent = '';
    els.paste.value = '';
    parsedEntries = [];
    mergedEntries = [];
    showAccepted([]);
    setPreview([]);
    showStatus('');
  });

  els.parse.addEventListener('click', async () => {
    try {
      showStatus('Parsing…');
      parsedEntries = [];

      // 1) file?
      const f = els.file.files?.[0];
      if (f) {
        const text = await f.text();
        const ext = (f.name.split('.').pop() || '').toLowerCase();

        if (ext === 'json') {
          const data = JSON.parse(text);
          if (Array.isArray(data)) parsedEntries.push(...data);
          else parsedEntries.push(data);
        } else if (ext === 'csv') {
          parsedEntries.push(...parseCSV(text));
        } else if (ext === 'txt') {
          // We only infer metadata from the filename; we do NOT shove the raw long
          // body into full_text here (to avoid megastrings).
          parsedEntries.push(inferFromTxtName(f.name));
        }
      }

      // 2) paste box?
      const pasted = els.paste.value.trim();
      if (pasted) {
        if (pasted.startsWith('[') || pasted.startsWith('{')) {
          const data = JSON.parse(pasted);
          Array.isArray(data) ? parsedEntries.push(...data) : parsedEntries.push(data);
        } else {
          // assume CSV
          parsedEntries.push(...parseCSV(pasted));
        }
      }

      // Validate
      const accepted = [];
      const rejected = [];
      parsedEntries.forEach((e) => {
        const errs = validateEntry(e);
        if (errs.length) {
          rejected.push({ e, errs });
        } else {
          // Normalise optional fields so schema is consistent
          const allFields = ["id","case_name","citation","year","court","jurisdiction","summary","holding","source","compliance_flags","tags","observed_conduct","anomaly_detected","breached_law_or_rule","authority_basis","canonical_breach_tag","case_link","full_text"];
          allFields.forEach(k => { if (!(k in e)) e[k] = ""; });
          accepted.push(e);
        }
      });

      parsedEntries = accepted;
      showAccepted(accepted);

      await loadRegistryIfNeeded();
      setPreview(accepted);
      if (rejected.length) {
        showStatus(`Accepted ${accepted.length}. Rejected ${rejected.length} (see console).`);
        console.warn('Rejected entries', rejected);
      } else {
        showStatus(`Accepted ${accepted.length}. Ready to merge.`);
      }
    } catch (e) {
      console.error(e);
      showStatus(`Error: ${e.message}`);
    }
  });

  els.genBtn.addEventListener('click', () => {
    if (!parsedEntries.length && !registry.length) {
      showStatus('Nothing to merge yet.');
      return;
    }
    mergeEntries();
  });

  els.copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.preview.textContent || '[]');
      showStatus('Merged JSON copied to clipboard.');
    } catch {
      showStatus('Copy failed (clipboard not available).');
    }
  });

  els.downloadBtn.addEventListener('click', () => {
    const blob = new Blob([els.preview.textContent || '[]'], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const name = (registryUrlUsed || 'citations.json').split('/').pop();
    a.download = name?.replace(/\.json$/i, '') + '.merged.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showStatus('Download started.');
  });

  // initial
  setPreview([]);
  showAccepted([]);
})();
