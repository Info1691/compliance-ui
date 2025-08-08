<script>
let currentData = [];
let incomingData = [];

// Utility: parse CSV with | for arrays
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',').map(h => h.trim());
  return lines.map(line => {
    const cols = line.split(',').map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i] ?? '');
    // Normalize array-like fields (pipe-delimited)
    ['compliance_flags','key_points','tags'].forEach(k => {
      if (obj[k]) obj[k] = obj[k].split('|').map(v => v.trim()).filter(Boolean);
    });
    // Basic types
    if (obj.year) obj.year = Number(obj.year);
    if (obj.printable) obj.printable = String(obj.printable).toLowerCase() === 'true';
    return obj;
  });
}

// Load current dataset
document.getElementById('loadCurrent').addEventListener('click', async () => {
  const out = document.getElementById('output');
  out.textContent = 'Loading current /data/citations/citations.json...';
  try {
    const res = await fetch('../data/citations/citations.json', {cache:'no-store'});
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    currentData = await res.json();
    out.textContent = `Loaded ${currentData.length} records from citations.json.`;
  } catch (e) {
    out.textContent = 'Failed to load current file: ' + e.message;
  }
});

// Paste JSON
document.getElementById('pasteJson').addEventListener('click', () => {
  const txt = prompt('Paste a JSON array of citation objects:');
  if (!txt) return;
  try {
    const arr = JSON.parse(txt);
    if (!Array.isArray(arr)) throw new Error('JSON must be an array.');
    incomingData = arr;
    document.getElementById('output').textContent =
      `Staged ${incomingData.length} records from pasted JSON.`;
  } catch (e) {
    alert('Invalid JSON: ' + e.message);
  }
});

// Upload CSV
document.getElementById('csvFile').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      incomingData = parseCSV(String(reader.result));
      document.getElementById('output').textContent =
        `Staged ${incomingData.length} records from CSV.`;
    } catch (err) {
      alert('CSV parse error: ' + err.message);
    }
  };
  reader.readAsText(file);
});
document.getElementById('parseCsv').addEventListener('click', () => {
  // no-op; parsing happens on file load
  alert('Choose a CSV file first; parsing runs automatically.');
});

// Validate
document.getElementById('runValidation').addEventListener('click', () => {
  const out = document.getElementById('output');
  if (!currentData.length) return (out.textContent = 'Load current dataset first.');
  if (!incomingData.length) return (out.textContent = 'Stage new data (JSON/CSV) first.');

  const allowUpdates = document.getElementById('allowUpdates').checked;
  const existingIds = new Set(currentData.map(r => r.id));
  const seen = new Set();

  const problems = [];
  for (const r of incomingData) {
    if (!r.id) { problems.push('Missing id'); continue; }
    if (seen.has(r.id)) problems.push(`Duplicate id within incoming: ${r.id}`);
    seen.add(r.id);

    const idExists = existingIds.has(r.id);
    if (idExists && !allowUpdates) {
      problems.push(`Incoming id already exists: ${r.id} (updates not allowed)`);
    }

    // Minimal schema checks
    ['case_name','citation','year','court','jurisdiction','summary'].forEach(f=>{
      if (r[f] == null || r[f] === '') problems.push(`id ${r.id}: missing ${f}`);
    });
    if (!Array.isArray(r.compliance_flags)) r.compliance_flags = [];
    if (!Array.isArray(r.key_points)) r.key_points = [];
    if (!Array.isArray(r.tags)) r.tags = [];
  }

  if (problems.length) {
    out.innerHTML = 'Validation FAILED:<br>• ' + problems.join('<br>• ');
  } else {
    out.textContent = 'Validation OK.';
  }
});

// Merge & download
document.getElementById('mergeInMemory').addEventListener('click', () => {
  const out = document.getElementById('output');
  if (!currentData.length || !incomingData.length) {
    out.textContent = 'Load current & stage new data first.'; return;
  }
  const allowUpdates = document.getElementById('allowUpdates').checked;
  const byId = new Map(currentData.map(r => [r.id, r]));
  for (const r of incomingData) {
    if (byId.has(r.id)) {
      if (allowUpdates) byId.set(r.id, {...byId.get(r.id), ...r});
    } else {
      byId.set(r.id, r);
    }
  }
  const merged = Array.from(byId.values());

  const blob = new Blob([JSON.stringify(merged, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.getElementById('downloadBtn');
  a.href = url;
  a.download = 'citations.merged.json';
  a.removeAttribute('disabled');
  out.textContent = `Merged file prepared (${merged.length} records). Click "Download merged citations.json".`;
});
</script>
