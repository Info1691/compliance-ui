let currentData = [];
let incomingData = [];

// Parse CSV where array fields are pipe-delimited
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = lines.shift().split(',').map(h => h.trim());
  return lines.map(line => {
    const cols = line.split(',').map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i] ?? '');

    // normalize arrays
    ['compliance_flags','key_points','tags'].forEach(k => {
      if (obj[k]) obj[k] = obj[k].split('|').map(v => v.trim()).filter(Boolean);
    });

    // types
    if (obj.year !== undefined && obj.year !== '') obj.year = Number(obj.year);
    if (obj.printable !== undefined) obj.printable = String(obj.printable).toLowerCase() === 'true';

    return obj;
  });
}

const out = document.getElementById('output');

document.getElementById('loadCurrent').addEventListener('click', async () => {
  out.textContent = 'Loading ../data/citations/citations.json …';
  try {
    const res = await fetch('../data/citations/citations.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    currentData = await res.json();
    out.textContent = `Loaded ${currentData.length} records from citations.json.`;
  } catch (e) {
    out.textContent = 'Failed to load current: ' + e.message;
  }
});

document.getElementById('pasteJson').addEventListener('click', () => {
  const txt = prompt('Paste a JSON array of citation objects:');
  if (!txt) return;
  try {
    const arr = JSON.parse(txt);
    if (!Array.isArray(arr)) throw new Error('JSON must be an array of objects.');
    incomingData = arr;
    out.textContent = `Staged ${incomingData.length} records from pasted JSON.`;
  } catch (e) {
    alert('Invalid JSON: ' + e.message);
  }
});

document.getElementById('csvFile').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      incomingData = parseCSV(String(reader.result));
      out.textContent = `Staged ${incomingData.length} records from CSV.`;
    } catch (err) {
      alert('CSV parse error: ' + err.message);
    }
  };
  reader.readAsText(file);
});

document.getElementById('runValidation').addEventListener('click', () => {
  if (!currentData.length) return (out.textContent = 'Load current dataset first.');
  if (!incomingData.length) return (out.textContent = 'Stage new data (JSON/CSV) first.');

  const allowUpdates = document.getElementById('allowUpdates').checked;
  const existingIds = new Set(currentData.map(r => r.id));
  const seen = new Set();
  const problems = [];

  for (const r of incomingData) {
    if (!r.id) { problems.push('Missing id on an incoming record'); continue; }
    if (seen.has(r.id)) problems.push(`Duplicate id within incoming: ${r.id}`);
    seen.add(r.id);

    const exists = existingIds.has(r.id);
    if (exists && !allowUpdates) problems.push(`Incoming id already exists: ${r.id} (updates not allowed)`);

    // required fields
    ['case_name','citation','year','court','jurisdiction','summary'].forEach(f => {
      if (r[f] === undefined || r[f] === '') problems.push(`id ${r.id}: missing ${f}`);
    });

    // array normalization guard
    if (!Array.isArray(r.compliance_flags)) r.compliance_flags = r.compliance_flags ? [String(r.compliance_flags)] : [];
    if (!Array.isArray(r.key_points)) r.key_points = r.key_points ? [String(r.key_points)] : [];
    if (!Array.isArray(r.tags)) r.tags = r.tags ? [String(r.tags)] : [];
  }

  out.innerHTML = problems.length
    ? 'Validation FAILED:<br>• ' + problems.join('<br>• ')
    : 'Validation OK.';
});

document.getElementById('mergeInMemory').addEventListener('click', () => {
  if (!currentData.length || !incomingData.length) {
    out.textContent = 'Load current & stage new data first.'; return;
  }
  const allowUpdates = document.getElementById('allowUpdates').checked;
  const byId = new Map(currentData.map(r => [r.id, r]));

  for (const r of incomingData) {
    if (byId.has(r.id)) {
      if (allowUpdates) byId.set(r.id, { ...byId.get(r.id), ...r });
    } else {
      byId.set(r.id, r);
    }
  }
  const merged = Array.from(byId.values());
  const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dl = document.getElementById('downloadBtn');
  dl.href = url;
  dl.removeAttribute('disabled');
  out.textContent = `Merged file prepared (${merged.length} records). Click “Download merged citations.json”, then commit it to /docs/data/citations/citations.json.`;
});
