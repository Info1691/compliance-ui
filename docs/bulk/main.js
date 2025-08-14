/* Citations – Bulk Uploader (Option A: conservative, filename-only)
   8 rules of integrity:
   1) No guesses: never parse TXT content; only filename facts.
   2) Deterministic: same input => same output.
   3) Minimal surface area: UI IDs unchanged.
   4) Single source: filename is the only inference source for TXT.
   5) Reversible: confined to this file; no writes to disk.
   6) Defensive: schema normalized; safe fallbacks.
   7) Accessibility preserved: no DOM/id churn.
   8) Transparency: fields left blank when unknown.
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

/* ===== State ===== */
let registry = [];        // existing citations.json (read-only)
let parsedEntries = [];   // newly accepted rows
let merged = [];          // merged preview

/* ===== Utils ===== */
const norm = (s) => String(s || '').trim();
const isYear = (x) => /^\d{4}$/.test(String(x));
const slug = (s) =>
  norm(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const toJSON = (o) => JSON.stringify(o, null, 2);

function setAccepted(list) {
  els.acceptedCount.textContent = String(list.length);
  const ul = document.createElement('ul');
  ul.className = 'bullets';
  list.forEach(e => {
    const li = document.createElement('li');
    li.textContent = `${e.case_name || e.id} — ${e.citation || ''}`;
    ul.appendChild(li);
  });
  els.acceptedList.innerHTML = '';
  els.acceptedList.appendChild(ul);
}

/* ===== Filename inference (Jersey reports only) =====
   Accepts: "Case v Other [2025] JRC 158.txt" or "[2025]JRC158"
*/
function inferFromFilename(name) {
  const base = name.replace(/\.[^.]+$/, '');
  const case_name = norm(base.replace(/\s*\[[^\]]+].*$/, '').replace(/[_-]+/g, ' '));

  let citation = '';
  let year = '';
  let court = '';
  let jurisdiction = '';

  // [YYYY] <series> <num>  or  [YYYY]<series><num>
  const m = base.match(/\[(\d{4})]\s*([A-Za-z]{2,3})\s*([0-9A-Za-z\-\/]+)?/i);
  if (m) {
    year = m[1];
    const series = (m[2] || '').toUpperCase();
    const num = m[3] ? ` ${m[3].trim()}` : '';
    citation = `[${year}] ${series}${num}`;
    if (series === 'JRC') { court = 'Royal Court'; jurisdiction = 'Jersey'; }
    if (series === 'JCA') { court = 'Court of Appeal'; jurisdiction = 'Jersey'; }
  }

  return {
    id: slug(case_name + (year ? `-${year}` : '')),
    case_name,
    citation,
    year: isYear(year) ? parseInt(year, 10) : '',
    court,
    jurisdiction
  };
}

/* ===== CSV / JSON parsing ===== */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(row => {
    const cells = []; let cur = '', q = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"' && row[i+1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { q = !q; continue; }
      if (ch === ',' && !q) { cells.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur);
    const obj = {};
    headers.forEach((h, i) => obj[h] = norm(cells[i]));
    return obj;
  });
}

function parseJSONorCSV(text) {
  if (!text || !text.trim()) return [];
  try { const j = JSON.parse(text); return Array.isArray(j) ? j : [j]; } catch (_) {}
  try { return parseCSV(text); } catch (_) { return []; }
}

/* ===== Schema normalizer (no guessing) ===== */
function ensureShape(r, sourceName, noBreachFlag) {
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

  const out = { ...base, ...r };

  // Jersey hints from citation only (JRC/JCA)
  if (!out.court && /\bJRC\b/i.test(out.citation || '')) out.court = 'Royal Court';
  if (!out.court && /\bJCA\b/i.test(out.citation || '')) out.court = 'Court of Appeal';
  if (!out.jurisdiction && /\bJ(RC|CA)\b/i.test(out.citation || '')) out.jurisdiction = 'Jersey';

  // Year normalization
  if (isYear(out.year)) out.year = parseInt(out.year, 10);
  else {
    const y = (out.citation || '').match(/\[(\d{4})]/);
    if (y) out.year = parseInt(y[1], 10);
  }

  // ID fallback
  if (!norm(out.id)) {
    const safeCase = out.case_name ? slug(out.case_name) : slug(sourceName || 'case');
    out.id = out.year ? `${safeCase}-${out.year}` : safeCase;
  } else {
    out.id = slug(out.id);
  }

  // Source = filename if available
  if (!norm(out.source) && sourceName) out.source = sourceName;

  // Optional “No breach detected”
  if (noBreachFlag) {
    out.anomaly_detected = 'no';
    out.compliance_flags = out.compliance_flags || 'no-breach';
    if (!norm(out.summary)) out.summary = 'No breach detected.';
  }

  return out;
}

/* ===== Registry loader (read-only) ===== */
async function loadRegistry() {
  const paths = [
    '/data/citations.json',     // root on GitHub Pages
    '../data/citations.json',   // from /bulk/
    '../../data/citations.json',
    'citations.json'            // local preview
  ];
  for (const p of paths) {
    try {
      const r = await fetch(p, { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j)) return j;
      }
    } catch (_) {}
  }
  return [];
}

/* ===== Merge ===== */
function mergeEntries(existing, incoming, overwrite) {
  const map = new Map(existing.map(x => [x.id, x]));
  for (const e of incoming) {
    if (map.has(e.id) && !overwrite) continue;
    map.set(e.id, e);
  }
  return Array.from(map.values());
}

/* ===== Events ===== */
els.file.addEventListener('change', () => {
  els.fileName.textContent = els.file.files?.[0]?.name || '';
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
  // make sure registry is available (non-blocking for parse)
  if (!registry.length) registry = await loadRegistry();

  const noBreach = !!els.markNoBreach.checked;
  parsedEntries = [];
  setAccepted([]);

  // 1) File route
  const f = els.file.files?.[0];
  if (f) {
    const name = f.name || '';

    if (/\.txt$/i.test(name)) {
      // **Option A**: only use filename to seed fields. Do NOT read TXT content.
      const seed = els.autoFromTxt.checked ? inferFromFilename(name) : { case_name: name.replace(/\.[^.]+$/, '') };
      parsedEntries.push(ensureShape(seed, name, noBreach));

    } else if (/\.csv$/i.test(name)) {
      const text = await f.text();
      const rows = parseCSV(text);
      rows.forEach(r => parsedEntries.push(ensureShape(r, name, noBreach)));

    } else {
      // assume JSON
      const text = await f.text();
      try {
        const obj = JSON.parse(text);
        (Array.isArray(obj) ? obj : [obj]).forEach(r => parsedEntries.push(ensureShape(r, name, noBreach)));
      } catch {
        alert('Upload looks like JSON but could not be parsed.');
        return;
      }
    }
  }

  // 2) Paste route
  const pasted = norm(els.pasteArea.value);
  if (pasted) {
    parseJSONorCSV(pasted).forEach(r => parsedEntries.push(ensureShape(r, 'pasted', noBreach)));
  }

  if (!parsedEntries.length) {
    alert('Nothing to parse. Upload a TXT/CSV/JSON or paste JSON/CSV.');
    return;
  }

  // final normalization
  parsedEntries = parsedEntries.map(e => {
    e.id = slug(e.id);
    if (e.year && !isYear(e.year)) e.year = '';
    return e;
  });

  setAccepted(parsedEntries);
  els.mergedOut.value = '[ ]'; // user clicks Generate to build merged view
});

els.genBtn.addEventListener('click', () => {
  if (!parsedEntries.length) { alert('No accepted entries. Parse & Validate first.'); return; }
  const overwrite = !!els.overwrite.checked;
  merged = mergeEntries(registry, parsedEntries, overwrite);

  // sort
  const key = els.sortBy.value;
  merged.sort((a,b) => {
    const av = norm(a[key]).toLowerCase();
    const bv = norm(b[key]).toLowerCase();
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });

  els.mergedOut.value = toJSON(merged);
});

els.copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(els.mergedOut.value);
  } catch {
    // fallback for older Safari
    els.mergedOut.select();
    document.execCommand('copy');
  }
});

els.dlBtn.addEventListener('click', () => {
  const blob = new Blob([els.mergedOut.value || '[]'], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = 'citations.json';
  a.href = url;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
});

/* ===== Init ===== */
(async function init(){
  registry = await loadRegistry();
  setAccepted([]);
  els.mergedOut.value = '[ ]';
})();
