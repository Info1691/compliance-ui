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
 
