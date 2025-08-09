(() => {
  const cacheBust = `v=${Date.now()}`;
  const $ = (s,r=document)=>r.querySelector(s);

  let current = [];   // loaded citations.json
  let incoming = [];  // parsed/pasted items
  let merged = [];    // result after merge

  function log(el, text, obj){
    el.classList.remove('hidden');
    const t = typeof obj==='undefined' ? text : `${text}\n${JSON.stringify(obj,null,2)}`;
    el.querySelector('code').textContent = t;
  }
  function clearLog(el){ el.classList.add('hidden'); el.querySelector('code').textContent=''; }

  function parseCSV(text){
    // very small CSV parser (no quotes in content expected)
    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    if(!lines.length) return [];
    const headers = lines[0].split(',').map(h=>h.trim());
    return lines.slice(1).map(line=>{
      const cols = line.split(',').map(c=>c.trim());
      const row = {};
      headers.forEach((h,i)=> row[h]=cols[i] ?? '');
      // normalize arrays if pipe-separated
      ['compliance_flags','tags','key_points','sources'].forEach(k=>{
        if(row[k]) row[k] = String(row[k]).split('|').map(s=>s.trim()).filter(Boolean);
      });
      return row;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btnLoad = $('#btnLoad');
    const btnPasteJSON = $('#btnPasteJSON');
    const btnParseCSV = $('#btnParseCSV');
    const csvFile = $('#csvFile');
    const jsonPaste = $('#jsonPaste');
    const allowUpdates = $('#allowUpdates');
    const btnValidate = $('#btnValidate');
    const btnMerge = $('#btnMerge');
    const btnDownload = $('#btnDownload');
    const log1 = $('#log');
    const log2 = $('#log2');

    // Load current citations.json
    btnLoad.addEventListener('click', async () => {
      clearLog(log1);
      try{
        const res = await fetch(`../data/citations/citations.json?${cacheBust}`);
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        current = await res.json();
        log(log1, 'Loaded current dataset:', { count: current.length });
      }catch(err){
        log(log1, 'Failed to load current dataset:', { error: String(err) });
      }
    });

    // Paste JSON
    btnPasteJSON.addEventListener('click', () => {
      try{
        const arr = JSON.parse(jsonPaste.value || '[]');
        if(!Array.isArray(arr)) throw new Error('JSON must be an array');
        incoming = arr;
        log(log1, 'Accepted pasted JSON items:', { count: incoming.length });
      }catch(err){
        log(log1, 'Invalid JSON:', { error: String(err) });
      }
    });

    // Parse CSV
    btnParseCSV.addEventListener('click', async () => {
      clearLog(log1);
      try{
        let text = '';
        if(csvFile.files && csvFile.files[0]){
          text = await csvFile.files[0].text();
        }else if(jsonPaste.value.trim()){
          text = jsonPaste.value.trim();
        }else{
          throw new Error('Choose a CSV file or paste CSV into the box.');
        }
        incoming = parseCSV(text);
        log(log1, 'Parsed CSV rows:', { count: incoming.length });
      }catch(err){
        log(log1, 'CSV parse error:', { error: String(err) });
      }
    });

    // Validate
    btnValidate.addEventListener('click', () => {
      clearLog(log1);
      const required = ['id','case_name','citation','year','court','jurisdiction','summary'];
      const bad = [];
      (incoming||[]).forEach((r,idx)=>{
        const miss = required.filter(k => r[k]===undefined || String(r[k]).trim()==='');
        if(miss.length) bad.push({ index: idx, missing: miss });
      });
      if(bad.length){
        log(log1, 'Validation failed. Missing fields listed below.', { failures: bad.length, detail: bad.slice(0,100) });
      }else{
        log(log1, 'Validation passed.', { items: incoming.length });
      }
    });

    // Merge (in-memory)
    btnMerge.addEventListener('click', () => {
      clearLog(log2);
      if(!current.length){ log(log2,'Load current dataset first.'); return; }
      if(!incoming.length){ log(log2,'Add/parse some items first.'); return; }

      const byId = new Map(current.map(x=>[String(x.id), x]));
      let updates=0, inserts=0;

      incoming.forEach(it=>{
        const id = String(it.id);
        if(byId.has(id)){
          if(allowUpdates.checked){
            byId.set(id, Object.assign({}, byId.get(id), it));
            updates++;
          }
        }else{
          byId.set(id, it);
          inserts++;
        }
      });

      merged = Array.from(byId.values());
      btnDownload.disabled = false;
      log(log2, 'Merge completed.', { inserts, updates, total: merged.length });
    });

    // Download merged
    btnDownload.addEventListener('click', () => {
      if(!merged.length){ return; }
      const blob = new Blob([JSON.stringify(merged, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'citations.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  });
})();
