(() => {
  // ------- State -------
  let currentData = [];  // loaded citations.json
  let newData = [];      // parsed from JSON or CSV
  let merged = null;     // result after merge

  // ------- Helpers -------
  const $ = (sel) => document.querySelector(sel);
  const logNode = $('#log');
  const logText = $('#logText');
  function log(msg){
    if (!logNode || !logText) return;
    logNode.classList.remove('hidden');
    logText.textContent += (typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)) + "\n";
    console.log(msg);
  }
  function clearLog(){
    if (!logText) return;
    logText.textContent = '';
    logNode.classList.add('hidden');
  }
  const normalizeArrayField = (v) => {
    if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
    if (typeof v === 'string') {
      // split by pipe for CSV; also handle commas if someone pasted them
      return v.split('|').join(',').split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const required = ['id','case_name','citation','year','court','jurisdiction','summary'];
  function hasRequiredFields(obj){
    const missing = required.filter(k => obj[k] === undefined || obj[k] === null || String(obj[k]).trim() === '');
    return { ok: missing.length === 0, missing };
  }

  // ------- Wiring -------
  document.addEventListener('DOMContentLoaded', () => {
    const btnLoadCurrent = $('#btnLoadCurrent');
    const btnPasteJSON  = $('#btnPasteJSON');
    const csvInput      = $('#csvInput');
    const btnParseCSV   = $('#btnParseCSV');
    const pasteArea     = $('#pasteArea');
    const allowUpdates  = $('#allowUpdates');
    const btnValidate   = $('#btnValidate');
    const btnMerge      = $('#btnMerge');
    const btnDownload   = $('#btnDownload');

    // null-safe guards so we never throw
    if (btnLoadCurrent) btnLoadCurrent.addEventListener('click', loadCurrent);
    if (btnPasteJSON)  btnPasteJSON.addEventListener('click', pasteJson);
    if (btnParseCSV)   btnParseCSV.addEventListener('click', parseCsv);
    if (csvInput)      csvInput.addEventListener('change', handleCsvFile);
    if (btnValidate)   btnValidate.addEventListener('click', () => validate(allowUpdates?.checked));
    if (btnMerge)      btnMerge.addEventListener('click', () => mergeIntoCurrent(allowUpdates?.checked));
    if (btnDownload)   btnDownload.addEventListener('click', downloadMerged);

    async function loadCurrent(){
      try{
        clearLog();
        const res = await fetch('../data/citations/citations.json',{cache:'no-store'});
        if(!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        currentData = await res.json();
        log(`Loaded current dataset (${currentData.length} records).`);
      }catch(e){
        log(`Error loading current dataset: ${e.message}`);
      }
    }

    function pasteJson(){
      clearLog();
      if (!pasteArea) return;
      const raw = pasteArea.value.trim();
      if(!raw){ log('Paste JSON into the textarea first.'); return; }
      try{
        const parsed = JSON.parse(raw);
        if(!Array.isArray(parsed)) throw new Error('JSON must be an array of objects.');
        newData = parsed.map(normalizeRecord);
        log(`Parsed ${newData.length} records from pasted JSON.`);
      }catch(e){
        log(`JSON parse error: ${e.message}`);
      }
    }

    function handleCsvFile(e){
      const file = e.target.files?.[0];
      if(!file){ log('No CSV selected.'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        parseCsvText(String(text));
      };
      reader.readAsText(file);
    }

    function parseCsv(){
      clearLog();
      log('Use the "Choose CSV" button to select a file, then it will be parsed automatically.');
    }

    function parseCsvText(text){
      try{
        const rows = text.split(/\r?\n/).filter(Boolean);
        if(rows.length < 2) throw new Error('CSV appears empty.');
        const headers = rows[0].split(',').map(h => h.trim());
        const out = [];
        for(let i=1;i<rows.length;i++){
          const cols = splitCsvLine(rows[i], headers.length);
          if(!cols) continue;
          const obj = {};
          headers.forEach((h,idx)=>{
            obj[h] = cols[idx] ?? '';
          });
          out.push(normalizeRecord(obj));
        }
        newData = out;
        log(`Parsed ${newData.length} records from CSV.`);
      }catch(e){
        log(`CSV parse error: ${e.message}`);
      }
    }

    function splitCsvLine(line, expected){
      // naive CSV splitter (no quoted commas). Good enough for controlled exports.
      const parts = line.split(',').map(s=>s.trim());
      if (parts.length < expected && parts.length === 1 && !parts[0]) return null;
      while(parts.length < expected) parts.push('');
      return parts;
    }

    function normalizeRecord(obj){
      const copy = {...obj};
      // normalize arrays for known list fields
      ['compliance_flags','key_points','tags','sources_verified'].forEach(k=>{
        if (copy[k] !== undefined) copy[k] = normalizeArrayField(copy[k]);
      });
      if (copy.year !== undefined) copy.year = Number(copy.year) || copy.year;
      return copy;
    }

    function validate(allow){
      clearLog();
      if(!newData.length){ log('No new data to validate. Paste JSON or load CSV first.'); return; }

      const problems = [];
      newData.forEach((rec, idx)=>{
        const {ok, missing} = hasRequiredFields(rec);
        if(!ok) problems.push({index: idx, missing});
      });

      if(problems.length){
        log({validation_errors: problems});
        log('Validation failed.');
        return;
      }
      if (!Array.isArray(currentData)) currentData = [];
      // duplicate check
      const existing = new Set(currentData.map(r => String(r.id)));
      const dupes = [];
      newData.forEach((r, i)=>{
        if (existing.has(String(r.id)) && !allow) dupes.push({index:i, id:r.id});
      });
      if(dupes.length){
        log({duplicate_ids: dupes});
        log('Duplicates present. Enable "Allow updates" to update existing IDs.');
        return;
      }
      log('Validation passed.');
    }

    function mergeIntoCurrent(allow){
      clearLog();
      if (!Array.isArray(currentData) || !currentData.length){
        log('Load current dataset first.'); return;
      }
      if (!Array.isArray(newData) || !newData.length){
        log('No validated new data to merge.'); return;
      }
      const byId = new Map(currentData.map(r => [String(r.id), {...r}]));
      newData.forEach(rec=>{
        const key = String(rec.id);
        if (byId.has(key)){
          if (allow){
            byId.set(key, {...byId.get(key), ...rec});
          }
        } else {
          byId.set(key, rec);
        }
      });
      merged = Array.from(byId.values());
      const dl = $('#btnDownload');
      if (dl) dl.disabled = false;
      log(`Merged. New total = ${merged.length}. Click "Download merged citations.json".`);
    }

    function downloadMerged(){
      if (!merged || !merged.length){ log('Nothing to download — run merge first.'); return; }
      const blob = new Blob([JSON.stringify(merged, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'citations.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      log('Download started.');
    }
  });
})();
