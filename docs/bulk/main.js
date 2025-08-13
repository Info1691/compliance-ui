(function () {
  // ---------- schema ----------
  const REQUIRED = ["id", "case_name", "citation", "year"];
  const LIST_FIELDS = new Set(["sources","compliance_flags","key_points","tags"]);
  const VALID_ID = /^[a-z0-9-]+$/;
  const VALID_YEAR = /^[0-9]{4}$/;

  // ---------- dom ----------
  const els = {
    file: $("#fileInput"),
    paste: $("#pasteBox"),
    parseBtn: $("#parseBtn"),
    clearBtn: $("#clearBtn"),
    results: $("#results"),
    existingBox: $("#existingBox"),
    overwrite: $("#overwrite"),
    sortBy: $("#sortBy"),
    mergeBtn: $("#mergeBtn"),
    merged: $("#mergedOut"),
    downloadBtn: $("#downloadBtn"),
  };

  let parsedRows = []; // from upload/paste

  // ---------- helpers ----------
  function $(sel){return document.querySelector(sel);}
  const toArray = (v) => Array.isArray(v) ? v : (v==null || v==="") ? [] : String(v).split(",").map(s=>s.trim()).filter(Boolean);

  function csvToObjects(csv) {
    // simple CSV (handles quoted cells)
    const lines = csv.replace(/\r\n?/g,"\n").split("\n").filter(l=>l.trim().length>0);
    if (!lines.length) return [];
    const headers = splitCSVLine(lines[0]).map(h=>h.trim());
    const rows = [];
    for (let i=1;i<lines.length;i++){
      const cells = splitCSVLine(lines[i]);
      const obj = {};
      headers.forEach((h,idx)=>{ obj[h] = cells[idx] ?? ""; });
      rows.push(obj);
    }
    return rows;
  }
  function splitCSVLine(line){
    const out=[]; let cur=""; let q=false;
    for (let i=0;i<line.length;i++){
      const c=line[i];
      if (c === '"' ){ if (q && line[i+1]==='"'){cur+='"';i++;} else {q=!q;} }
      else if (c === "," && !q){ out.push(cur); cur=""; }
      else { cur += c; }
    }
    out.push(cur);
    return out;
  }

  function normalizeRow(r){
    // trim keys/values, coerce lists, coerce year
    const o = {};
    for (const k in r){
      const key = k.trim();
      let v = r[k];
      if (typeof v === "string") v = v.trim();
      if (LIST_FIELDS.has(key)) v = toArray(v);
      if (key === "year") v = String(v).match(/[0-9]{4}/)?.[0] ?? "";
      o[key] = v;
    }
    return o;
  }

  function validate(rows){
    const seen = new Set();
    const errors = [];
    const clean = [];

    rows.forEach((raw, idx)=>{
      const row = normalizeRow(raw);
      const n = idx+1;
      const missing = REQUIRED.filter(k=>!row[k] && row[k] !== 0);
      if (missing.length){
        errors.push(`#${n}: missing required: ${missing.join(", ")}`);
      }
      if (row.id && !VALID_ID.test(row.id)){
        errors.push(`#${n}: id "${row.id}" must be lowercase letters, numbers, hyphens only`);
      }
      if (row.year && !VALID_YEAR.test(String(row.year))){
        errors.push(`#${n}: year "${row.year}" must be a 4-digit integer`);
      }
      if (row.id){
        if (seen.has(row.id)) errors.push(`#${n}: duplicate id "${row.id}" in upload`);
        seen.add(row.id);
      }
      clean.push(row);
    });

    return {errors, clean};
  }

  function sortByKey(arr, key){
    const k = key || "case_name";
    return [...arr].sort((a,b)=>{
      const av = (a[k] ?? "").toString().toLowerCase();
      const bv = (b[k] ?? "").toString().toLowerCase();
      if (k === "year") return Number(av||0) - Number(bv||0);
      return av.localeCompare(bv);
    });
  }

  function merge(existing, incoming, overwrite=false){
    const byId = new Map((existing||[]).map(x=>[x.id, x]));
    const conflicts = [];
    for (const row of incoming){
      if (!row.id){ continue; }
      if (byId.has(row.id)){
        conflicts.push(row.id);
        if (overwrite) byId.set(row.id, row);
      } else {
        byId.set(row.id, row);
      }
    }
    return {merged: Array.from(byId.values()), conflicts};
  }

  function showResults(lines){
    els.results.textContent = lines.join("\n") || "No issues detected.";
  }

  function download(filename, text){
    const blob = new Blob([text], {type:"application/json;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
  }

  // ---------- events ----------
  els.file.addEventListener("change", async (e)=>{
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const text = await file.text();
    handleParse(text);
  });

  els.parseBtn.addEventListener("click", ()=>{
    handleParse(els.paste.value);
  });

  els.clearBtn.addEventListener("click", ()=>{
    els.paste.value = "";
    els.results.textContent = "Cleared. Paste or upload new data.";
    parsedRows = [];
  });

  els.mergeBtn.addEventListener("click", ()=>{
    const msgs = [];
    if (!parsedRows.length){
      showResults(["Nothing to merge. Parse some data first."]);
      return;
    }
    let existing = [];
    if (els.existingBox.value.trim()){
      try {
        existing = JSON.parse(els.existingBox.value);
        if (!Array.isArray(existing)) throw new Error("existing JSON must be an array");
      } catch (err){
        showResults([`Existing JSON parse error: ${err.message}`]);
        return;
      }
    }
    const overwrite = els.overwrite.checked;
    const {merged, conflicts} = merge(existing, parsedRows, overwrite);
    const sorted = sortByKey(merged, els.sortBy.value);
    els.merged.value = JSON.stringify(sorted, null, 2);
    msgs.push(`Merged ${parsedRows.length} item(s) into ${existing.length} existing → ${sorted.length} total.`);
    if (conflicts.length){
      msgs.push(`${overwrite ? "Overwrote" : "Kept existing for"} ${conflicts.length} conflicting id(s): ${conflicts.slice(0,10).join(", ")}${conflicts.length>10?"…":""}`);
    }
    showResults(msgs);
  });

  els.downloadBtn.addEventListener("click", ()=>{
    if (!els.merged.value.trim()){
      showResults(["Nothing to download. Click “Generate Merged JSON” first."]);
      return;
    }
    download("merged.json", els.merged.value);
  });

  // ---------- parsing core ----------
  function handleParse(raw){
    if (!raw || !raw.trim()){
      showResults(["No input detected. Upload a file or paste JSON/CSV."]);
      return;
    }
    let rows = [];
    let notes = [];
    // Try JSON first
    try {
      const j = JSON.parse(raw);
      if (!Array.isArray(j)) throw new Error("JSON must be an array of objects");
      rows = j;
      notes.push(`Parsed JSON array with ${rows.length} item(s).`);
    } catch {
      // Fallback CSV
      try {
        rows = csvToObjects(raw);
        notes.push(`Parsed CSV with ${rows.length} row(s).`);
      } catch (errCsv) {
        showResults([`Parse error: ${errCsv.message}`]);
        return;
      }
    }

    const {errors, clean} = validate(rows);
    parsedRows = clean;
    const summary = [
      ...notes,
      errors.length ? `Validation errors (${errors.length}):` : "No validation errors.",
      ...errors
    ];
    showResults(summary);
  }
})();
