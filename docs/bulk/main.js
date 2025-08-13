(function () {
  const $ = (id) => document.getElementById(id);
  const els = {
    fileInput: $('fileInput'), fileName: $('fileName'),
    parseBtn: $('parseBtn'), clearBtn: $('clearBtn'),
    autoFromTxt: $('autoFromTxt'), pasteBox: $('pasteBox'),
    previewBox: $('previewBox'), acceptedList: $('acceptedList'),
    acceptedCount: $('acceptedCount'), validationLine: $('validationLine'),
    overwriteChk: $('overwriteChk'), sortBy: $('sortBy'),
    genBtn: $('genBtn'), copyBtn: $('copyBtn'), dlBtn: $('dlBtn')
  };

  let rawFileText = '';
  let accepted = [];

  const escapeHtml = (s='') => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
  const setValidation = (m) => els.validationLine.textContent = m;
  const showPreview = (arr) => { els.previewBox.value = JSON.stringify(arr, null, 2); };

  function toCSVrows(text) {
    const lines = text.replace(/\r/g,'').split('\n').filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h=>h.trim());
    return lines.slice(1).map(line=>{
      const cols = line.split(',');
      const o = {};
      headers.forEach((h,i)=>o[h]=(cols[i]||'').trim());
      return o;
    });
  }

  function setAccepted(list) {
    accepted = list;
    els.acceptedCount.textContent = String(list.length);
    const items = list.slice(0,2).map(e =>
      `<li>${escapeHtml(e.case_name || e.id || '(no name)')} — <code>${escapeHtml(e.citation||'')}</code></li>`
    ).join('');
    els.acceptedList.innerHTML = items || '';
  }

  function inferFromTxtName(fileName) {
    const base = fileName.replace(/\.[^.]+$/, '');
    const yearMatch = base.match(/\[(\d{4})\]/);
    const year = yearMatch ? +yearMatch[1] : '';
    const cit = base.match(/\[\d{4}\]\s*[A-Za-z]+[A-Za-z0-9-]*\s*\d+[A-Za-z0-9-]*/);
    const citation = cit ? cit[0].replace(/\s+/g,' ').trim() : (base.match(/\[.*$/)?.[0] || '').trim();
    const case_name = base.replace(/\s*\[\d{4}\].*$/,'').replace(/[_\-]+/g,' ').replace(/\s{2,}/g,' ').trim();

    let summary = '';
    if (rawFileText) {
      const t = rawFileText.replace(/\s+/g,' ').trim();
      summary = t.slice(0,250) + (t.length>250 ? '…' : '');
    }

    return {
      id: slug(case_name + (year ? '-' + year : '')),
      case_name, citation, year,
      court: '', jurisdiction: '',
      summary, holding: '', source: '',
      compliance_flags: '', tags: '',
      observed_conduct: '', anomaly_detected: '',
      breached_law_or_rule: '', authority_basis: '',
      canonical_breach_tag: '', case_link: '',
      full_text: ''
    };
  }

  function normalise(obj) {
    const keys = [
      'id','case_name','citation','year','court','jurisdiction','summary','holding','source',
      'compliance_flags','tags','observed_conduct','anomaly_detected','breached_law_or_rule',
      'authority_basis','canonical_breach_tag','case_link','full_text'
    ];
    const out = {};
    keys.forEach(k => out[k] = ((obj[k] ?? '') + '').trim());
    if (/^\d{4}$/.test(String(obj.year))) out.year = +obj.year; else if (!obj.year) out.year = '';
    return out;
  }

  function validateEntry(e) {
    const errs = [];
    if (!e.id || !/^[a-z0-9-]+$/.test(e.id)) errs.push('id must be lowercase letters, numbers, hyphens');
    if (!e.case_name) errs.push('case_name required');
    if (!e.citation || !/\[\d{4}\]/.test(e.citation)) errs.push('citation must contain [YYYY]');
    if (String(e.year||'').length && !/^\d{4}$/.test(String(e.year))) errs.push('year must be 4-digit');
    return errs;
  }

  async function readSelectedFile() {
    const f = els.fileInput.files && els.fileInput.files[0];
    if (!f) { els.fileName.textContent = 'No file selected'; return ''; }
    els.fileName.textContent = f.name;
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onerror = () => rej(r.error);
      r.onload = () => res(String(r.result || ''));
      r.readAsText(f);
    });
  }

  function parseContent() {
    let items = [];
    const pasted = els.pasteBox.value.trim();

    if (pasted) {
      try { const arr = JSON.parse(pasted); if (Array.isArray(arr)) items = arr; }
      catch { items = toCSVrows(pasted); }
    } else if (rawFileText) {
      const name = els.fileInput.files?.[0]?.name || '';
      const ext = (name.split('.').pop() || '').toLowerCase();
      if (ext === 'json') {
        try { const arr = JSON.parse(rawFileText); if (Array.isArray(arr)) items = arr; } catch {}
      } else if (ext === 'csv') items = toCSVrows(rawFileText);
      else if (ext === 'txt') {
        try { const maybe = JSON.parse(rawFileText); if (Array.isArray(maybe)) items = maybe; }
        catch { if (els.autoFromTxt.checked && name) items = [inferFromTxtName(name)]; }
      }
    }

    const ok = [], bad = [];
    items.forEach(it => {
      const n = normalise(it);
      (validateEntry(n).length ? bad : ok).push(n);
    });

    setAccepted(ok);
    showPreview(ok);
    if (ok.length && !bad.length) setValidation(`All ${ok.length} entries are valid.`);
    else if (!ok.length && !bad.length) setValidation('No entries detected. Provide JSON/CSV or enable TXT filename inference.');
    else setValidation(`Accepted ${ok.length}. Rejected ${bad.length}.`);

    return { ok, bad };
  }

  function generateMergedJson() {
    const list = [...accepted];
    const key = els.sortBy.value;
    list.sort((a,b)=>{
      const A=(a[key]??'').toString().toLowerCase(), B=(b[key]??'').toString().toLowerCase();
      return A<B?-1:A>B?1:0;
    });
    showPreview(list);
    els.previewBox.scrollIntoView({behavior:'smooth', block:'start'});
  }

  // events
  els.fileInput.addEventListener('change', async ()=>{
    rawFileText = await readSelectedFile();
    setValidation('File loaded. Click “Parse & Validate” or “Generate Merged JSON”.');
  });

  els.parseBtn.addEventListener('click', async ()=>{
    if (els.fileInput.files?.length && !rawFileText) {
      try { rawFileText = await readSelectedFile(); } catch {}
    }
    parseContent();
  });

  els.genBtn.addEventListener('click', async ()=>{
    if (!accepted.length) {
      if (els.fileInput.files?.length && !rawFileText) {
        try { rawFileText = await readSelectedFile(); } catch {}
      }
      parseContent();
    }
    if (!accepted.length) { setValidation('Nothing to merge yet — provide data or parse first.'); return; }
    generateMergedJson();
  });

  els.copyBtn.addEventListener('click', ()=> navigator.clipboard.writeText(els.previewBox.value||'[]'));
  els.dlBtn.addEventListener('click', ()=>{
    const blob = new Blob([els.previewBox.value||'[]'],{type:'application/json;charset=utf-8'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='citations-merged.json';
    a.click(); URL.revokeObjectURL(a.href);
  });

  els.clearBtn.addEventListener('click', ()=>{
    els.fileInput.value=''; els.fileName.textContent='No file selected';
    els.pasteBox.value=''; rawFileText=''; setAccepted([]); showPreview([]); setValidation('Validation: cleared.');
  });

  try {
    const saved=localStorage.getItem('bulk:autoFromTxt');
    if(saved!==null) els.autoFromTxt.checked = saved==='1';
    els.autoFromTxt.addEventListener('change',()=>localStorage.setItem('bulk:autoFromTxt', els.autoFromTxt.checked?'1':'0'));
  } catch {}
})();
