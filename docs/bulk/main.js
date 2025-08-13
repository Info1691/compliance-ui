/* Bulk Uploader – JSON/CSV/TXT
 * - Accepts .json, .csv, .txt
 * - .txt is wrapped into the citation schema using filename heuristics
 * - Validates & merges with existing registry (no file writes)
 */

(function () {
  // ---------- CONFIG ----------
  const EXISTING_JSON_URL = 'data/citations.json'; // change if your path differs

  // ---------- DOM ----------
  const els = {
    file: document.getElementById('file'),
    paste: document.getElementById('paste'),
    parseBtn: document.getElementById('parseBtn'),
    clearBtn: document.getElementById('clearBtn'),
    validation: document.getElementById('validation'),
    overwrite: document.getElementById('overwrite'),
    sortBy: document.getElementById('sortBy'),
    mergeBtn: document.getElementById('mergeBtn'),
    merged: document.getElementById('merged'),
    registryPath: document.getElementById('registryPath'),
  };
  els.registryPath.textContent = EXISTING_JSON_URL;

  // ---------- helpers ----------
  const text = (v) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2));

  const slugify = (s) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

  const detectFromFilename = (filename) => {
    // Example: "State House Trust v Friend [2025] JRC 158.txt"
    const base = filename.replace(/\.[^.]+$/, '');
    const m = base.match(/\[(\d{4})\]\s*(JRC|JCA)\s*([A-Za-z]*\s*\d+)?/i);

    let year = null,
      courtCode = null,
      citation = null;
    if (m) {
      year = parseInt(m[1], 10);
      courtCode = m[2].toUpperCase();
      // Normalize citation to "[YYYY] JRC 158" or "[YYYY] JCA 012"
      const tail = base.slice(m.index).match(/\[(\d{4})\]\s*[A-Za-z]+\s*.*$/);
      citation = tail ? tail[0].trim() : `[${year}] ${courtCode}`;
    }

    // Case name = everything before the first ' ['
    const caseName = base.split(' [')[0].replace(/[_-]+/g, ' ').trim();

    const id = slugify(caseName + (year ? ` ${year}` : ''));

    let court = null;
    if (courtCode === 'JRC') court = 'Royal Court';
    if (courtCode === 'JCA') court = 'Court of Appeal';

    return {
      id,
      case_name: caseName || base,
      citation: citation || '',
      year: year || '',
      court: court || '',
      jurisdiction: 'Jersey',
    };
  };

  const validateEntry = (e) => {
    const errs = [];
    if (!e.id) errs.push('id required');
    if (e.id && !/^[a-z0-9-]+$/.test(e.id))
      errs.push('id must be lowercase letters, numbers, hyphens');
    if (!e.case_name) errs.push('case_name required');
    if (!e.citation) errs.push('citation required');
    if (!String(e.year).match(/^\d{4}$/)) errs.push('year must be a 4-digit integer');
    return errs;
  };

  const csvToObjects = (csvText) => {
    // light CSV parser (supports quotes and commas inside quotes)
    const rows = [];
    let row = [];
    let cur = '';
    let inQuotes = false;

    const pushCell = () => {
      row.push(cur);
      cur = '';
    };
    const pushRow = () => {
      rows.push(row);
      row = [];
    };

    for (let i = 0; i < csvText.length; i++) {
      const c = csvText[i];
      const next = csvText[i + 1];
      if (inQuotes) {
        if (c === '"' && next === '"') {
          cur += '"';
          i++; // skip escaped quote
        } else if (c === '"') {
          inQuotes = false;
        } else {
          cur += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ',') {
          pushCell();
        } else if (c === '\n') {
          pushCell();
          pushRow();
        } else if (c === '\r') {
          // ignore CR
        } else {
          cur += c;
        }
      }
    }
    // last cell/row
    if (cur.length > 0 || row.length > 0) {
      pushCell();
      pushRow();
    }
    const headers = rows.shift().map((h) => h.trim());
    return rows
      .filter((r) => r.length && r.some((c) => c.trim().length))
      .map((r) => {
        const obj = {};
        headers.forEach((h, i) => (obj[h] = (r[i] ?? '').trim()));
        return obj;
      });
  };

  const parseJSONMaybe = (txt) => {
    try {
      const data = JSON.parse(txt);
      return Array.isArray(data) ? data : [data];
    } catch {
      return null;
    }
  };

  // ---------- core parsers ----------
  const parseFiles = async (files) => {
    const out = [];
    for (const f of files) {
      const content = await f.text();
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      if (ext === 'json') {
        const arr = parseJSONMaybe(content);
        if (!arr) throw new Error(`${f.name}: invalid JSON`);
        out.push(...arr);
      } else if (ext === 'csv') {
        const arr = csvToObjects(content);
        out.push(...arr);
      } else if (ext === 'txt') {
        // wrap TXT as single citation entry using filename heuristics
        const meta = detectFromFilename(f.name);
        out.push({
          ...meta,
          summary: '',
          full_case_text: content,
          source: '',
          compliance_flags: '',
          key_points: '',
          tags: '',
        });
      } else {
        throw new Error(`${f.name}: unsupported file type`);
      }
    }
    return out;
  };

  const parsePasted = (txt) => {
    const trimmed = txt.trim();
    if (!trimmed) return [];
    // try JSON
    const j = parseJSONMaybe(trimmed);
    if (j) return j;
    // else treat as CSV
    return csvToObjects(trimmed);
  };

  // ---------- merging/sorting ----------
  const sorters = {
    id: (a, b) => a.id.localeCompare(b.id),
    case_name: (a, b) => a.case_name.localeCompare(b.case_name),
    year: (a, b) => (Number(a.year) || 0) - (Number(b.year) || 0),
  };

  const mergeById = (base, incoming, overwrite = false) => {
    const byId = new Map(base.map((x) => [x.id, x]));
    const conflicts = [];
    for (const it of incoming) {
      if (byId.has(it.id)) {
        conflicts.push(it.id);
        if (overwrite) byId.set(it.id, it);
      } else {
        byId.set(it.id, it);
      }
    }
    return { merged: [...byId.values()], conflicts };
  };

  // ---------- state ----------
  let loadedRegistry = [];
  let staged = [];

  const loadExisting = async () => {
    els.validation.textContent = 'Loading existing registry…';
    try {
      const r = await fetch(EXISTING_JSON_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error(`${EXISTING_JSON_URL} → ${r.status}`);
      const data = await r.json();
      loadedRegistry = Array.isArray(data) ? data : [];
      els.validation.textContent = `Loaded ${loadedRegistry.length} existing entries.`;
    } catch (e) {
      loadedRegistry = [];
      els.validation.textContent = `Could not load existing registry (${EXISTING_JSON_URL}). Starting with empty base.\n${e}`;
    }
  };

  // ---------- actions ----------
  const runParse = async () => {
    els.validation.textContent = 'Parsing input…';
    staged = [];

    try {
      const fileList = Array.from(els.file.files || []);
      if (fileList.length) {
        const parsed = await parseFiles(fileList);
        staged.push(...parsed);
      }
      // pasted
      const pasted = parsePasted(els.paste.value);
      if (pasted.length) staged.push(...pasted);

      if (!staged.length) {
        els.validation.innerHTML = 'No input provided.';
        return;
      }

      // normalize keys and types
      staged = staged.map((e) => ({
        id: e.id ? String(e.id).trim() : '',
        case_name: e.case_name ? String(e.case_name).trim() : '',
        citation: e.citation ? String(e.citation).trim() : '',
        year: e.year ? parseInt(e.year, 10) : '',
        court: e.court ? String(e.court).trim() : '',
        jurisdiction: e.jurisdiction ? String(e.jurisdiction).trim() : '',
        summary: e.summary ? String(e.summary) : '',
        holding: e.holding ? String(e.holding) : '',
        source: e.source ? String(e.source).trim() : '',
        compliance_flags: e.compliance_flags ?? '',
        key_points: e.key_points ?? '',
        tags: e.tags ?? '',
        observed_conduct: e.observed_conduct ?? '',
        anomaly_detected: e.anomaly_detected ?? '',
        breached_law_or_rule: e.breached_law_or_rule ?? '',
        authority_basis: e.authority_basis ?? '',
        canonical_breach_tag: e.canonical_breach_tag ?? '',
        case_link: e.case_link ?? '',
        full_case_text: e.full_case_text ?? '',
      }));

      // validate
      const errors = [];
      staged.forEach((e, i) => {
        const errs = validateEntry(e);
        if (errs.length) errors.push(`#${i + 1}: ${errs.join('; ')}`);
      });

      if (errors.length) {
        els.validation.innerHTML =
          `<div class="err"><strong>Validation errors (${errors.length}):</strong></div>\n- ` +
          errors.join('\n- ');
      } else {
        els.validation.innerHTML =
          `<div class="ok"><strong>All ${staged.length} entries are valid.</strong></div>`;
      }
    } catch (e) {
      els.validation.textContent = `Parse error: ${e.message || e}`;
      staged = [];
    }
  };

  const runMerge = () => {
    if (!staged.length) {
      els.merged.textContent = 'Nothing to merge. Parse something first.';
      return;
    }
    const { merged, conflicts } = mergeById(loadedRegistry, staged, els.overwrite.checked);
    const sorter = sorters[els.sortBy.value] || sorters.case_name;
    merged.sort(sorter);
    els.merged.textContent = JSON.stringify(merged, null, 2);

    const note =
      conflicts.length && !els.overwrite.checked
        ? `\n\nNote: ${conflicts.length} ID conflict(s) kept existing. Tick “Overwrite” to replace.`
        : conflicts.length && els.overwrite.checked
        ? `\n\nNote: ${conflicts.length} ID conflict(s) overwritten.`
        : '';
    els.validation.textContent += note;
  };

  const runClear = () => {
    els.file.value = '';
    els.paste.value = '';
    els.validation.textContent = 'Cleared.';
    els.merged.textContent = 'Merged JSON will appear here…';
    staged = [];
  };

  // ---------- wire ----------
  els.parseBtn.addEventListener('click', runParse);
  els.mergeBtn.addEventListener('click', runMerge);
  els.clearBtn.addEventListener('click', runClear);
  window.addEventListener('load', loadExisting);
})();
