(() => {
  // ------- State -------
  let currentData = [];   // currently loaded citations.json
  let newData = [];       // new records (from JSON or CSV)
  let merged = null;      // merged result after validation/merge

  // ------- Helpers -------
  const $ = sel => document.querySelector(sel);
  const logNode = $('#log');
  const logText = $('#logText');
  function log(msg){
    logNode.classList.remove('hidden');
    logText.textContent += (typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)) + "\n";
    console.log(msg);
  }
  function clearLog(){
    logText.textContent = '';
    logNode.classList.add('hidden');
  }

  function normalizeArrayField(v){
    if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
    if (typeof v === 'string'){
      // split by pipe for CSV, also handle comma if user pasted arrays accidentally
      return v.split('|').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }

  function requiredFieldsPresent(obj){
    const req = ['id','case_name','citation','year','court','jurisdiction','summary'];
    const missing = req.filter(k => obj[k] === undefined || obj[k] === null || String(obj[k]).trim() === '');
    return {ok: missing.length === 0, missing};
  }

  function toIntSafe(v){
    const n = parseInt(v,10);
    return Number.isFinite(n) ? n : v;
  }

  // ------- CSV parsing -------
  function parseCSV(text){
    // very small, safe CSV parser (no quotes-in-quotes complexities assumed)
    const lines = text.split(/\r?\n/).filter(l => l.trim().length);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i=1;i<lines.length;i++){
      const cols = lines[i].split(',').map(c => c.trim());
      const row = {};
      headers.forEach((h,idx) => row[h] = cols[idx] ?? '');
      // normalize expected fields
      if ('year' in row) row.year = toIntSafe(row.year);
      // array-ish fields
      ['compliance_flags','key_points','tags'].forEach(k => {
        if (k in row) row[k] = normalizeArrayField(row[k]);
      });
      rows.push(row);
    }
    return rows;
  }

  // ------- UI elements -------
  const btnLoadCurrent = $('#btnLoadCurrent');
  const currentCount = $('#currentCount');

  const btnPasteJSON = $('#btnPasteJSON');
  const fileCSV = $('#fileCSV');
  const btnParseCSV = $('#btnParseCSV');
  const pasteArea = $('#pasteArea');
  const newCount = $('#newCount');

  const allowUpdates = $('#allowUpdates');
  const btnValidate = $('#btnValidate');
  const validationStatus = $('#validationStatus');

  const btnMerge = $('#btnMerge');
  const btnDownload = $('#btnDownload');

  // ------- Load current dataset -------
  btnLoadCurrent.addEventListener('click', async () => {
    clearLog();
    currentCount.textContent = 'Loading…';
    try{
      const res = await fetch('../data/citations/citations.json', {cache:'no-store'});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      currentData = await res.json();
      currentCount.textContent = `Loaded ${currentData.length} records.`;
      log(`Loaded current dataset: ${currentData.length} records`);
    }catch(err){
      currentCount.textContent = 'Failed to load current dataset.';
      log(err);
    }
  });

  // ------- Paste JSON modal (inline via textarea) -------
  btnPasteJSON.addEventListener('click', () => {
    pasteArea.scrollIntoView({behavior:'smooth',block:'center'});
    pasteArea.focus();
  });

  // ------- Parse CSV file -------
  btnParseCSV.addEventListener('click', () => {
    clearLog();
    const file = fileCSV.files && fileCSV.files[0];
    if (!file){
      alert('Choose a CSV file first.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const rows = parseCSV(reader.result);
        if (!rows.length) throw new Error('No rows parsed from CSV.');
        newData = rows;
        newCount.textContent = `Parsed ${newData.length} new records from CSV.`;
        log(`Parsed CSV: ${newData.length} rows`);
      }catch(err){
        newCount.textContent = 'Failed to parse CSV.';
        log(err);
      }
    };
    reader.readAsText(file);
  });

  // ------- If user pasted JSON, parse it into newData -------
  pasteArea.addEventListener('input', () => {
    clearLog();
    const txt = pasteArea.value.trim();
    if (!txt){ newData = []; newCount.textContent = ''; return; }
    try{
      const parsed = JSON.parse(txt);
      if (!Array.isArray(parsed)) throw new Error('Pasted JSON must be an array of citation objects.');
      // normalize arrays
      newData = parsed.map(o => ({
        ...o,
        compliance_flags: normalizeArrayField(o.compliance_flags),
        key_points: normalizeArrayField(o.key_points),
        tags: normalizeArrayField(o.tags),
        year: toIntSafe(o.year)
      }));
      newCount.textContent = `Loaded ${newData.length} new records from pasted JSON.`;
      log(`Loaded pasted JSON: ${newData.length} records`);
    }catch(err){
      newCount.textContent = 'Invalid JSON.';
      log(err);
    }
  });

  // ------- Validate -------
  btnValidate.addEventListener('click', () => {
    clearLog();
    if (!currentData.length){
      alert('Load the current dataset first.');
      return;
    }
    if (!newData.length){
      alert('Add some new data (paste JSON or parse a CSV).');
      return;
    }

    const allow = !!allowUpdates.checked;
    const currentById = new Map(currentData.map(o => [String(o.id), o]));
    const problems = [];
    const okRecords = [];

    for (const rec of newData){
      const {ok, missing} = requiredFieldsPresent(rec);
      if (!ok){
        problems.push({id: rec.id ?? '(no id)', error:`Missing required fields: ${missing.join(', ')}`});
        continue;
      }

      const idStr = String(rec.id);
      if (currentById.has(idStr) && !allow){
        problems.push({id: rec.id, error:'ID already exists (updates not allowed).'});
        continue;
      }

      okRecords.push(rec);
    }

    if (problems.length){
      validationStatus.textContent =
        `Validation finished with ${problems.length} issue(s). See console/log.`;
      log({validationIssues: problems});
      merged = null;
    }else{
      validationStatus.textContent =
        `Validation OK. ${okRecords.length} record(s) ready to merge.`;
      merged = okRecords; // store ready-to-merge set
    }
  });

  // ------- Merge in memory -------
  btnMerge.addEventListener('click', () => {
    clearLog();
    if (!currentData.length || !newData.length){
      alert('Load current data and add new data first.');
      return;
    }
    if (!merged){
      alert('Run validation first (and ensure it passes).');
      return;
    }

    const allow = !!allowUpdates.checked;
    const byId = new Map(currentData.map(o => [String(o.id), {...o}]));
    let updates = 0, inserts = 0;

    for (const rec of merged){
      const idStr = String(rec.id);
      if (byId.has(idStr)){
        if (allow){
          byId.set(idStr, {...byId.get(idStr), ...rec});
          updates++;
        }
      }else{
        byId.set(idStr, {...rec});
        inserts++;
      }
    }

    const out = Array.from(byId.values());
    log({mergedCounts: {inserts, updates}, finalLength: out.length});
    btnDownload.disabled = false;
    btnDownload.dataset.payload = JSON.stringify(out, null, 2);
    alert(`Merged in memory. Inserts: ${inserts}, updates: ${updates}. Click “Download merged citations.json”.`);
  });

  // ------- Download -------
  btnDownload.addEventListener('click', () => {
    const payload = btnDownload.dataset.payload;
    if (!payload){
      alert('Nothing to download yet. Merge first.');
      return;
    }
    const blob = new Blob([payload], {type:'application/json'});
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
