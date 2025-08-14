(function () {
  // ===== DOM =====
  const $ = (s, c = document) => c.querySelector(s);
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
    status: $('#status'),
  };

  // ===== Registry fetch fallbacks =====
  const registryPaths = ['data/citations.json','../data/citations.json','citations.json'];
  let existing = [];
  let accepted = [];

  const setStatus = (m)=> els.status.textContent = m;
  const toJSON = (o)=> JSON.stringify(o,null,2);
  const norm = (s)=> String(s||'').trim();
  const isYear = (x)=> /^\d{4}$/.test(String(x||''));

  function normalizeId(s) {
    return String(s||'').toLowerCase().replace(/[^a-z0-9\- ]+/g,'').replace(/\s+/g,'-');
  }

  async function safeFetch(urls){
    for(const u of urls){
      try{ const r = await fetch(u,{cache:'no-store'}); if(r.ok){ return await r.json(); } }catch(_){}
    }
    return [];
  }

  // ====== Input formats ======
  function tryParseJSONorCSV(text){
    if(!text || !text.trim()) return [];
    // JSON Array or single object
    try{
      const j = JSON.parse(text);
      return Array.isArray(j)? j : [j];
    }catch(_){}
    // CSV
    try{
      const lines = text.trim().split(/\r?\n/);
      const header = lines.shift().split(',').map(h=>h.trim());
      return lines.map(line=>{
        const cols=[]; let cur='', inQ=false;
        for(let i=0;i<line.length;i++){
          const ch=line[i];
          if(ch === '"' && line[i+1] === '"'){ cur+='"'; i++; continue; }
          if(ch === '"'){ inQ=!inQ; continue; }
          if(ch === ',' && !inQ){ cols.push(cur); cur=''; continue; }
          cur+=ch;
        }
        cols.push(cur);
        const row={}; header.forEach((h,i)=> row[h]=norm(cols[i]));
        return row;
      });
    }catch(_){}
    return [];
  }

  // ====== TXT intelligence ======
  // Extract meta from filename: "Case v Other [2025] JRC158.txt"
  function metaFromTxtName(name){
    const base = name.replace(/\.[^.]+$/,'').trim();
    const m = base.match(/^(.*?)\s*\[(\d{4})\]\s*([A-Za-z]+)\s*([0-9A-Za-z\-\/]+)?$/);
    const caseName = base.replace(/\s*\[[^\]]+]\s*.*/,'').trim();
    const year = m ? m[2] : '';
    const courtToken = m ? (m[3]||'').toUpperCase() : '';
    const citation = m ? `[${year}] ${courtToken}${m[4]?' '+m[4]:''}` : '';
    const id = normalizeId(`${caseName}-${year}`);
    // Sensible defaults for Jersey
    const court = courtToken==='JRC' ? 'Royal Court' :
                  courtToken==='CA'  ? 'Court of Appeal' :
                  courtToken ? courtToken : 'Royal Court';
    return {
      id,
      case_name: caseName,
      citation,
      year: isYear(year)? parseInt(year,10) : '',
      court,
      jurisdiction: 'Jersey',
    };
  }

  // Heuristics for summary/holding/outcome from TXT content
  function analyseJudgmentText(txt){
    const clean = txt.replace(/\r/g,'');
    const lines = clean.split('\n').map(l=>l.trim()).filter(Boolean);

    // Find first “dispositive” line
    const keys = [
      /appeal\s+allowed/i,
      /appeal\s+dismissed/i,
      /application\s+granted/i,
      /application\s+refused/i,
      /injunction\s+granted/i,
      /injunction\s+refused/i,
      /claim\s+dismissed/i,
      /strike\s*[- ]?out/i,
      /summary\s+judgment/i,
      /costs\s+orders?/i,
      /permission\s+granted/i,
      /permission\s+refused/i
    ];
    let holding = '';
    for(const l of lines){
      if(keys.some(k=>k.test(l))){ holding = l; break; }
    }

    // Summary: small abstract from intro or around a “Held/Decision” anchor
    let summary = '';
    const heldIdx = lines.findIndex(l=>/^(held|decision|disposition)[:.]/i.test(l));
    if(heldIdx >= 0){
      summary = lines.slice(Math.max(0,heldIdx-2), heldIdx+1).join(' ');
    } else {
      summary = lines.slice(0,3).join(' ');
    }
    summary = summary.length>600 ? summary.slice(0,600)+'…' : summary;

    // Short excerpt for full_text (avoid huge payloads)
    let excerpt = lines.slice(0,40).join('\n');
    if(excerpt.length>1800) excerpt = excerpt.slice(0,1800)+'…';

    return { summary, holding, excerpt };
  }

  // Fill all schema fields safely
  function ensureSchema(o, opts={}){
    const base = {
      id:'', case_name:'', citation:'', year:'', court:'', jurisdiction:'',
      summary:'', holding:'', source:'', compliance_flags:'', tags:'',
      observed_conduct:'', anomaly_detected:'', breached_law_or_rule:'',
      authority_basis:'', canonical_breach_tag:'', case_link:'', full_text:''
    };
    const out = Object.assign(base, o);

    // standardise types/values
    if(isYear(out.year)) out.year = parseInt(out.year,10);
    out.id = normalizeId(out.id || `${out.case_name}-${out.year||''}`);

    // Optional: force “no breach”
    if(opts.noBreach){
      out.anomaly_detected = 'no';
      out.compliance_flags = '';
      out.canonical_breach_tag = '';
      if(!out.summary) out.summary = 'No breach detected.';
    }

    // backstop defaults if still empty (for Jersey matters)
    if(!out.jurisdiction) out.jurisdiction = 'Jersey';
    if(!out.court && /\bJRC\b/i.test(out.citation||'')) out.court = 'Royal Court';

    return out;
  }

  function listAccepted(arr){
    els.acceptedCount.textContent = arr.length;
    els.acceptedList.innerHTML = arr.slice(0,6).map(a=>`<li>${a.case_name} — ${a.citation||''}</li>`).join('');
  }

  // ===== Events =====
  els.file.addEventListener('change', ()=>{
    els.fileName.textContent = els.file.files?.[0]?.name || '—';
  });

  els.clear.addEventListener('click', ()=>{
    els.file.value = '';
    els.fileName.textContent = '—';
    els.paste.value = '';
    accepted = [];
    listAccepted(accepted);
    els.merged.value = '[]';
    setStatus('Cleared.');
  });

  els.parse.addEventListener('click', async ()=>{
    setStatus('Parsing…');
    if(!existing.length) existing = await safeFetch(registryPaths);

    const results = [];
    const noBreach = els.markNoBreach.checked;

    // 1) File
    const f = els.file.files?.[0];
    if(f){
      const name = f.name || '';
      const text = await f.text();

      if(/\.(txt)$/i.test(name)){
        const meta = els.autoFromTxt.checked ? metaFromTxtName(name) : {};
        const { summary, holding, excerpt } = analyseJudgmentText(text);
        const entry = ensureSchema({
          ...meta,
          summary,
          holding,
          source: name,
          full_text: excerpt
        }, { noBreach });
        results.push(entry);
      } else {
        // JSON/CSV
        const arr = tryParseJSONorCSV(text);
        arr.forEach(item=> results.push(ensureSchema(item, { noBreach })));
      }
    }

    // 2) Paste box
    if(els.paste.value.trim()){
      const arr = tryParseJSONorCSV(els.paste.value);
      arr.forEach(item=> results.push(ensureSchema(item, { noBreach })));
    }

    accepted = results;
    listAccepted(accepted);
    if(!accepted.length){
      setStatus('Nothing accepted. Provide a TXT/CSV/JSON file or paste data.');
    }else{
      setStatus(`${accepted.length} entr${accepted.length===1?'y':'ies'} accepted. Press “Generate Merged JSON”.`);
    }
  });

  function mergeData(){
    const byId = new Map((existing||[]).map(x=>[x.id,x]));
    const overwrite = els.overwrite.checked;
    for(const item of accepted){
      if(byId.has(item.id)){
        if(overwrite) byId.set(item.id, item);
      }else{
        byId.set(item.id, item);
      }
    }
    const merged = Array.from(byId.values());
    const key = els.sortBy.value;
    merged.sort((a,b)=>{
      const av = (a[key]??'').toString().toLowerCase();
      const bv = (b[key]??'').toString().toLowerCase();
      return av<bv?-1:av>bv?1:0;
    });
    return merged;
  }

  els.genBtn.addEventListener('click', ()=>{
    const merged = mergeData();
    els.merged.value = toJSON(merged);
    setStatus('Merged JSON ready. Copy or Download, then commit to data/citations.json.');
  });

  els.copyBtn.addEventListener('click', async ()=>{
    try{ await navigator.clipboard.writeText(els.merged.value||'[]'); setStatus('Copied to clipboard.'); }
    catch{ setStatus('Copy failed (clipboard not available).'); }
  });

  els.dlBtn.addEventListener('click', ()=>{
    const blob = new Blob([els.merged.value||'[]'],{type:'application/json;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'citations.json';
    document.body.appendChild(a); a.click(); a.remove();
    setStatus('Download started.');
  });

  // init
  setStatus('Waiting…');
})();
