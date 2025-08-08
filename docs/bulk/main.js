<script>
/* Bulk Importer — robust, complete, null-safe */
document.addEventListener('DOMContentLoaded', () => {
  // Elements (may be absent in other pages; guard everything)
  const btnLoad     = document.getElementById('btnLoadCurrent');
  const btnPaste    = document.getElementById('btnPasteJSON');
  const fileCsv     = document.getElementById('fileCsv');
  const btnParseCsv = document.getElementById('btnParseCsv');
  const allowUpd    = document.getElementById('allowUpdates');
  const btnValidate = document.getElementById('btnValidate');
  const btnMerge    = document.getElementById('btnMerge');
  const btnDownload = document.getElementById('btnDownload');
  const pasteArea   = document.getElementById('pasteArea');
  const statusBar   = document.getElementById('statusBar');

  const bust = `?v=${Date.now()}`;
  const DATA_URL = `../data/citations/citations.json${bust}`;

  let currentData = [];
  let incomingData = [];
  let merged = null;

  function setStatus(msg) {
    if (!statusBar) return;
    statusBar.textContent = (typeof msg === 'string') ? msg : JSON.stringify(msg, null, 2);
  }

  // Load current dataset
  if (btnLoad) {
    btnLoad.addEventListener('click', async () => {
      try {
        setStatus('Loading current dataset…');
        const res = await fetch(DATA_URL, {cache: 'no-store'});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        currentData = await res.json();
        setStatus(`Loaded ${currentData.length} records from live citations.json`);
      } catch (e) {
        console.error(e);
        setStatus(`Failed to load: ${e.message}`);
      }
    });
  }

  // Paste JSON
  if (btnPaste && pasteArea) {
    btnPaste.addEventListener('click', () => {
      const text = (pasteArea.value || '').trim();
      if (!text) { setStatus('Nothing in the paste box.'); return; }
      try {
        const parsed = JSON.parse(text);
        incomingData = Array.isArray(parsed) ? parsed : [parsed];
        setStatus(`Parsed ${incomingData.length} records from pasted JSON.`);
      } catch (e) {
        console.error(e);
        setStatus('Invalid JSON.');
      }
    });
  }

  // Parse CSV
  if (btnParseCsv && fileCsv) {
    btnParseCsv.addEventListener('click', () => {
      const file = fileCsv.files && fileCsv.files[0];
      if (!file) { setStatus('Choose a CSV first.'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const rows = reader.result.split(/\r?\n/).filter(Boolean);
          if (!rows.length) throw new Error('CSV appears empty');
          const headers = rows[0].split(',').map(h => h.trim());
          const need = ['id','case_name','citation','year','court','jurisdiction','summary'];
          const missing = need.filter(h => !headers.includes(h));
          if (missing.length) {
            throw new Error('Missing required headers: ' + missing.join(', '));
          }
          const data = rows.slice(1).map(line => {
            const cells = line.split(',').map(s => s.trim());
            const obj = {};
            headers.forEach((h,i) => obj[h] = cells[i] ?? '');
            // pipe-delimited arrays
            ['compliance_flags','tags','key_points','sources'].forEach(k => {
              if (obj[k]) obj[k] = String(obj[k]).split('|').map(s => s.trim()).filter(Boolean);
            });
            return obj;
          });
          incomingData = data;
          setStatus(`Parsed ${incomingData.length} records from CSV.`);
        } catch (e) {
          console.error(e);
          setStatus('CSV parse failed: ' + e.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // Validate (schema-ish)
  if (btnValidate) {
    btnValidate.addEventListener('click', () => {
      if (!incomingData.length) { setStatus('No incoming data to validate.'); return; }
      const need = ['id','case_name','citation','year','court','jurisdiction','summary'];
      const errors = [];
      const seen = new Set();
      incomingData.forEach((r, idx) => {
        const miss = need.filter(k => r[k] === undefined || r[k] === null || String(r[k]).trim() === '');
        if (miss.length) errors.push(`Row ${idx+1} missing: ${miss.join(', ')}`);
        if (seen.has(r.id)) errors.push(`Duplicate ID in incoming: ${r.id}`);
        seen.add(r.id);
      });
      setStatus(errors.length ? errors.join('\n') : 'Validation OK.');
    });
  }

  // Merge in-memory
  if (btnMerge) {
    btnMerge.addEventListener('click', () => {
      if (!currentData.length) { setStatus('Load current dataset first.'); return; }
      if (!incomingData.length) { setStatus('Nothing to merge.'); return; }
      const byId = new Map(currentData.map(r => [r.id, r]));
      const updatesAllowed = !!(allowUpd && allowUpd.checked);
      let adds = 0, upds = 0, rejects = 0;
      incomingData.forEach(r => {
        if (byId.has(r.id)) {
          if (updatesAllowed) { byId.set(r.id, {...byId.get(r.id), ...r}); upds++; }
          else { rejects++; }
        } else { byId.set(r.id, r); adds++; }
      });
      merged = [...byId.values()];
      setStatus(`Merge complete. Adds: ${adds}, Updates: ${upds}, Rejected dupes: ${rejects}. Total: ${merged.length}`);
    });
  }

  // Download merged file
  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      if (!merged || !merged.length) { setStatus('Nothing merged yet.'); return; }
      const blob = new Blob([JSON.stringify(merged, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'citations.json';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      setStatus('Downloaded merged citations.json — commit it to /docs/data/citations/citations.json');
    });
  }
});
</script>
