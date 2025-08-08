(function () {
  const PATH_CURRENT = '../data/citations/citations.json';

  // working state
  let current = [];     // current citations.json (fetched)
  let incoming = [];    // parsed/pasted/uploaded data
  let merged = null;    // merged array ready for download

  // els
  const elLoadStatus   = byId('loadStatus');
  const elParseStatus  = byId('parseStatus');
  const elValReport    = byId('validationReport');
  const elMergeStatus  = byId('mergeStatus');

  const elJsonInput    = byId('jsonInput');
  const elFileCsv      = byId('fileCsv');
  const elAllowUpdates = byId('allowUpdates');

  const btnLoadCurrent = byId('btnLoadCurrent');
  const btnPasteJson   = byId('btnPasteJson');
  const btnParseCsv    = byId('btnParseCsv');
  const btnValidate    = byId('btnValidate');
  const btnMerge       = byId('btnMerge');
  const btnDownload    = byId('btnDownload');

  const dlgPaste       = byId('pasteModal');
  const pasteArea      = byId('pasteArea');
  const pasteApply     = byId('pasteApply');
  const pasteCancel    = byId('pasteCancel');

  // helpers
  function byId(id){ return document.getElementById(id); }
  function setStatus(el,msg){ el.textContent = msg || ''; }
  function isArray(v){ return Array.isArray(v); }

  function normalizeCitation(obj){
    // ensure stable keys; coerce some fields
    const clone = { ...obj };
    if (clone.year !== undefined) clone.year = Number(clone.year);
    const arrFields = ['compliance_flags','key_points','tags','oai_citations'];
    arrFields.forEach(k=>{
      if (clone[k] == null) return;
      if (typeof clone[k] === 'string'){
        // allow pipe-separated strings -> array
        clone[k] = clone[k].split('|').map(s=>s.trim()).filter(Boolean);
      } else if (!Array.isArray(clone[k])) {
        clone[k] = [ String(clone[k]) ].filter(Boolean);
      }
    });
    return clone;
  }

  // CSV -> JSON
  function parseCsv(text){
    // super tolerant CSV parser for simple use
    const lines = text.replace(/\r/g,'').split('\n').filter(Boolean);
    const headers = lines.shift().split(',').map(h=>h.trim());
    return lines.map(line=>{
      // naive split, fine for this controlled input (no embedded commas expected)
      const cols = line.split(',').map(c=>c.trim());
      const obj = {};
      headers.forEach((h,i)=> obj[h] = cols[i] ?? '');
      return obj;
    });
  }

  // load current
  btnLoadCurrent.addEventListener('click', async ()=>{
    try{
      setStatus(elLoadStatus,'Loading current citations.json …');
      const res = await fetch(PATH_CURRENT, { cache: 'no-store' });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      current = await res.json();
      if(!isArray(current)) throw new Error('citations.json must be an array');
      setStatus(elLoadStatus, `Loaded ${current.length} records from citations.json`);
    }catch(err){
      console.error(err);
      setStatus(elLoadStatus, 'Failed to load current dataset.');
    }
  });

  // paste JSON dialog
  btnPasteJson.addEventListener('click', ()=>{
    pasteArea.value = '';
    dlgPaste.showModal();
  });
  pasteCancel.addEventListener('click', ()=> dlgPaste.close());
  pasteApply.addEventListener('click', ()=>{
    elJsonInput.value = pasteArea.value.trim();
    dlgPaste.close();
    setStatus(elParseStatus, 'JSON pasted. You can validate when ready.');
  });

  // parse CSV
  btnParseCsv.addEventListener('click', async ()=>{
    if(!elFileCsv.files || !elFileCsv.files[0]){
      setStatus(elParseStatus,'Choose a CSV file first.'); return;
    }
    try{
      const text = await elFileCsv.files[0].text();
      const rows = parseCsv(text);
      incoming = rows.map(normalizeCitation);
      elJsonInput.value = JSON.stringify(incoming, null, 2);
      setStatus(elParseStatus, `Parsed ${incoming.length} records from CSV.`);
    }catch(err){
      console.error(err);
      setStatus(elParseStatus,'Failed to parse CSV.');
    }
  });

  // validate
  btnValidate.addEventListener('click', ()=>{
    try{
      const source = elJsonInput.value.trim();
      incoming = source ? JSON.parse(source) : incoming;
      if(!isArray(incoming)) throw new Error('Input must be a JSON array');
      incoming = incoming.map(normalizeCitation);

      // basic schema checks
      const required = ['id','case_name','citation','year','court','jurisdiction','summary'];
      const errors = [];
      const seen = new Set();

      incoming.forEach((it,idx)=>{
        required.forEach(k=>{
          if(it[k] === undefined || it[k] === null || (typeof it[k] === 'string' && it[k].trim()==='')){
            errors.push(`Row ${idx+1}: missing required field "${k}"`);
          }
        });
        // unique in incoming
        if(seen.has(it.id)) errors.push(`Row ${idx+1}: duplicate id "${it.id}" within incoming data`);
        seen.add(it.id);
      });

      // duplicates vs current when updates not allowed
      if(current.length && !elAllowUpdates.checked){
        const currentIds = new Set(current.map(x=>x.id));
        incoming.forEach((it,idx)=>{
          if(currentIds.has(it.id)) errors.push(`Row ${idx+1}: id "${it.id}" already exists in current (uncheck "Allow updates" to see this).`);
        });
      }

      if(errors.length){
        elValReport.innerHTML = `<div class="error-list"><strong>Validation failed:</strong><ul>${errors.map(e=>`<li>${escapeHtml(e)}</li>`).join('')}</ul></div>`;
      }else{
        elVal
