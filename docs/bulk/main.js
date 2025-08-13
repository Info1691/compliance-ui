/* Citations Bulk Uploader — single-file JS
   - Accepts JSON array, CSV, or plain-text case (.txt)
   - Validates minimal required fields
   - Merges with existing registry loaded from data/citations.json (with fallbacks)
   - NEVER writes files; shows merged JSON to copy/download
*/

(function () {
  // ---------- DOM ----------
  const els = {
    file:        $('#fileInput'),
    fileName:    $('#fileName'),
    parseBtn:    $('#parseBtn'),
    clearBtn:    $('#clearBtn'),
    paste:       $('#pasteBox'),
    results:     $('#results'),

    acceptedList:  $('#acceptedList'),
    acceptedCount: $('#acceptedCount'),

    overwrite:   $('#overwrite'),
    sortBy:      $('#sortBy'),
    generateBtn: $('#generateBtn'),
    copyBtn:     $('#copyBtn'),
    downloadBtn: $('#downloadBtn'),
    mergedOut:   $('#mergedOutput'),
    registryPath:$('#registryPath'),
    targetPath:  $('#targetPath')
  };

  function $(sel){ return document.querySelector(sel); }

  // ---------- CONFIG ----------
  const REGISTRY_PATHS = [
    'data/citations.json',
    'citations.json'
  ];
  let existing = [];
  let accepted = [];       // validated incoming items
  let usedPath = REGISTRY_PATHS[0];

  // ---------- Helpers ----------
  const slug = s => (s||'')
    .toLowerCase()
    .replace(/&/g,'and')
    .replace(/[^a-z0-9\- ]+/g,'')
    .trim()
    .replace(/\s+/g,'-');

  function setResults(msg){ els.results.textContent = msg; }
  function noteAccepted(list){
    els.acceptedList.innerHTML = list.map(x => `<li>${escapeHtml(x.case_name)} — ${escapeHtml(x.citation||'')}</li>`).join('');
    els.acceptedCount.textContent = String(list.length);
  }
  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Basic validation: id, case_name, citation, year 4-digit
  function validate(item){
    const errs = [];
    if(!item.id) errs.push('id required');
    if(item.id && !/^[a-z0-9-]+$/.test(item.id)) errs.push('id must be lowercase letters, numbers, hyphens');
    if(!item.case_name) errs.push('case_name required');
    if(!item.citation) errs.push('citation required');
    if(String(item.year||'').length!==4 || !/^\d{4}$/.test(String(item.year))) errs.push('year must be 4 digits');
    return errs;
  }

  function parseCSV(text){
    const lines = text.split(/\r?\n/).filter(Boolean);
    if(!lines.length) return [];
    const headers = lines[0].split(',').map(h=>h.trim());
    return lines.slice(1).map(row=>{
      const cols = row.split(',');
      const obj = {};
      headers.forEach((h,i)=> obj[h] = (cols[i]||'').trim());
      // coerce year
      if (obj.year) obj.year = Number(obj.year);
      return obj;
    });
  }

  // Parse a single-case .txt by filename (quick utility)
  function parseTxtByFilename(name, rawText){
    // Example filename: "State House Trust v Friend [2025] JRC 158.txt"
    const base = name.replace(/\.[^.]+$/,'');
    // Extract parts:
    const caseName = base.replace(/\[[^\]]+\].*$/,'').trim();
    const citationMatch = base.match(/\[[0-9]{4}\]\s*[A-Z]+.*$/);
    const citation = citationMatch ? citationMatch[0] : '';
    const yearMatch = citation.match(/\[([0-9]{4})\]/) || base.match(/\[([0-9]{4})\]/);
    const year = yearMatch ? Number(yearMatch[1]) : NaN;

    // Guess court + jurisdiction from citation (very rough)
    let court = ''; let jurisdiction = '';
    if (/\bJRC\b/.test(citation)) { court = 'Royal Court'; jurisdiction = 'Jersey'; }
    else if (/\bJCA\b/.test(citation)) { court = 'Court of Appeal'; jurisdiction = 'Jersey'; }

    const id = slug(`${caseName}-${year||''}`);

    const obj = {
      id, case_name: caseName, citation, year: year||'', court, jurisdiction,
      summary:"", holding:"", source:"", compliance_flags:"", tags:"", observed_conduct:"", anomaly_detected:"",
      breached_law_or_rule:"", authority_basis:"", canonical_breach_tag:"", case_link:"",
      full_text: extractFirstLines(rawText, 12) // small snippet to help the editor
    };
    return obj;
  }

  function extractFirstLines(text, n){
    return (text||'').split(/\r?\n/).slice(0,n).join('\n');
  }

  // ---------- Existing registry loader ----------
  async function loadExisting(){
    let lastErr = '';
    for (const p of REGISTRY_PATHS){
      try{
        const res = await fetch(p, {cache:'no-store'});
        if(!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        if (!Array.isArray(json)) throw new Error('registry must be an array');
        existing = json;
        usedPath = p;
        els.registryPath.textContent = 'Existing registry: ' + p;
        els.targetPath.textContent = p;
        return;
      }catch(e){ lastErr = e.message; }
    }
    els.registryPath.textContent = 'Existing registry: (not found)';
    console.warn('Could not load registry:', lastErr);
    existing = [];
  }

  // ---------- Merging ----------
  function mergeEntries(base, incoming, overwrite){
    const map = new Map(base.map(x => [x.id, x]));
    for (const it of incoming){
      if (map.has(it.id) && !overwrite) continue;
      map.set(it.id, it);
    }
    return Array.from(map.values());
  }

  function sortEntries(arr, by){
    const k = by || 'case_name';
    return arr.slice().sort((a,b)=>{
      const A = (a[k] ?? '').toString().toLowerCase();
      const B = (b[k] ?? '').toString().toLowerCase();
      if (A<B) return -1; if (A>B) return 1; return 0;
    });
  }

  // ---------- Events ----------
  els.file.addEventListener('change', () => {
    els.fileName.textContent = els.file.files && els.file.files[0] ? els.file.files[0].name : '';
  });

  els.clearBtn.addEventListener('click', () => {
    els.file.value = '';
    els.fileName.textContent = '';
    els.paste.value = '';
    accepted = [];
    setResults('Cleared.');
    noteAccepted(accepted);
    els.mergedOut.textContent = 'Tip: copy this JSON and commit it to ' + usedPath + ' in your repo.';
  });

  els.parseBtn.addEventListener('click', async () => {
    try{
      accepted = [];
      setResults('Parsing…');

      // 1) From paste box?
      const pasted = els.paste.value.trim();
      if (pasted){
        let items = [];
        if (pasted.startsWith('[')){  // JSON array
          items = JSON.parse(pasted);
        } else if (pasted.includes(',')){ // CSV text
          items = parseCSV(pasted);
        }
        const {val, bad} = validateMany(items);
        accepted = val;
        setResults(bad.length ? prettyIssues(bad) : `All ${accepted.length} entries are valid.`);
        noteAccepted(accepted);
        return;
      }

      // 2) From file
      const f = els.file.files && els.file.files[0];
      if (!f){ setResults('No input. Choose a file or paste data.'); return; }
      const text = await f.text();

      let items = [];
      if (f.name.toLowerCase().endsWith('.json')){
        items = JSON.parse(text);
      } else if (f.name.toLowerCase().endsWith('.csv')){
        items = parseCSV(text);
      } else { // .txt — single case, infer from filename
        items = [ parseTxtByFilename(f.name, text) ];
      }

      const {val, bad} = validateMany(items);
      accepted = val;
      setResults(bad.length ? prettyIssues(bad) : `All ${accepted.length} entries are valid.`);
      noteAccepted(accepted);

    }catch(err){
      console.error(err);
      setResults('Parse error: ' + err.message);
    }
  });

  function validateMany(items){
    const val=[], bad=[];
    (items||[]).forEach((it,i)=>{
      const errs = validate(it);
      if (errs.length) bad.push(`#${i+1}: `+errs.join('; '));
      else val.push(it);
    });
    return {val, bad};
  }
  function prettyIssues(arr){
    return 'Validation errors:\n\n' + arr.map(s=>'• '+s).join('\n');
  }

  els.generateBtn.addEventListener('click', () => {
    try{
      const overwrite = !!els.overwrite.checked;
      const sortBy = els.sortBy.value || 'case_name';
      const merged = sortEntries( mergeEntries(existing, accepted, overwrite), sortBy );
      const json = JSON.stringify(merged, null, 2);
      els.mergedOut.textContent = json;
      // prep download
      const blob = new Blob([json], {type:'application/json'});
      els.downloadBtn.href = URL.createObjectURL(blob);
    }catch(err){
      els.mergedOut.textContent = 'Error: ' + err.message;
    }
  });

  els.copyBtn.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(els.mergedOut.textContent || '');
      els.copyBtn.textContent = 'Copied!';
      setTimeout(()=> els.copyBtn.textContent='Copy', 900);
    }catch(e){ console.warn(e); }
  });

  // ---------- Kickoff ----------
  loadExisting();
})();
