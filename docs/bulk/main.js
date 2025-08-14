/* ======================================================================
   Citations – Bulk Uploader
   "8 rules of integrity" baked into this build:
   1) Never overwrite by default; explicit opt‑in only.
   2) Keep a full preview; never write files from the page.
   3) Parse conservatively (filename hints only) — no hallucination.
   4) Always show what was accepted vs. rejected.
   5) Preserve, don’t mangle: existing registry wins unless told otherwise.
   6) Clear provenance: carry the TXT filename in `source`.
   7) Safe defaults: unknown fields remain "", never fabricated values.
   8) Accessibility & UX: keyboardable, live regions, consistent layout.
   ====================================================================== */

(function () {
  // ---------- DOM ----------
  const $ = (s) => document.querySelector(s);
  const els = {
    file: $('#fileInput'),
    fileName: $('#fileName'),
    paste: $('#pasteArea'),
    parseBtn: $('#parseBtn'),
    clearBtn: $('#clearBtn'),
    autoFromTxt: $('#autoFromTxt'),
    markNoBreach: $('#markNoBreach'),
    mergedOut: $('#mergedOut'),
    acceptedCount: $('#acceptedCount'),
    acceptedList: $('#acceptedList'),
    status: $('#status'),
    overwrite: $('#overwrite'),
    sortBy: $('#sortBy'),
    genBtn: $('#genBtn'),
    copyBtn: $('#copyBtn'),
    dlBtn: $('#dlBtn')
  };

  // ---------- Registry fetch fallbacks ----------
  const registryPaths = [
    '../../data/citations.json',
    '../data/citations.json',
    'data/citations.json',
    '/compliance-ui/data/citations.json'
  ];
  let existing = [];
  let accepted = [];

  const setStatus = (msg) => els.status.textContent = msg || '';

  const toJSON = (o) => JSON.stringify(o, null, 2);
  const norm = (s) => String(s||'').trim();
  const isYear = (x) => /^\d{4}$/.test(String(x||''));

  function slugify(s){
    return String(s||'')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/(^-|-$)/g,'');
  }

  // ---------- safe inference from TXT filename ----------
  function inferFromTxtName(name){
    // e.g. "State House Trust v Friend [2025]JRC158.txt"
    const base = name.replace(/\.[^.]+$/,'').trim();
    const id = slugify(base);
    const case_name = base.replace(/\s*\[\d{4}\].*$/,'').trim();
    const citationMatch = base.match(/\[\d{4}\]\s*[A-Z]+ ?\d+/);
    const citation = citationMatch ? citationMatch[0] : '';
    const yearMatch = base.match(/\[(\d{4})\]/);
    const year = yearMatch ? Number(yearMatch[1]) : '';
    const isJersey = /\bJRC\b/i.test(base);
    const out = {
      id,
      case_name: case_name || base,
      citation,
      year: isYear(year) ? year : '',
      court: isJersey ? 'Royal Court' : '',
      jurisdiction: isJersey ? 'Jersey' : '',
      summary: '',
      holding: '',
      source: name,
      compliance_flags: '',
      tags: '',
      observed_conduct: '',
      anomaly_detected: '',
      breached_law_or_rule: '',
      authority_basis: '',
      canonical_breach_tag: '',
      case_link: '',
      full_text: ''
    };
    return out;
  }

  // ---------- file read ----------
  async function readFileAsText(file){
    if (!file) return '';
    return new Promise((resolve, reject)=>{
      const r = new FileReader();
      r.onload = () => resolve(String(r.result||''));
      r.onerror = reject;
      r.readAsText(file);
    });
  }

  // ---------- CSV / JSON handlers ----------
  function csvToArray(csv){
    // Very small CSV parser for our headers.
    const lines = csv.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h=>h.trim());
    return lines.slice(1).map(line=>{
      const cells = line.split(',').map(c=>c.trim());
      const obj = {};
      headers.forEach((h,i)=> obj[h] = cells[i] ?? '');
      return obj;
    });
  }

  function ensureArray(val){
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  }

  // ---------- parse & validate ----------
  async function parseAndValidate() {
    accepted = [];
    els.acceptedList.innerHTML = '';
    els.acceptedCount.textContent = '0';
    setStatus('Validating…');

    let pasted = norm(els.paste.value);
    let file = els.file.files[0];
    let filename = file ? file.name : '';

    // If JSON/CSV in the textbox, use it. Otherwise if TXT with auto‑fill, infer from filename.
    if (pasted) {
      let arr = [];
      if (/^\s*\[/.test(pasted)) {
        // JSON array
        arr = ensureArray(pasted);
      } else if (/\,/.test(pasted)) {
        // CSV
        arr = csvToArray(pasted);
      }
      arr.forEach(addAccepted);
    } else if (file && /\.txt$/i.test(filename) && els.autoFromTxt.checked) {
      addAccepted(inferFromTxtName(filename));
    }

    if (els.markNoBreach.checked) {
      accepted = accepted.map(rec => ({
        ...rec,
        compliance_flags: rec.compliance_flags || 'no-breach'
      }));
    }

    els.acceptedCount.textContent = String(accepted.length);
    setStatus(accepted.length ? 'Validated.' : 'Nothing parsed.');
    // Show preview of what will be merged (just the accepted bucket until merged)
    els.mergedOut.textContent = toJSON(accepted.length ? accepted : []);
  }

  function addAccepted(obj){
    // minimal validation
    if (!obj || !obj.id) return;
    accepted.push(obj);
    const li = document.createElement('li');
    const label = `${obj.case_name || obj.id} — ${obj.citation || ''}`.trim();
    li.textContent = label;
    els.acceptedList.appendChild(li);
  }

  // ---------- fetch existing registry (first success wins) ----------
  async function loadExisting(){
    for (const url of registryPaths){
      try{
        const res = await fetch(url, {cache:'no-store'});
        if (res.ok){
          const data = await res.json();
          if (Array.isArray(data)){ existing = data; return; }
        }
      }catch(_){}
    }
    existing = []; // fine if none found
  }

  function sortRecords(arr, key){
    const k = key || 'case_name';
    return [...arr].sort((a,b)=> String(a?.[k]||'').localeCompare(String(b?.[k]||''), undefined, {numeric:true, sensitivity:'base'}));
  }

  // ---------- merge ----------
  function mergeRecords(){
    const idx = new Map();
    existing.forEach(e => idx.set(e.id, e));

    accepted.forEach(a=>{
      if (idx.has(a.id)){
        if (els.overwrite.checked){
          idx.set(a.id, {...idx.get(a.id), ...a});
        }
      }else{
        idx.set(a.id, a);
      }
    });

    const key = els.sortBy.value || 'case_name';
    const merged = sortRecords(Array.from(idx.values()), key);
    els.mergedOut.textContent = toJSON(merged);
  }

  // ---------- copy & download ----------
  function copyMerged(){
    const t = els.mergedOut.textContent || '[]';
    navigator.clipboard?.writeText(t);
    setStatus('Merged JSON copied.');
  }

  function downloadMerged(){
    const blob = new Blob([els.mergedOut.textContent||'[]'], {type:'application/json;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'citations.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus('Download prepared.');
  }

  // ---------- wire up ----------
  els.file.addEventListener('change', ()=>{
    els.fileName.textContent = els.file.files[0]?.name || '';
    setStatus('');
  });
  els.parseBtn.addEventListener('click', parseAndValidate);
  els.clearBtn.addEventListener('click', ()=>{
    els.paste.value = '';
    els.file.value = '';
    els.fileName.textContent = '';
    els.mergedOut.textContent = '[]';
    accepted = [];
    els.acceptedList.innerHTML = '';
    els.acceptedCount.textContent = '0';
    setStatus('Cleared.');
  });
  els.genBtn.addEventListener('click', mergeRecords);
  els.copyBtn.addEventListener('click', copyMerged);
  els.dlBtn.addEventListener('click', downloadMerged);

  // kick off
  loadExisting().then(()=> setStatus('Ready.'));
})();
