(function () {
  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const els = {
    fileInput: $('fileInput'),
    fileName: $('fileName'),
    parseBtn: $('parseBtn'),
    clearBtn: $('clearBtn'),
    autoFromTxt: $('autoFromTxt'),
    pasteBox: $('pasteBox'),
    previewBox: $('previewBox'),
    acceptedList: $('acceptedList'),
    acceptedCount: $('acceptedCount'),
    validationLine: $('validationLine'),
    overwriteChk: $('overwriteChk'),
    sortBy: $('sortBy'),
    genBtn: $('genBtn'),
    copyBtn: $('copyBtn'),
    dlBtn: $('dlBtn'),
  };

  // ---------- State ----------
  let rawFileText = '';
  let accepted = [];

  // ---------- Utils ----------
  const slug = (s) => s
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  function toCSVrows(text) {
    // very small tolerant splitter: split by newlines, first line headers
    const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const cols = line.split(',');
      const obj = {};
      headers.forEach((h, i) => obj[h] = (cols[i] || '').trim());
      return obj;
    });
  }

  function setAccepted(list) {
    accepted = list;
    els.acceptedCount.textContent = String(accepted.length);
    els.acceptedList.innerHTML = accepted
      .map(e => `<li>${escapeHtml(e.case_name || e.id || '(no name)')} — <code>${escapeHtml(e.citation || '')}</code></li>`)
      .join('');
  }

  const escapeHtml = (s) => (s || '')
    .replace(/&/g, '&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function showPreview(objs) {
    els.previewBox.value = JSON.stringify(objs, null, 2);
  }

  function setValidation(msg) {
    els.validationLine.textContent = msg;
  }

  // ---------- TXT filename inference (tolerant) ----------
  function inferFromTxtName(fileName) {
    const base = fileName.replace(/\.[^.]+$/, '');

    // year
    const yearMatch = base.match(/\[(\d{4})\]/);
    const year = yearMatch ? +yearMatch[1] : '';

    // citation tolerant: “[YYYY]JRC158” or “[YYYY] JRC 158” etc.
    let citation = '';
    const cit = base.match(/\[\d{4}\]\s*[A-Za-z]+[A-Za-z0-9-]*\s*\d+[A-Za-z0-9-]*/);
    if (cit) {
      citation = cit[0].replace(/\s+/g, ' ').trim();
    } else {
      const idx = base.indexOf('[');
      if (idx >= 0) citation = base.slice(idx).trim();
    }

    // name before year
    let case_name = base.replace(/\s*\[\d{4}\].*$/, '').trim();
    case_name = case_name.replace(/[_\-]+/g, ' ').replace(/\s{2,}/g, ' ');

    // tiny summary from file contents (first 250 chars)
    let summary = '';
    if (rawFileText) {
      const t = rawFileText.replace(/\s+/g, ' ').trim();
      summary = t.slice(0, 250);
      if (t.length > 250) summary += '…';
    }

    return {
      id: slug(case_name + (year ? '-' + year : '')),
      case_name,
      citation,
      year,
      court: '',
      jurisdiction: '',
      summary,
      holding: '',
      source: '',
      compliance_flags: '',
      tags: '',
      observed_conduct: '',
      anomaly_detected: '',
      breached_law_or_rule: '',
      authority_basis: '',
      canonical_breach_tag: '',
      case_link: '',
      full_text: '' // keep empty as requested
    };
  }

  // ---------- Validation ----------
  function validateEntry(e) {
    const errors = [];
    if (!e.id || !/^[a-z0-9-]+$/.test(e.id)) errors.push('id must be lowercase letters, numbers, hyphens');
    if (!e.case_name) errors.push('case_name required');
    if (!e.citation || !/\[\d{4}\]/.test(e.citation)) errors.push('citation must contain [YYYY]');
    if (String(e.year || '').length && !/^\d{4}$/.test(String(e.year))) errors.push('year must be 4-digit');
    return errors;
  }

  function normalise(obj) {
    // normalise/trim fields and ensure all keys exist
    const allKeys = [
      'id','case_name','citation','year','court','jurisdiction','summary','holding','source',
      'compliance_flags','tags','observed_conduct','anomaly_detected','breached_law_or_rule',
      'authority_basis','canonical_breach_tag','case_link','full_text'
    ];
    const out = {};
    allKeys.forEach(k => out[k] = (obj[k] ?? '').toString().trim());
    // keep year as number if valid
    if (/^\d{4}$/.test(String(obj.year))) out.year = +obj.year;
    // keep full_text exactly as requested (we already set to '')
    return out;
  }

  // ---------- Parsing pipeline ----------
  async function readSelectedFile() {
    const f = els.fileInput.files && els.fileInput.files[0];
    if (!f) return '';
    els.fileName.textContent = f.name;
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onerror = () => rej(reader.error);
      reader.onload = () => res(String(reader.result || ''));
      reader.readAsText(f);
    });
  }

  function parseContent() {
    let items = [];

    const pasted = els.pasteBox.value.trim();
    if (pasted) {
      // Try JSON first
      try {
        const arr = JSON.parse(pasted);
        if (Array.isArray(arr)) items = arr;
      } catch {
        // Try CSV as fallback
        items = toCSVrows(pasted);
      }
    } else if (rawFileText) {
      const name = els.fileInput.files && els.fileInput.files[0] ? els.fileInput.files[0].name : '';
      const ext = name.split('.').pop().toLowerCase();

      if (ext === 'json') {
        try {
          const arr = JSON.parse(rawFileText);
          if (Array.isArray(arr)) items = arr;
        } catch {/* noop */}
      } else if (ext === 'csv') {
        items = toCSVrows(rawFileText);
      } else if (ext === 'txt') {
        // TXT → either plain JSON array inside, or infer from filename
        try {
          const maybe = JSON.parse(rawFileText);
          if (Array.isArray(maybe)) items = maybe;
        } catch {
          if (els.autoFromTxt.checked && name) {
            items = [inferFromTxtName(name)];
          }
        }
      }
    }

    // Normalise + validate
    const ok = [], bad = [];
    items.forEach(it => {
      const n = normalise(it);
      const errs = validateEntry(n);
      if (errs.length === 0) ok.push(n);
      else bad.push({ id: n.id || '(no id)', errors: errs });
    });

    setAccepted(ok);
    showPreview(ok);

    if (ok.length && !bad.length) setValidation(`All ${ok.length} entries are valid.`);
    else if (!ok.length && !bad.length) setValidation('No entries detected. Provide JSON/CSV or a TXT filename I can infer.');
    else setValidation(`Accepted ${ok.length}. Rejected ${bad.length}. Check IDs/years/citations.`);

    return { ok, bad };
  }

  function generateMergedJson() {
    const list = [...accepted];
    // optional sort
    const key = els.sortBy.value;
    list.sort((a,b) => {
      const va = (a[key] ?? '').toString().toLowerCase();
      const vb = (b[key] ?? '').toString().toLowerCase();
      if (va < vb) return -1; if (va > vb) return 1; return 0;
    });
    showPreview(list);
  }

  function copyPreview() {
    navigator.clipboard.writeText(els.previewBox.value || '[]');
  }

  function downloadPreview() {
    const blob = new Blob([els.previewBox.value || '[]'], {type:'application/json;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'citations-merged.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---------- Events ----------
  els.fileInput.addEventListener('change', async () => {
    rawFileText = await readSelectedFile();
    // do not auto-parse; wait for user to press Parse
  });

  els.parseBtn.addEventListener('click', () => {
    try { parseContent(); } catch (e) { setValidation('Error parsing input.'); }
  });

  els.clearBtn.addEventListener('click', () => {
    els.fileInput.value = '';
    els.fileName.textContent = 'No file selected';
    els.pasteBox.value = '';
    rawFileText = '';
    setAccepted([]);
    showPreview([]);
    setValidation('Validation: cleared.');
  });

  els.genBtn.addEventListener('click', generateMergedJson);
  els.copyBtn.addEventListener('click', copyPreview);
  els.dlBtn.addEventListener('click', downloadPreview);

  // restore a tiny bit of state
  try {
    const saved = localStorage.getItem('bulk:autoFromTxt');
    if (saved !== null) els.autoFromTxt.checked = saved === '1';
    els.autoFromTxt.addEventListener('change', () => {
      localStorage.setItem('bulk:autoFromTxt', els.autoFromTxt.checked ? '1' : '0');
    });
  } catch {}
})();
