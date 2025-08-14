/* Bulk Uploader — stable build (buttons set to type="button") */
(function () {
  const $ = (s) => document.querySelector(s);
  const els = {
    file: $('#fileInput'), fileName: $('#fileName'),
    paste: $('#pasteArea'), parseBtn: $('#parseBtn'), clearBtn: $('#clearBtn'),
    autoFromTxt: $('#autoFromTxt'), markNoBreach: $('#markNoBreach'),
    mergedOut: $('#mergedOut'),
    acceptedCount: $('#acceptedCount'), acceptedList: $('#acceptedList'), status: $('#status'),
    overwrite: $('#overwrite'), sortBy: $('#sortBy'),
    genBtn: $('#genBtn'), copyBtn: $('#copyBtn'), dlBtn: $('#dlBtn')
  };

  const registryPaths = [
    '../../data/citations.json','../data/citations.json','data/citations.json','/compliance-ui/data/citations.json'
  ];
  let existing = []; let accepted = [];

  const setStatus = (m='') => els.status && (els.status.textContent = m);
  const toJSON = (o)=> JSON.stringify(o,null,2);
  const norm = (s)=> String(s||'').trim();
  const isYear = (x)=> /^\d{4}$/.test(String(x||''));
  const slug = (s)=> String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

  function inferFromTxt(name){
    const base = name.replace(/\.[^.]+$/,'').trim();
    const id = slug(base);
    const case_name = base.replace(/\s*\[\d{4}\].*$/,'').trim();
    const citation = (base.match(/\[\d{4}\]\s*[A-Z]+ ?\d+/)||[''])[0];
    const year = (base.match(/\[(\d{4})\]/)||[])[1] || '';
    const isJersey = /\bJRC\b/i.test(base);
    return {
      id, case_name: case_name || base, citation,
      year: isYear(year) ? Number(year) : '',
      court: isJersey ? 'Royal Court' : '',
      jurisdiction: isJersey ? 'Jersey' : '',
      summary:'', holding:'', source:name, compliance_flags:'',
      tags:'', observed_conduct:'', anomaly_detected:'',
      breached_law_or_rule:'', authority_basis:'',
      canonical_breach_tag:'', case_link:'', full_text:''
    };
  }

  function addAccepted(obj){
    if (!obj || !obj.id) return;
    accepted.push(obj);
    if (els.acceptedList){
      const li = document.createElement('li');
      li.textContent = `${obj.case_name || obj.id} — ${obj.citation || ''}`.trim();
      els.acceptedList.appendChild(li);
    }
  }

  function ensureArray(v){
    if (!v) return [];
    if (Array.isArray(v)) return v;
    try{ const p = JSON.parse(v); return Array.isArray(p)?p:[]; }catch{ return []; }
  }

  function csvToArray(csv){
    const lines = csv.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h=>h.trim());
    return lines.slice(1).map(line=>{
      const cells = line.split(',').map(c=>c.trim());
      const o={}; headers.forEach((h,i)=>o[h]=cells[i]??''); return o;
    });
  }

  async function loadExisting(){
    for (const path of registryPaths){
      try{
        const res = await fetch(path,{cache:'no-store'});
        if (res.ok){
          const data = await res.json();
          if (Array.isArray(data)){ existing = data; return; }
        }
      }catch(_){}
    }
    existing = [];
  }

  async function parseAndValidate(){
    accepted = []; if (els.acceptedList) els.acceptedList.innerHTML = '';
    if (els.acceptedCount) els.acceptedCount.textContent = '0';
    setStatus('Validating…');

    const pasted = norm(els.paste?.value);
    const file = els.file?.files?.[0];
    const filename = file?.name || '';

    if (pasted){
      let arr = [];
      if (/^\s*\[/.test(pasted)) arr = ensureArray(pasted);
      else if (/,/.test(pasted)) arr = csvToArray(pasted);
      arr.forEach(addAccepted);
    } else if (file && /\.txt$/i.test(filename) && els.autoFromTxt?.checked){
      addAccepted(inferFromTxt(filename));
    }

    if (els.markNoBreach?.checked){
      accepted = accepted.map(r=>({...r, compliance_flags: r.compliance_flags || 'no-breach'}));
    }

    if (els.acceptedCount) els.acceptedCount.textContent = String(accepted.length);
    setStatus(accepted.length ? 'Validated.' : 'Nothing parsed.');
    els.mergedOut.textContent = toJSON(accepted.length ? accepted : []);
  }

  function sortRecords(arr, key){
    const k = key || 'case_name';
    return [...arr].sort((a,b)=> String(a?.[k]||'').localeCompare(String(b?.[k]||''), undefined, {numeric:true,sensitivity:'base'}));
  }

  function mergeRecords(){
    // If nothing parsed yet, still let users see the current registry.
    const idx = new Map();
    existing.forEach(e=>idx.set(e.id,e));
    accepted.forEach(a=>{
      if (idx.has(a.id)){
        if (els.overwrite?.checked){ idx.set(a.id,{...idx.get(a.id),...a}); }
      } else idx.set(a.id,a);
    });
    const merged = sortRecords(Array.from(idx.values()), els.sortBy?.value || 'case_name');
    els.mergedOut.textContent = toJSON(merged);
    setStatus('Merged preview generated.');
    // scroll preview into view on small screens
    els.mergedOut.parentElement?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function copyMerged(){
    const t = els.mergedOut.textContent || '[]';
    navigator.clipboard?.writeText(t);
    setStatus('Merged JSON copied.');
  }
  function downloadMerged(){
    const blob = new Blob([els.mergedOut.textContent||'[]'], {type:'application/json;charset=utf-8'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'citations.json'; a.click(); URL.revokeObjectURL(a.href);
    setStatus('Download prepared.');
  }

  // wire up
  els.file?.addEventListener('change', ()=>{ els.fileName.textContent = els.file.files[0]?.name || ''; setStatus(''); });
  els.parseBtn?.addEventListener('click', parseAndValidate);
  els.clearBtn?.addEventListener('click', ()=>{
    if (els.paste) els.paste.value=''; if (els.file) els.file.value='';
    els.fileName.textContent=''; els.mergedOut.textContent='[]';
    accepted=[]; if (els.acceptedList) els.acceptedList.innerHTML=''; if (els.acceptedCount) els.acceptedCount.textContent='0';
    setStatus('Cleared.');
  });
  els.genBtn?.addEventListener('click', mergeRecords);
  els.copyBtn?.addEventListener('click', copyMerged);
  els.dlBtn?.addEventListener('click', downloadMerged);

  // init
  loadExisting().then(()=> setStatus('Ready.'));
})();
