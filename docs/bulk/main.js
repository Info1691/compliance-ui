(() => {
  // -------------------- Config & State --------------------
  const CURRENT_URL = '../data/citations/citations.json?v=' + Date.now();

  let currentData = [];   // loaded from repo
  let newData = [];       // from paste JSON or parsed CSV
  let merged = null;      // result of merge

  // -------------------- DOM helpers -----------------------
  const $ = (sel) => document.querySelector(sel);

  const el = {
    btnLoadCurrent:     $('#btnLoadCurrent'),
    loadInfo:           $('#loadInfo'),
    btnPasteJSON:       $('#btnPasteJSON'),
    csvFile:            $('#csvFile'),
    btnParseCSV:        $('#btnParseCSV'),
    pasteBox:           $('#pasteBox'),
    chkAllowUpdates:    $('#chkAllowUpdates'),
    btnRunValidation:   $('#btnRunValidation'),
    validationReport:   $('#validationReport'),
    btnMerge:           $('#btnMerge'),
    btnDownload:        $('#btnDownload'),
    mergeReport:        $('#mergeReport'),
    status:             $('#status')
  };

  const log = (msg) => {
    if (!el.status) return;
    const line = (typeof msg === 'string') ? msg : JSON.stringify(msg, null, 2);
    el.status.textContent += line + '\n';
  };
  const clear = (node) => { if (node) node.textContent = ''; };

  // -------------------- CSV parsing (robust enough) -------
  function parseCSV(text) {
    // Basic RFC4180-ish parser to handle quotes/commas/newlines.
    const rows = [];
    let cur = '', row = [], inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i+1];

      if (c === '"' && inQuotes && n === '"') { cur += '"'; i++; continue; }
      if (c === '"') { inQuotes = !inQuotes; continue; }

      if (!inQuotes && (c === ',')) { row.push(cur); cur=''; continue; }
      if (!inQuotes && (c === '\n' || c === '\r')) {
        if (c === '\r' && n === '\n') i++; // CRLF
        row.push(cur); rows.push(row); row=[]; cur=''; continue;
      }
      cur += c;
    }
    row.push(cur); rows.push(row);

    // convert to objects using first row as header
    const header = rows.shift().map(h => h.trim());
    return rows
      .filter(r => r.some(v => v.trim() !== ''))
      .map(r => {
        const obj = {};
        header.forEach((h, idx) => obj[h] = (r[idx] ?? '').trim());
        return obj;
      });
  }

  // -------------------- Normalizers -----------------------
  const ARRAY_FIELDS = ['compliance_flags', 'tags', 'key_points', 'sources'];

  function normalizeRecord(obj) {
    const out = { ...obj };

    // year -> number if possible
    if (out.year && /^\d{4}$/.test(String(out.year))) out.year = Number(out.year);

    // split array fields on pipe |
    ARRAY_FIELDS.forEach(f => {
      if (out[f] == null || out[f] === '') { out[f] = []; return; }
      if (Array.isArray(out[f])) return;
      out[f] = String(out[f]).split('|').map(s => s.trim()).filter(Boolean);
    });

    // printable -> boolean
    if (typeof out.printable === 'string') {
      out.printable = /^(true|1|yes)$/i.test(out.printable.trim());
    } else if (out.printable == null) {
      out.printable = true; // default
    }

    return out;
  }

  function normalizeRecords(arr) {
    return arr.map(normalizeRecord);
  }

  // -------------------- Validation ------------------------
  const REQUIRED = ['id', 'case_name', 'citation', 'year', 'court', 'jurisdiction', 'summary'];

  function validate(records, allowUpdates, currentIndex) {
    const errors = [];
    const seen = new Set();

    records.forEach((r, i) => {
      // required fields present
      const missing = REQUIRED.filter(k => {
        const v = r[k];
        return v === undefined || v === null || String(v).trim() === '';
      });
      if (missing.length) {
        errors.push(`Row ${i+1}: missing required fields: ${missing.join(', ')}`);
      }

      // id uniqueness within new batch
      if (r.id) {
        if (seen.has(r.id)) errors.push(`Row ${i+1}: duplicate id within import: ${r.id}`);
        seen.add(r.id);
      }

      // id collision vs current
      if (!allowUpdates && r.id && currentIndex.has(r.id)) {
        errors.push(`Row ${i+1}: id already exists in current dataset (updates disabled): ${r.id}`);
      }
    });

    return { ok: errors.length === 0, errors };
  }

  function indexById(arr) {
    const m = new Map();
    arr.forEach((r, i) => { if (r.id) m.set(r.id, i); });
    return m;
  }

  // -------------------- Merge -----------------------------
  function doMerge(current, incoming, allowUpdates) {
    const out = current.map(x => ({ ...x })); // clone
    const idx = indexById(out);

    let added = 0, updated = 0;
    incoming.forEach(r => {
      if (r.id && idx.has(r.id)) {
        if (allowUpdates) {
          out[idx.get(r.id)] = { ...out[idx.get(r.id)], ...r };
          updated++;
        }
        // else: skip (already validated)
      } else {
        out.push(r);
        added++;
      }
    });

    return { merged: out, added, updated };
  }

  // -------------------- Wire up UI ------------------------
  // Load current
  el.btnLoadCurrent?.addEventListener('click', async () => {
    clear(el.status); clear(el.loadInfo);
    try {
      log(`Fetching: ${CURRENT_URL}`);
      const res = await fetch(CURRENT_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      currentData = await res.json();
      if (!Array.isArray(currentData)) currentData = [];
      el.loadInfo.textContent = `Loaded ${currentData.length} records.`;
      log('Loaded current dataset.');
    } catch (e) {
      log(`Load error: ${e.message || e}`);
    }
  });

  // Paste JSON
  el.btnPasteJSON?.addEventListener('click', () => {
    try {
      const txt = (el.pasteBox?.value || '').trim();
      if (!txt) { alert('Paste JSON into the box first.'); return; }
      const parsed = JSON.parse(txt);
      if (!Array.isArray(parsed)) throw new Error('Pasted JSON must be an array of records.');
      newData = normalizeRecords(parsed);
      el.validationReport.textContent = `Pasted ${newData.length} records.`;
    } catch (e) {
      el.validationReport.textContent = `Paste/Parse error: ${e.message || e}`;
    }
  });

  // Parse CSV
  el.btnParseCSV?.addEventListener('click', async () => {
    clear(el.validationReport);
    const file = el.csvFile?.files?.[0];
    if (!file) { alert('Choose a CSV file first.'); return; }
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) throw new Error('CSV appears to be empty.');
      newData = normalizeRecords(rows);
      el.validationReport.textContent = `Parsed ${newData.length} records from CSV.`;
    } catch (e) {
      el.validationReport.textContent = `CSV parse error: ${e.message || e}`;
    }
  });

  // Validate
  el.btnRunValidation?.addEventListener('click', () => {
    clear(el.mergeReport);
    if (!currentData.length) {
      el.validationReport.textContent = 'Load current dataset first.';
      return;
    }
    if (!newData.length) {
      el.validationReport.textContent = 'Add new data (paste JSON or parse CSV) before validating.';
      return;
    }
    const allowUpdates = !!el.chkAllowUpdates?.checked;
    const idx = indexById(currentData);
    const { ok, errors } = validate(newData, allowUpdates, idx);
    if (ok) {
      el.validationReport.textContent = `Validation OK. ${newData.length} record(s) ready.`;
    } else {
      el.validationReport.textContent = `Validation FAILED:\n- ` + errors.join('\n- ');
    }
  });

  // Merge
  el.btnMerge?.addEventListener('click', () => {
    clear(el.mergeReport);
    if (!currentData.length || !newData.length) {
      el.mergeReport.textContent = 'Load current and add new data first.';
      return;
    }
    const allowUpdates = !!el.chkAllowUpdates?.checked;
    const idx = indexById(currentData);
    const { ok, errors } = validate(newData, allowUpdates, idx);
    if (!ok) {
      el.mergeReport.textContent = 'Please fix validation errors before merging.';
      return;
    }
    const res = doMerge(currentData, newData, allowUpdates);
    merged = res.merged;
    el.mergeReport.textContent = `Merged. Added: ${res.added}, Updated: ${res.updated}. Total: ${merged.length}.`;
    if (el.btnDownload) el.btnDownload.disabled = false;
  });

  // Download
  el.btnDownload?.addEventListener('click', () => {
    if (!merged || !merged.length) {
      alert('Nothing to download. Merge first.');
      return;
    }
    const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'citations.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

})();
