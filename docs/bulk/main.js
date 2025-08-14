(function(){
  // ---------- DOM ----------
  const $ = (s, c = document) => c.querySelector(s);
  const els = {
    file:        $('#fileInput'),
    fileName:    $('#fileName'),
    parseBtn:    $('#parseBtn'),
    clearBtn:    $('#clearBtn'),
    pasteArea:   $('#pasteArea'),
    mergedOut:   $('#mergedOut'),
    autoFromTxt: $('#autoFromTxt'),
    markNoBreach:$('#markNoBreach'),
    acceptedList:$('#acceptedList'),
    acceptedCount:$('#acceptedCount'),
    overwrite:   $('#overwrite'),
    sortBy:      $('#sortBy'),
    genBtn:      $('#genBtn'),
    copyBtn:     $('#copyBtn'),
    dlBtn:       $('#dlBtn'),
    status:      $('#status')
  };

  // ---------- helpers ----------
  const registryPaths = [
    '../../data/citations.json', // from docs/bulk/
    '../data/citations.json',
    'data/citations.json',
    'citations.json'
  ];

  const setStatus = (m) => { els.status.textContent = m || ''; };
  const toJSON = (o) => JSON.stringify(o, null, 2);
  const norm = (s) => String(s||'').trim();

  const isYear = (x) => /^\d{4}$/.test(String(x||''));

  const slug = (s) => norm(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');

  function fitTextareas(){
    const pad = 110;
    [els.mergedOut, els.pasteArea].forEach(t=>{
      if(!t) return;
      const rect = t.getBoundingClientRect();
      const target = Math.max(260, window.innerHeight - rect.top - pad);
      t.style.height = target + 'px';
    });
  }
  window.addEventListener('resize', fitTextareas);

  // Guess basic fields from a txt filename like:
  // "State House Trust v Friend [2025]JRC158.txt"
  function inferFromTxtName(name){
    const base = name.replace(/\.(txt|csv|json)$/i,'').trim();
    let case_name = base;
    let year = '';
    let citation = '';
    const m = base.match(/\[(\d{4})\]\s*([A-Z]+)\s*([0-9A-Za-z_-]+)/);
    if (m){
      year = m[1];
      citation = `[${m[1]}] ${m[2]} ${m[3].replace(/_/g,'')}`;
      case_name = base.replace(m[0], '').replace(/\s{2,}/g,' ').trim();
    }
    return { case_name, year, citation };
  }

  function defaultEnvelope(p){
    // schema with placeholders kept for integrity
    const id = `${slug(p.case_name||'case')}-${p.year||'0000'}`;
    const rec = {
      id,
      case_name: norm(p.case_name),
      citation:  norm(p.citation),
      year:      isYear(p.year) ? Number(p.year) : '',
      court:     p.court || (/\bJRC\b/i.test(p.citation||'') ? 'Royal Court' : ''),
      jurisdiction: p.jurisdiction || (/\bJRC\b/i.test(p.citation||'') ? 'Jersey' : ''),
      summary:   p.summary || '',
      holding:   p.holding || '',
      source:    p.source || '',
      compliance_flags: p.compliance_flags || '',
      tags:      p.tags || '',
      observed_conduct: p.observed_conduct || '',
      anomaly_detected: p.anomaly_detected || '',
      breached_law_or_rule: p.breached_law_or_rule || '',
      authority_basis: p.authority_basis || '',
      canonical_breach_tag: p.canonical_breach_tag || '',
      case_link: p.case_link || '',
      full_text: p.full_text || ''
    };
    return rec;
  }

  function shortLine(r){
    const cit = r.citation ? ` — ${r.citation}` : '';
    return `${r.case_name}${cit}`;
  }

  function setAccepted(list){
    els.acceptedList.innerHTML = '';
    list.forEach(rec=>{
      const li = document.createElement('li');
      li.textContent = shortLine(rec);
      els.acceptedList.appendChild(li);
    });
    els.acceptedCount.textContent = String(list.length);
  }

  // ---------- state ----------
  let accepted = [];
  let existing = [];

  async function loadRegistry(){
    for (const path of registryPaths){
      try{
        const res = await fetch(path, {cache:'no-store'});
        if(res.ok){
          return await res.json();
        }
      }catch(e){}
    }
    return []; // none found is okay
  }

  // parse JSON or CSV pasted in the left box
  function parsePasted(text){
    const t = text.trim();
    if(!t) return [];
    if(t.startsWith('[')){   // JSON array
      const arr = JSON.parse(t);
      return arr.map(defaultEnvelope);
    }
    // CSV (very light parser: commas, header row)
    const rows = t.split(/\r?\n/).filter(Boolean);
    const headers = rows.shift().split(',').map(h=>h.trim().replace(/^"|"$/g,''));
    return rows.map(line=>{
      const cols = line.split(',').map(v=>v.trim().replace(/^"|"$/g,''));
      const obj = {};
      headers.forEach((h,i)=> obj[h] = cols[i]||'');
      return defaultEnvelope(obj);
    });
  }

  // ---------- UI actions ----------
  els.file.addEventListener('change', ()=>{
    els.fileName.textContent = els.file.files?.[0]?.name || 'No file chosen';
  });

  els.clearBtn.addEventListener('click', ()=>{
    els.pasteArea.value = '';
    accepted = [];
    setAccepted(accepted);
    els.mergedOut.value = '[]';
    setStatus('');
  });

  els.parseBtn.addEventListener('click', ()=>{
    try{
      const pasted = norm(els.pasteArea.value);
      let batch = [];
      if (pasted){
        batch = parsePasted(pasted);
      } else if (els.autoFromTxt.checked && els.file.files?.length){
        const f = els.file.files[0];
        const guess = inferFromTxtName(f.name);
        const env = defaultEnvelope({
          ...guess,
          source: f.name
        });
        if (els.markNoBreach.checked){
          env.compliance_flags = 'no-breach';
          env.canonical_breach_tag = 'no-breach';
        }
        batch = [env];
      } else {
        setStatus('Nothing to parse. Paste JSON/CSV or select a TXT with auto-fill checked.');
        return;
      }
      accepted = batch;
      setAccepted(accepted);
      els.mergedOut.value = toJSON(batch);
      fitTextareas();
      setStatus(`Parsed ${batch.length} entr${batch.length===1?'y':'ies'}.`);
    }catch(err){
      console.error(err);
      setStatus('Parse error: ' + err.message);
    }
  });

  els.copyBtn.addEventListener('click', async ()=>{
    try{
      await navigator.clipboard.writeText(els.mergedOut.value || '[]');
      setStatus('Merged JSON copied to clipboard.');
    }catch(e){
      setStatus('Copy failed.');
    }
  });

  els.dlBtn.addEventListener('click', ()=>{
    const blob = new Blob([els.mergedOut.value || '[]'], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'citations.merged.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  els.genBtn.addEventListener('click', async ()=>{
    try{
      if(!accepted.length){
        setStatus('Nothing accepted. Parse first.');
        return;
      }
      if(!existing.length){
        existing = await loadRegistry();
      }
      const byId = new Map(existing.map(x=>[x.id,x]));
      const overwrite = els.overwrite.checked;

      accepted.forEach(r=>{
        if(overwrite || !byId.has(r.id)){
          byId.set(r.id, r);
        }
      });

      let out = Array.from(byId.values());
      const sortBy = els.sortBy.value;
      out.sort((a,b)=>{
        if(sortBy==='year') return (a.year||0)-(b.year||0) || String(a.case_name).localeCompare(String(b.case_name));
        return String(a.case_name).localeCompare(String(b.case_name)) || (a.year||0)-(b.year||0);
      });

      els.mergedOut.value = toJSON(out);
      fitTextareas();
      setStatus(`Merged ${accepted.length} entr${accepted.length===1?'y':'ies'} with ${existing.length} existing.`);
    }catch(err){
      console.error(err);
      setStatus('Merge failed: ' + err.message);
    }
  });

  // ---------- init ----------
  (async function init(){
    setAccepted([]);
    els.mergedOut.value = '[]';
    existing = await loadRegistry();
    fitTextareas();
    setStatus(existing.length ? `Loaded ${existing.length} existing citations.` : 'No existing registry found (will create new).');
  })();
})();
