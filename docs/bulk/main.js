document.addEventListener('DOMContentLoaded', () => {
  const CITATIONS_URL = '../data/citations/citations.json';
  const BREACHES_URL  = '../data/breaches/breaches.json';

  const btnLoadCurrent = document.getElementById('btnLoadCurrent');
  const currentStatus  = document.getElementById('currentStatus');

  const tabs = document.querySelectorAll('.tab');
  const panes = document.querySelectorAll('.tabpane');
  const btnParseJSON = document.getElementById('btnParseJSON');
  const btnParseCSV  = document.getElementById('btnParseCSV');
  const jsonInput    = document.getElementById('jsonInput');
  const csvFile      = document.getElementById('csvFile');
  const importStatus = document.getElementById('importStatus');

  const allowUpdates = document.getElementById('allowUpdates');
  const btnValidate  = document.getElementById('btnValidate');
  const validationSummary = document.getElementById('validationSummary');
  const validationTable   = document.getElementById('validationTable');

  const btnMerge   = document.getElementById('btnMerge');
  const btnDownload= document.getElementById('btnDownload');
  const mergeStatus= document.getElementById('mergeStatus');

  let current = [];   // loaded from repo
  let incoming = [];  // parsed from user
  let breaches = [];

  // Tabs
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    panes.forEach(p => p.classList.remove('active'));
    t.classList.add('active');
    const id = 'tab-' + t.dataset.tab;
    document.getElementById(id).classList.add('active');
  }));

  // Load current dataset
  btnLoadCurrent.addEventListener('click', async () => {
    currentStatus.textContent = 'Loading current citations.json…';
    try {
      const r = await fetch(CITATIONS_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      current = await r.json();
      currentStatus.textContent = `Loaded ${current.length} records from citations.json`;
    } catch (e) {
      currentStatus.textContent = 'Failed to load current dataset: ' + e.message;
    }

    // optional: load breaches (not strictly needed for validation)
    try {
      const r = await fetch(BREACHES_URL, { cache: 'no-store' });
      if (r.ok) breaches = await r.json();
    } catch {}
  });

  // Parse JSON
  btnParseJSON.addEventListener('click', () => {
    importStatus.textContent = '';
    try {
      const parsed = JSON.parse(jsonInput.value || '[]');
      if (!Array.isArray(parsed)) throw new Error('Root must be an array');
      incoming = parsed;
      importStatus.textContent = `Parsed ${incoming.length} item(s) from JSON.`;
    } catch (e) {
      importStatus.textContent = 'JSON parse error: ' + e.message;
      incoming = [];
    }
  });

  // Parse CSV (simple)
  btnParseCSV.addEventListener('click', async () => {
    importStatus.textContent = '';
    const file = csvFile.files && csvFile.files[0];
    if (!file) {
      importStatus.textContent = 'Choose a CSV file first.';
      return;
    }
    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(Boolean);
    if (rows.length < 2) {
      importStatus.textContent = 'CSV must have headers + at least one row.';
      return;
    }
    const headers = rows[0].split(',').map(h => h.trim());
    const arr = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(','); // basic CSV; if you need quotes/escapes, we can add a parser later
      const obj = {};
      headers.forEach((h, idx) => obj[h] = (cols[idx] || '').trim());
      // normalize arrays for some fields using | separator
      obj.compliance_flags = splitPipe(obj.compliance_flags);
      obj.key_points       = splitPipe(obj.key_points);
      obj.tags             = splitPipe(obj.tags);
      obj.sources          = splitPipe(obj.sources);
      // ensure types where possible
      if (obj.year) obj.year = Number(obj.year);
      arr.push(obj);
    }
    incoming = arr;
    importStatus.textContent = `Parsed ${incoming.length} item(s) from CSV.`;
  });

  function splitPipe(s) {
    return (s || '').split('|').map(x => x.trim()).filter(Boolean);
  }
  function splitCSV(s) {
    return (s || '').split(',').map(x => x.trim()).filter(Boolean);
  }

  // Validation
  btnValidate.addEventListener('click', () => {
    if (!current.length) {
      validationSummary.textContent = 'Load current citations.json first.';
      return;
    }
    if (!incoming.length) {
      validationSummary.textContent = 'No incoming items to validate. Paste JSON or upload CSV.';
      return;
    }
    const idSet = new Set(current.map(c => (c.id || '').trim().toLowerCase()));

    const results = incoming.map((entry, idx) => {
      const errs = validate(entry, idSet, allowUpdates.checked);
      const status = errs.length ? 'FAIL' : 'OK';
      return { index: idx+1, id: entry.id || '', status, errors: errs };
    });

    const ok = results.filter(r => r.status === 'OK').length;
    const fail = results.length - ok;
    validationSummary.textContent = `Validated ${results.length} item(s): ${ok} OK, ${fail} FAIL.`;

    // Render table
    const rows = results.map(r => `
      <tr class="${r.status === 'FAIL' ? 'fail' : ''}">
        <td>${r.index}</td>
        <td>${escapeHtml(r.id)}</td>
        <td>${r.status}</td>
        <td>${escapeHtml(r.errors.join(' | '))}</td>
      </tr>
    `).join('');
    validationTable.innerHTML = `
      <table>
        <thead><tr><th>#</th><th>ID</th><th>Status</th><th>Issues</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  });

  function validate(entry, existingIds, allowUpdatesFlag) {
    const errs = [];
    const req = ['id','case_name','citation','year','court','jurisdiction','summary'];
    req.forEach(k => { if (!entry[k] && entry[k] !== 0) errs.push(`Missing ${k}`); });

    const id = (entry.id || '').trim().toLowerCase();
    if (existingIds.has(id) && !allowUpdatesFlag) errs.push('Duplicate ID (updates not allowed)');

    const y = Number(entry.year);
    const cur = new Date().getFullYear();
    if (!Number.isFinite(y) || y < 1800 || y > cur + 1) errs.push(`Year out of range (1800–${cur+1})`);

    // ensure arrays for arrays
    const arrayFields = ['compliance_flags','key_points','tags','sources'];
    arrayFields.forEach(f => {
      if (entry[f] && !Array.isArray(entry[f])) errs.push(`${f} must be an array`);
    });

    // URL check
    const urlOk = (u) => /^https?:\/\/[^\s]+$/i.test(u);
    const bad = (entry.sources || []).filter(u => !urlOk(u));
    if (bad.length) errs.push(`Invalid URLs: ${bad.join(', ')}`);

    return errs;
  }

  // Merge
  btnMerge.addEventListener('click', () => {
    if (!current.length || !incoming.length) {
      mergeStatus.textContent = 'Load current and parse incoming first.';
      return;
    }
    const allow = allowUpdates.checked;
    const map = new Map(current.map(c => [ (c.id||'').trim().toLowerCase(), c ]));

    let added = 0, updated = 0, skipped = 0;

    incoming.forEach(n => {
      const key = (n.id || '').trim().toLowerCase();
      if (!key) { skipped++; return; }

      // normalize: ensure arrays
      if (n.compliance_flags && !Array.isArray(n.compliance_flags)) n.compliance_flags = splitCSV(n.compliance_flags);
      if (n.key_points && !Array.isArray(n.key_points)) n.key_points = splitCSV(n.key_points);
      if (n.tags && !Array.isArray(n.tags)) n.tags = splitCSV(n.tags);
      if (n.sources && !Array.isArray(n.sources)) n.sources = splitCSV(n.sources);
      if (n.year) n.year = Number(n.year);

      if (map.has(key)) {
        if (allow) {
          // shallow merge: prefer incoming values when provided
          const prev = map.get(key);
          const merged = { ...prev, ...n };
          map.set(key, merged);
          updated++;
        } else {
          skipped++;
        }
      } else {
        map.set(key, n);
        added++;
      }
    });

    current = Array.from(map.values());
    btnDownload.disabled = false;
    mergeStatus.textContent = `Merge complete: ${added} added, ${updated} updated, ${skipped} skipped. Current total: ${current.length}.`;
  });

  // Download merged file
  btnDownload.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.href = url; a.download = `citations-merged-${ts}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  // utils
  function escapeHtml(s){ return (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) }
});
