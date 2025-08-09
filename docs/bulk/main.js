<script>
document.addEventListener('DOMContentLoaded', () => {
  // Elements (guarded)
  const backBtn       = document.getElementById('backToViewer');
  const loadBtn       = document.getElementById('loadCurrent');
  const pasteBtn      = document.getElementById('pasteJsonBtn');
  const parseCsvBtn   = document.getElementById('parseCsvBtn');
  const csvInput      = document.getElementById('csvFile');
  const allowUpdates  = document.getElementById('allowUpdates');
  const runValBtn     = document.getElementById('runValidation');
  const mergeBtn      = document.getElementById('mergeBtn');
  const downloadBtn   = document.getElementById('downloadBtn');
  const pasteArea     = document.getElementById('pasteJsonArea');
  const logNode       = document.getElementById('log');

  // State
  let current = []; // citations.json loaded
  let incoming = []; // new items (JSON paste or CSV)

  const bust = () => `?v=${Date.now()}`;
  const CITATIONS_URL = `../data/citations/citations.json${bust()}`;

  function log(msg) {
    if (!logNode) return;
    const line = document.createElement('div');
    line.textContent = (typeof msg === 'string') ? msg : JSON.stringify(msg);
    logNode.appendChild(line);
  }
  function clearLog(){ if (logNode) logNode.innerHTML = ''; }

  function normalizeArray(v){
    if (!v) return [];
    if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
    return String(v).split('|').map(s => s.trim()).filter(Boolean);
  }

  // Navigation
  if (backBtn) backBtn.addEventListener('click', () => {
    window.location.href = '../';
  });

  // Load current dataset
  if (loadBtn) loadBtn.addEventListener('click', async () => {
    clearLog();
    try {
      const res = await fetch(CITATIONS_URL);
      if (!res.ok) throw new Error('Failed to fetch citations.json');
      current = await res.json();
      log(`Loaded ${current.length} records from citations.json`);
    } catch (e) {
      console.error(e); log(e.message || e);
    }
  });

  // Paste JSON -> incoming
  if (pasteBtn) pasteBtn.addEventListener('click', () => {
    clearLog();
    try {
      const raw = pasteArea?.value?.trim();
      if (!raw) return log('Nothing pasted.');
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error('Pasted JSON must be an array of objects.');
      incoming = data;
      log(`Pasted ${incoming.length} records (JSON).`);
    } catch (e) {
      console.error(e); log(e.message || e);
    }
  });

  // CSV -> incoming
  if (parseCsvBtn) parseCsvBtn.addEventListener('click', async () => {
    clearLog();
    try {
      if (!csvInput?.files?.length) return log('No CSV selected.');
      const text = await csvInput.files[0].text();
      const rows = text.split(/\r?\n/).filter(Boolean);
      if (!rows.length) return log('Empty CSV.');

      const headers = rows[0].split(',').map(h => h.trim());
      const req = ['id','case_name','citation','year','court','jurisdiction','summary'];
      const missing = req.filter(h => !headers.includes(h));
      if (missing.length) return log(`CSV missing required headers: ${missing.join(', ')}`);

      const out = [];
      for (let i=1;i<rows.length;i++){
        const cols = rows[i].split(','); // simple CSV (no quoted commas)
        const obj = {};
        headers.forEach((h,idx)=> obj[h] = cols[idx] ?? '');
        // normalize array-ish fields
        ['compliance_flags','tags','key_points','sources'].forEach(k => obj[k] = normalizeArray(obj[k]));
        out.push(obj);
      }
      incoming = out;
      log(`Parsed ${incoming.length} records from CSV.`);
    } catch (e) {
      console.error(e); log(e.message || e);
    }
  });

  // Validate
  if (runValBtn) runValBtn.addEventListener('click', () => {
    clearLog();
    const seen = new Set(current.map(c => c.id));
    let ok = true;
    for (const r of incoming) {
      if (!r.id) { ok = false; log('Record missing id'); }
      if (!r.case_name) { ok = false; log(`Missing case_name for ${r.id}`); }
      if (!r.citation) { ok = false; log(`Missing citation for ${r.id}`); }
      if (!r.year) { ok = false; log(`Missing year for ${r.id}`); }
      if (!r.court) { ok = false; log(`Missing court for ${r.id}`); }
      if (!r.jurisdiction) { ok = false; log(`Missing jurisdiction for ${r.id}`); }
      if (!r.summary) { ok = false; log(`Missing summary for ${r.id}`); }

      if (!allowUpdates?.checked && seen.has(r.id)) {
        ok = false; log(`Duplicate id not allowed: ${r.id}`);
      }
    }
    log(ok ? 'Validation OK.' : 'Validation failed. See messages above.');
  });

  // Merge
  if (mergeBtn) mergeBtn.addEventListener('click', () => {
    clearLog();
    if (!incoming.length) return log('Nothing to merge.');
    const byId = new Map(current.map(c => [c.id, c]));
    for (const r of incoming) {
      if (byId.has(r.id)) {
        if (allowUpdates?.checked) {
          byId.set(r.id, {...byId.get(r.id), ...r});
        } else {
          // skip duplicates
        }
      } else {
        byId.set(r.id, r);
      }
    }
    const merged = Array.from(byId.values());
    log(`Merged. New total: ${merged.length}. Use "Download merged citations.json".`);
    // stash in window for download button
    window.__mergedCitations = merged;
  });

  // Download merged
  if (downloadBtn) downloadBtn.addEventListener('click', () => {
    const data = window.__mergedCitations || [];
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'citations.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
});
</script>
