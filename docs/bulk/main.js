(() => {
  // ---- State ----
  let currentData = []; // currently loaded citations.json
  let newData = [];     // new records (from JSON or CSV)
  let merged = null;    // merged result after validation/merge

  // ---- Helpers ----
  const $ = (sel) => document.querySelector(sel);
  const logNode = $('#log');
  function log(msg){
    if (!logNode) return;
    logNode.textContent += (typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)) + "\n";
  }
  function clearLog(){ if (logNode) logNode.textContent = ''; }

  function requiredFieldsPresent(obj){
    const req = ['id','case_name','citation','year','court','jurisdiction','summary'];
    const missing = req.filter(k => obj[k] === undefined || obj[k] === null || String(obj[k]).trim() === '');
    return { ok: missing.length === 0, missing };
  }
  function splitPipesToArray(v){
    if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
    if (typeof v === 'string') return v.split('|').map(s => s.trim()).filter(Boolean);
    return [];
  }

  // ---- Wire up buttons (null-safe) ----
  const btnLoadCurrent = $('#btnLoadCurrent');
  const btnPasteJSON   = $('#btnPasteJSON');
  const csvInput       = $('#csvFile');
  const btnParseCSV    = $('#btnParseCSV');
  const btnValidate    = $('#btnValidate');
  const btnMerge       = $('#btnMerge');
  const btnDownload    = $('#btnDownload');
  const jsonPaste      = $('#jsonPaste');
  const allowUpdates   = $('#allowUpdates');

  // Load current dataset
  if (btnLoadCurrent) {
    btnLoadCurrent.addEventListener('click', async () => {
      clearLog();
      try{
        const r = await fetch('../data/citations/citations.json', { cache:'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        currentData = await r.json();
        log(`Loaded current citations: ${currentData.length} records`);
      }catch(err){
        log(`Error loading current dataset: ${err.message}`);
      }
    });
  }

  // Paste JSON
  if (btnPasteJSON) {
    btnPasteJSON.addEventListener('click', () => {
      if (!jsonPaste) return;
      const raw = jsonPaste.value.trim();
      if (!raw) {
        log('Paste JSON into the box first.');
        return;
      }
      try{
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('JSON must be an array of records.');
        newData = parsed;
        log(`Parsed JSON: ${newData.length} records`);
      }catch(err){
        log(`JSON parse error: ${err.message}`);
      }
    });
  }

  // Parse CSV (simple)
  if (btnParseCSV && csvInput) {
    btnParseCSV.addEventListener('click', async () => {
      clearLog();
      const file = csvInput.files && csvInput.files[0];
      if (!file) { log('Choose a CSV file first.'); return; }

      const text = await file.text();
      const rows = text.split(/\r?\n/).filter(Boolean);
      if (rows.length < 2) { log('CSV has no data rows.'); return; }

      const headers = rows[0].split(',').map(h => h.trim());
      const out = [];
      for (let i=1;i<rows.length;i++){
        const vals = rows[i].split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = vals[idx] ?? ''; });
        // normalize arrays for a few known fields if pipe-separated
        obj.compliance_flags = splitPipesToArray(obj.compliance_flags || obj.flags || '');
        obj.key_points       = splitPipesToArray(obj.key_points || '');
        obj.tags             = splitPipesToArray(obj.tags || '');
        out.push(obj);
      }
      newData = out;
      log(`Parsed CSV: ${newData.length} records`);
    });
  }

  // Validate
  if (btnValidate) {
    btnValidate.addEventListener('click', () => {
      clearLog();
      if (!currentData.length) return log('Load current dataset first.');
      if (!newData.length)    return log('Add new data via JSON or CSV first.');

      let okCount = 0, bad = 0;
      for (const rec of newData){
        const { ok, missing } = requiredFieldsPresent(rec);
        if (!ok){ bad++; log({ id: rec.id || '(no id)', error: 'Missing required fields', missing }); }
        else okCount++;
      }
      log(`Validation complete: OK=${okCount}, Errors=${bad}`);
      if (bad === 0) log('You can now Merge into Current.');
    });
  }

  // Merge (in memory)
  if (btnMerge) {
    btnMerge.addEventListener('click', () => {
      clearLog();
      if (!currentData.length) return log('Load current dataset first.');
      if (!newData.length)     return log('Add new data first.');

      const allow = !!(allowUpdates && allowUpdates.checked);
      const byId = new Map(currentData.map(r => [String(r.id), r]));
      let rejected = 0, updated = 0, inserted = 0;

      for (const rec of newData) {
        const id = String(rec.id || '').trim();
        if (!id){ rejected++; continue; }
        if (byId.has(id)) {
          if (allow){
            byId.set(id, {...byId.get(id), ...rec}); // shallow merge update
            updated++;
          } else {
            rejected++;
          }
        } else {
          byId.set(id, rec);
          inserted++;
        }
      }

      merged = Array.from(byId.values());
      log({ inserted, updated, rejected, total: merged.length });
      if (btnDownload) btnDownload.disabled = !merged || merged.length === 0;
      log('Merged in memory. Click "Download merged citations.json" to save.');
    });
  }

  // Download merged
  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      if (!merged || !merged.length) { log('Nothing to download.'); return; }
      const blob = new Blob([JSON.stringify(merged, null, 2)], {type:'application/json'});
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'citations.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      log('Download started: citations.json');
    });
  }
})();
