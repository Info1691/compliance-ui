(function(){
  // --- DOM
  const $ = (s,c=document)=>c.querySelector(s);
  const els = {
    file: $('#fileInput'),
    fileName: $('#fileName'),
    paste: $('#pasteArea'),
    parse: $('#parseBtn'),
    clear: $('#clearBtn'),
    autoFromTxt: $('#autoFromTxt'),
    markNoBreach: $('#markNoBreach'),
    merged: $('#mergedOut'),
    overwrite: $('#overwrite'),
    sortBy: $('#sortBy'),
    genBtn: $('#genBtn'),
    copyBtn: $('#copyBtn'),
    dlBtn: $('#dlBtn'),
    acceptedCount: $('#acceptedCount'),
    acceptedList: $('#acceptedList'),
    status: $('#status')
  };

  const REG_PATHS = ['data/citations.json','../data/citations.json','citations.json'];
  let existing = [];
  let accepted = [];

  const setStatus = (m)=> els.status.textContent = m || '';

  // --- utils
  const toJSON = (o)=> JSON.stringify(o,null,2);
  const norm = (s)=> String(s||'').trim();
  const isYear = (x)=> /^\d{4}$/.test(String(x||''));
  const idify = (s)=> norm(s).toLowerCase().replace(/[^a-z0-9\- ]+/g,'').replace(/\s+/g,'-');

  async function fetchRegistry(paths){
    for(const p of paths){
      try{ const r = await fetch(p,{cache:'no-store'}); if(r.ok) return await r.json(); }catch(_){}
    }
    return [];
  }

  // very small CSV/JSON parser (stable)
  function parseJSONorCSV(text){
    if(!text || !text.trim()) return [];
    // JSON
    try{ const j = JSON.parse(text); return Array.isArray(j)? j : [j]; }catch(_){}
    // CSV
    try{
      const lines = text.trim().split(/\r?\n/);
      const head = lines.shift().split(',').map(h=>h.trim());
      return lines.map(line=>{
        const out = []; let cur='', q=false;
        for(let i=0;i<line.length;i++){
          const ch=line[i];
          if(ch==='"' && line[i+1]==='"'){ cur+='"'; i++; continue; }
          if(ch==='"'){ q=!q; continue; }
          if(ch===',' && !q){ out.push(cur); cur=''; continue; }
          cur+=ch;
        }
        out.push(cur);
        const row={}; head.forEach((h,i)=> row[h]=norm(out[i]));
        return row;
      });
    }catch(_){}
    return [];
  }

  // minimal TXT filename meta (no content heuristics in this rollback)
  function metaFromName(name){
    const base = name.replace(/\.[^.]+$/,'').trim();
    // Case v Case [2025] JRC 158
    const m = base.match(/^(.*?)\s*\[(\d{4})\]\s*([A-Za-z]+)\s*([0-9A-Za-z\-\/]+)?$/);
    const case_name = base.replace(/\s*\[[^\]]+]\s*.*/,'').trim();
    const year = m? m[2] : '';
    const courtToken = (m? m[3] : '') || 'JRC';
    const citation = m? `[${year}] ${courtToken}${m[4]?' '+m[4]:''}` : '';
    const id = idify(`${case_name}-${year}`);
    const court = /JRC/i.test(courtToken)? 'Royal Court' : courtToken;
    return {
      id, case_name, citation,
      year: isYear(year)? parseInt(year,10):'',
      court, jurisdiction: 'Jersey'
    };
  }

  function ensureSchema(o, noBreach){
    const base = {
      id:'', case_name:'', citation:'', year:'', court:'', jurisdiction:'Jersey',
      summary:'', holding:'', source:'', compliance_flags:'', tags:'',
      observed_conduct:'', anomaly_detected:'', breached_law_or_rule:'',
      authority_basis:'', canonical_breach_tag:'', case_link:'', full_text:''
    };
    const out = Object.assign(base, o||{});
    out.id = out.id || idify(`${out.case_name}-${out.year||''}`);
    if(noBreach){ out.anomaly_detected = 'no'; out.summary ||= 'No breach detected.'; }
    return out;
  }

  function renderAccepted(){
    els.acceptedCount.textContent = accepted.length;
    els.acceptedList.innerHTML = accepted.map(a=>`<li>${a.case_name} — ${a.citation||''}</li>`).join('');
  }

  // --- Events
  els.file.addEventListener('change', ()=>{
    els.fileName.textContent = els.file.files?.[0]?.name || '—';
  });

  els.clear.addEventListener('click', ()=>{
    els.file.value = '';
    els.fileName.textContent = '—';
    els.paste.value = '';
    els.merged.value = '[]';
    accepted = [];
    renderAccepted();
    setStatus('Cleared.');
  });

  els.parse.addEventListener('click', async ()=>{
    setStatus('Parsing…');
    if(!existing.length) existing = await fetchRegistry(REG_PATHS);

    const res = [];
    const noBreach = els.markNoBreach.checked;

    // file route
    const f = els.file.files?.[0];
    if(f){
      const name = f.name||'';
      const text = await f.text();
      if(/\.(json|csv)$/i.test(name)){
        parseJSONorCSV(text).forEach(x=> res.push(ensureSchema(x,noBreach)));
      }else{
        // TXT filename only (rollback behaviour)
        const meta = els.autoFromTxt.checked ? metaFromName(name) : {};
        res.push(ensureSchema({...meta, source:name}, noBreach));
      }
    }

    // paste route
    if(els.paste.value.trim()){
      parseJSONorCSV(els.paste.value).forEach(x=> res.push(ensureSchema(x,noBreach)));
    }

    accepted = res;
    renderAccepted();
    setStatus(accepted.length? 'Accepted. Generate merged JSON →' : 'Nothing accepted.');
  });

  function merge(){
    const map = new Map((existing||[]).map(x=>[x.id,x]));
    const overwrite = els.overwrite.checked;
    for(const it of accepted){
      if(map.has(it.id)){
        if(overwrite) map.set(it.id,it);
      }else{
        map.set(it.id,it);
      }
    }
    const arr = Array.from(map.values());
    const key = els.sortBy.value;
    arr.sort((a,b)=>{
      const av = (a[key]??'').toString().toLowerCase();
      const bv = (b[key]??'').toString().toLowerCase();
      return av<bv?-1:av>bv?1:0;
    });
    return arr;
  }

  els.genBtn.addEventListener('click', ()=>{
    els.merged.value = toJSON(merge());
    setStatus('Merged JSON ready. Copy/Download and commit to data/citations.json.');
  });

  els.copyBtn.addEventListener('click', async ()=>{
    try{ await navigator.clipboard.writeText(els.merged.value||'[]'); setStatus('Copied.'); }
    catch{ setStatus('Copy failed (permissions).'); }
  });

  els.dlBtn.addEventListener('click', ()=>{
    const blob = new Blob([els.merged.value||'[]'],{type:'application/json;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'citations.json';
    document.body.appendChild(a); a.click(); a.remove();
  });

  // init
  setStatus('Waiting…');
})();
