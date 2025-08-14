/* Citations – Bulk Uploader (docs/bulk/main.js)
   - Robust registry loader (multiple fallback paths)
   - Accepts .json / .csv / .txt uploads or pasted JSON/CSV
   - Auto-fill from TXT filename (case name + citation + year)
   - Optional "No breach detected" marker
   - Merges with existing registry (no writes; user copies/downloads)
   - Sorted output + copy/download helpers
*/

/* ===== DOM ===== */
const $ = (s) => document.querySelector(s);
const els = {
  file:        $('#fileInput'),
  fileName:    $('#fileName'),
  parseBtn:    $('#parseBtn'),
  clearBtn:    $('#clearBtn'),
  pasteArea:   $('#pasteArea'),
  mergedOut:   $('#mergedOut'),
  autoFromTxt: $('#autoFromTxt'),
  markNoBreach:$('#markNoBreach'),
  acceptedCount: $('#acceptedCount'),
  acceptedList:  $('#acceptedList'),
  overwrite:     $('#overwrite'),
  sortBy:        $('#sortBy'),
  genBtn:        $('#genBtn'),
  copyBtn:       $('#copyBtn'),
  dlBtn:         $('#dlBtn'),
};

let registry = [];        // existing citations.json
let parsedEntries = [];   // newly parsed/validated entries
let merged = [];          // merged preview

/* ===== Utilities ===== */
const setAccepted = (list) => {
  els.acceptedCount.textContent = String(list.length);
  const ul = document.createElement('ul');
  ul.className = 'bullets';
  list.forEach(e => {
    const li = document.createElement('li');
    li.textContent = `${e.case_name} — ${e.citation}`;
    ul.appendChild(li);
  });
  els.acceptedList.innerHTML = '';
  els.acceptedList.appendChild(ul);
};

const toJSON = (o) => JSON.stringify(o, null, 2);
const norm = (s) => String(s || '').trim();
const isYear = (x) => /^\d{4}$/.test(String(x));
const slug = (s) =>
  norm(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const inferFromFilename = (name) => {
  // e.g. "State House Trust v Friend [2025]JRC158.txt"
  const base = name.replace(/\.[^.]+$/, '');
  const m = base.match(/(.+?)\s+\[?(\d{4})\]?\s*JRC\s*([0-9]+)$/i);
  if (m) {
    const case_name = norm(m[1]);
    const year = m[2];
    const jrcNum = m[3];
    const citation = `[${year}] JRC ${jrcNum}`;
    const id = `${slug(case_name)}-${year}`;
    return { case_name, year, citation, id };
  }
  // fallback: try case name only
  return {
    case_name: base.replace(/[_-]+/g, ' ').trim(),
    citation: '',
    year: '',
    id: slug(base)
  };
};

const parseCSV = (text) => {
  // very small CSV helper (expects headers)
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(row => {
    const cells = row.split(',').map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = cells[i] || '');
    return obj;
  });
};

const ensureShape = (r, sourceName, noBreachFlag) => {
  // Base template — preserve keys consistently (downstream tools expect these)
  const base = {
    id: "",
    case_name: "",
    citation: "",
    year: "",
    court: "",
    jurisdiction: "",
    summary: "",
    holding: "",
    source: "",
    compliance_flags: "",
    tags: "",
    observed_conduct: "",
    anomaly_detected: "",
    breached_law_or_rule: "",
    authority_basis: "",
    canonical_breach_tag: "",
    case_link: "",
    full_text: ""
  };

  // Shallow-copy known keys
  const out = { ...base, ...r };

  // Inference helpers (Jersey Royal Court)
  if (/JRC/i.test(out.citation)) {
    out.court = out.court || "Royal Court";
    out.jurisdiction = out.jurisdiction || "Jersey";
  }
  if (isYear(out.year) === false) {
    // try to lift a year out of the citation (e.g., [2025] JRC 158)
    const y = (out.citation || '').match(/\[(\d{4})]/);
    if (y) out.year = y[1];
  }

  // ID fallback
  if (!out.id) {
    const safeCase = out.case_name ? slug(out.case_name) : slug(sourceName || 'case');
    const safeYear = isYear(out.year) ? out.year : '';
    out.id = safeYear ? `${safeCase}-${safeYear}` : `${safeCase}`;
  }

  // Source (filename) fallback
  if (!norm(out.source) && sourceName) {
    out.source = sourceName;
  }

  // Optional “No breach detected”
  if (noBreachFlag) {
    out.compliance_flags = out.compliance_flags || "no-breach";
    if (!norm(out.summary)) out.summary = "No breach detected.";
  }

  return out;
};

const loadRegistry = async () => {
  const paths = [
    '/data/citations.json',            // published root
    '../data/citations.json',          // when browsed from /docs/bulk/
    '../../data/citations.json',       // deep fallback
    'citations.json',                  // local dev preview
  ];

  for (const p of paths) {
    try {
      const res = await fetch(p, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          registry = json;
          return;
        }
      }
    } catch (_) { /* try next */ }
  }
  registry = []; // not fatal — user can still create merged preview
};

const mergeEntries = (existing, incoming, overwrite) => {
  const map = new Map();
  existing.forEach(e => map.set(e.id, e));
  incoming.forEach(e => {
    if (map.has(e.id) && !overwrite) return; // keep existing
    map.set(e.id, e);
  });
  return Array.from(map.values());
};

/* ===== Event handlers ===== */

els.file.addEventListener('change', () => {
  const f = els.file.files && els.file.files[0];
  els.fileName.textContent = f ? f.name : '';
});

els.clearBtn.addEventListener('click', () => {
  els.file.value = '';
  els.fileName.textContent = '';
  els.pasteArea.value = '';
  els.mergedOut.value = '[ ]';
  parsedEntries = [];
  setAccepted([]);
});

els.parseBtn.addEventListener('click', async () => {
  const noBreach = !!els.markNoBreach.checked;
  parsedEntries = [];
  setAccepted([]);

  // 1) parse from upload (preferred)
  const f = els.file.files && els.file.files[0];
  if (f) {
    const text = await f.text();

    // TXT: try to infer from filename if requested
    if (/\.txt$/i.test(f.name) && els.autoFromTxt.checked) {
      const seed = inferFromFilename(f.name);
      const entry = ensureShape(seed, f.name, noBreach);
      parsedEntries.push(entry);
    } else if (/\.csv$/i.test(f.name)) {
      const rows = parseCSV(text);
      rows.forEach(r => parsedEntries.push(ensureShape(r, f.name, noBreach)));
    } else {
      // assume JSON (array OR single object)
      try {
        const obj = JSON.parse(text);
        const arr = Array.isArray(obj) ? obj : [obj];
        arr.forEach(r => parsedEntries.push(ensureShape(r, f.name, noBreach)));
      } catch (err) {
        alert('Upload looks like JSON but could not be parsed.');
        return;
      }
    }
  }

  // 2) parse from paste area (optional)
  const paste = norm(els.pasteArea.value);
  if (paste) {
    // try JSON first
    let added = false;
    try {
      const obj = JSON.parse(paste);
      const arr = Array.isArray(obj) ? obj : [obj];
      arr.forEach(r => parsedEntries.push(ensureShape(r, 'pasted', noBreach)));
      added = true;
    } catch (_) { /* fall through */ }

    if (!added) {
      // try CSV
      const rows = parseCSV(paste);
      if (rows.length) {
        rows.forEach(r => parsedEntries.push(ensureShape(r, 'pasted.csv', noBreach)));
      }
    }
  }

  if (!parsedEntries.length) {
    alert('Nothing to parse. Upload a file or paste JSON/CSV.');
    return;
  }

  // Normalize + simple validations
  const clean = parsedEntries.map(e => {
    e.id = slug(e.id);
    e.case_name = norm(e.case_name);
    e.citation = norm(e.citation);
    if (e.year && !isYear(e.year)) e.year = '';
    return e;
  });

  parsedEntries = clean;

  // Show accepted list now (merge preview is done via button)
  setAccepted(parsedEntries);
  els.mergedOut.value = '[ ]';
});

els.genBtn.addEventListener('click', () => {
  if (!parsedEntries.length) {
    alert('No accepted entries. Parse & Validate first.');
    return;
  }
  const overwrite = !!els.overwrite.checked;
  merged = mergeEntries(registry, parsedEntries, overwrite);

  // Sorting
  const key = els.sortBy.value;
  merged.sort((a,b) => {
    const va = norm(a[key]).toLowerCase();
    const vb = norm(b[key]).toLowerCase();
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  });

  els.mergedOut.value = toJSON(merged);
});

els.copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(els.mergedOut.value);
  } catch (_) {
    // fallback
    els.mergedOut.select();
    document.execCommand('copy');
  }
});

els.dlBtn.addEventListener('click', () => {
  const blob = new Blob([els.mergedOut.value], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = 'citations.json';
  a.href = url;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

/* ===== Init ===== */
(async function init(){
  await loadRegistry();
  setAccepted([]);
  els.mergedOut.value = '[ ]';
})();
