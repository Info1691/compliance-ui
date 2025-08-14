/* eslint-disable no-useless-escape */
(function () {
  // ---------- DOM ----------
  const els = {
    file:        $('#file'),
    autoFill:    $('#autofill'),
    parseBtn:    $('#parseBtn'),
    clearBtn:    $('#clearBtn'),
    paste:       $('#paste'),
    acceptedBox: $('#acceptedList'),
    acceptedCount: $('#acceptedCount'),
    mergedOut:   $('#mergedJson'),
    overwrite:   $('#overwrite'),
    sortBy:      $('#sortBy'),
    generateBtn: $('#genBtn'),
    copyBtn:     $('#copyBtn'),
    downloadBtn: $('#downloadBtn'),
    targetHint:  $('#targetHint'),
    noBreachChk: $('#noBreach'),
  };

  // ---------- Helpers ----------
  const text = (el, v) => el.textContent = v;
  const html = (el, v) => el.innerHTML = v;
  const val  = (el) => el.value || '';
  const lines = (s) => s.split(/\r?\n/);

  function normalise(str) {
    return (str || '')
      .replace(/\u00A0/g, ' ')       // NBSP → space
      .replace(/[ \t]+/g, ' ')       // collapse whitespace
      .replace(/ *\n */g, '\n')      // trim line ends
      .trim();
  }

  function yearFrom(str) {
    const m = str.match(/\[(\d{4})\]/);
    return m ? parseInt(m[1], 10) : null;
  }

  function seriesFrom(str) {
    // Known Jersey series
    if (/\bJRC\b/i.test(str)) return 'JRC';
    if (/\bJCA\b/i.test(str)) return 'JCA';
    return null;
  }

  function numberFrom(str) {
    // e.g. [2025] JRC 158 => 158
    const m = str.match(/\[\d{4}\]\s+[A-Z]{3}\s+(\d+)\b/);
    return m ? m[1] : null;
  }

  function firstCitationIn(text, fallbackFilename) {
    const m = text.match(/\[\d{4}\]\s+[A-Z]{3}\s+\d+\b/);
    if (m) return m[0];
    // Try from filename if it contains the pattern
    const n = (fallbackFilename || '').match(/\[\d{4}\]\s+[A-Z]{3}\s+\d+\b/);
    return n ? n[0] : '';
  }

  function inferJurisdiction(src) {
    // Very conservative: only fill when certain
    if (/\bJRC\b/i.test(src) || /\bJCA\b/i.test(src)) return 'Jersey';
    return '';
  }

  function inferCourt(src) {
    const series = seriesFrom(src);
    if (series === 'JRC') return 'Royal Court';
    if (series === 'JCA') return 'Court of Appeal';
    return '';
  }

  function caseNameFrom(text, filename) {
    // try title line: e.g. "State House Trust v Friend"
    const m = text.match(/^\s*([A-Z0-9].+? v .+?)\s*$/im);
    if (m) return m[1].trim();
    // fallback: filename minus bracketed bits and extension
    return (filename || '')
      .replace(/\.[^.]+$/, '')
      .replace(/\[[^\]]+\]/g, '')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function summaryFrom(text) {
    // only take explicit outcome phrases
    const candidates = [
      /(?:^|\n)\s*Held:\s*(.+?)(?:\n|$)/i,
      /(?:^|\n)\s*Order:\s*(.+?)(?:\n|$)/i,
      /(?:^|\n)\s*Result:\s*(.+?)(?:\n|$)/i,
      /(?:^|\n).{0,40}\b(application|appeal)\b.*?\b(dismissed|allowed|granted|refused)\b.*?(?:\n|$)/i,
      /(?:^|\n).{0,40}\bclaim\b.*?\b(dismissed|allowed)\b.*?(?:\n|$)/i
    ];
    for (const rx of candidates) {
      const m = text.match(rx);
      if (m) return m[1] ? m[1].trim() : m[0].trim();
    }
    return ''; // do not guess
  }

  function buildId(caseName, citation, year) {
    // id must be lowercase letters, numbers, hyphens
    const base = `${caseName || 'case'}-${citation || ''}-${year || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base || `entry-${Date.now()}`;
  }

  // ---------- Core: Parse TXT into one JSON entry ----------
  function parseTxtToEntry(txt, filename, opts) {
    const raw = normalise(txt || '');
    const citation = firstCitationIn(raw, filename);
    const year = yearFrom(citation) || null;

    const entry = {
      id:               '',               // filled after case_name/citation/year
      case_name:        caseNameFrom(raw, filename),
      citation:         citation,
      year:             year || '',
      court:            inferCourt(citation),
      jurisdiction:     inferJurisdiction(citation),
      summary:          summaryFrom(raw),
      source:           '',               // user to fill (e.g. "JRC / Judgments")
      holding:          '',               // explicit holding, if later curated
      compliance_flags: [],               // array of short flags
      tags:             [],               // array of keywords
      observed_conduct: '',
      anomaly_detected: '',               // 'Yes'/'No' or ''
      breached_law_or_rule: '',
      authority_basis:  '',
      canonical_breach_tag: '',
      case_link:        '',
      full_text:        ''                // leave blank to avoid dumping whole file
    };

    // Optional explicit no-breach toggle (only if you check it)
    if (opts && opts.markNoBreach) {
      entry.anomaly_detected   = 'No';
      entry.canonical_breach_tag = '';
      entry.breached_law_or_rule = '';
      entry.compliance_flags   = [];
      entry.tags               = [];
    }

    entry.id = buildId(entry.case_name, entry.citation, entry.year);
    return entry;
  }

  // ---------- UI wiring ----------
  function clearAll() {
    els.paste.value = '';
    html(els.acceptedBox, '');
    text(els.acceptedCount, '0');
    els.mergedOut.value = '[]';
  }

  els.clearBtn.addEventListener('click', clearAll);

  // Parse & Validate
  els.parseBtn.addEventListener('click', async () => {
    // assemble candidate inputs: file (txt), pasted JSON/CSV
    const file = els.file.files && els.file.files[0];
    const pasted = val(els.paste).trim();

    const accepted = [];
    // 1) TXT path (preferred if provided)
    if (file && /(?:\.txt)$/i.test(file.name)) {
      const contents = await file.text();
      const entry = parseTxtToEntry(contents, file.name, {
        markNoBreach: els.noBreachChk?.checked
      });
      accepted.push(entry);
    }

    // 2) JSON array / CSV (optional)
    if (pasted) {
      try {
        let rows = [];
        if (pasted.trim().startsWith('[')) {
          rows = JSON.parse(pasted);
        } else {
          // minimal CSV support; expect headers matching keys
          const [hdr, ...data] = lines(pasted);
          const headers = hdr.split(',').map(h => h.trim());
          for (const row of data) {
            if (!row.trim()) continue;
            const cells = row.split(',').map(c => c.trim());
            const obj = {};
            headers.forEach((h, i) => obj[h] = cells[i] || '');
            rows.push(obj);
          }
        }
        for (const r of rows) {
          // trust provided JSON/CSV values; just ensure required keys
          if (!r.id || !r.case_name || !r.citation || !r.year) continue;
          accepted.push(r);
        }
      } catch (e) {
        alert('Paste parse error: ' + e.message);
      }
    }

    // update Accepted panel and build merged preview
    html(els.acceptedBox, accepted.map(a => `<li>${a.case_name} — ${a.citation}</li>`).join(''));
    text(els.acceptedCount, String(accepted.length));
    els.mergedOut.value = JSON.stringify(accepted, null, 2);
  });

  // Generate (copy stays as current preview)
  els.generateBtn.addEventListener('click', () => {
    // nothing extra—preview already is the merged JSON
    if (!els.mergedOut.value.trim()) els.mergedOut.value = '[]';
  });

  els.copyBtn?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(els.mergedOut.value || '[]');
  });

  els.downloadBtn?.addEventListener('click', () => {
    const blob = new Blob([els.mergedOut.value || '[]'], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'merged-citations.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // small convenience: show target file path (manual commit)
  els.targetHint.textContent = 'Target file: data/citations.json (manual commit)';
})();
