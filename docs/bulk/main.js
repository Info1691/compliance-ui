(() => {
    // ===== State =====
    let currentData = [];
    let newData = [];
    let merged = null;

    // ===== Helpers =====
    const $ = sel => document.querySelector(sel);
    const logNode = $("#log");
    const logText = $("#logText");
    function log(msg) {
        logNode.classList.remove("hidden");
        logText.textContent += (typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)) + "\n";
        console.log(msg);
    }
    function clearLog() {
        logText.textContent = '';
        logNode.classList.add("hidden");
    }

    function normalizeArrayField(v) {
        if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
        if (typeof v === 'string')
            return v.split('|').map(s => s.trim()).filter(Boolean);
        return [];
    }

    function requiredFieldsPresent(obj) {
        const req = ['id', 'case_name', 'citation', 'year', 'court', 'jurisdiction', 'summary'];
        const missing = req.filter(k => !obj[k] || String(obj[k]).trim() === '');
        return { ok: missing.length === 0, missing };
    }

    // ===== Load Current =====
    $("#btnLoadCurrent").addEventListener("click", async () => {
        clearLog();
        try {
            const res = await fetch("../data/citations/citations.json");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            currentData = await res.json();
            log(`Loaded ${currentData.length} existing citations.`);
        } catch (err) {
            log(`Error loading current dataset: ${err}`);
        }
    });

    // ===== Paste JSON =====
    $("#btnPasteJSON").addEventListener("click", () => {
        const text = $("#pastedJSON").value;
        try {
            newData = JSON.parse(text);
            log(`Pasted JSON with ${newData.length} records.`);
        } catch (err) {
            log(`Invalid JSON: ${err}`);
        }
    });

    // ===== Parse CSV =====
    $("#btnParseCSV").addEventListener("click", () => {
        const file = $("#fileCSV").files[0];
        if (!file) return log("No CSV file selected.");
        const reader = new FileReader();
        reader.onload = e => {
            const lines = e.target.result.split("\n").filter(Boolean);
            const headers = lines.shift().split(",");
            newData = lines.map(line => {
                const values = line.split(",");
                const obj = {};
                headers.forEach((h, i) => obj[h.trim()] = values[i] ? values[i].trim() : '');
                return obj;
            });
            log(`Parsed CSV with ${newData.length} records.`);
        };
        reader.readAsText(file);
    });

    // ===== Validation =====
    $("#btnValidate").addEventListener("click", () => {
        if (!newData.length) return log("No new data to validate.");
        const allowDupes = $("#allowDuplicates").checked;
        const ids = new Set(currentData.map(c => c.id));
        let valid = true;
        newData.forEach((rec, i) => {
            const { ok, missing } = requiredFieldsPresent(rec);
            if (!ok) {
                log(`Record ${i + 1} missing fields: ${missing.join(", ")}`);
                valid = false;
            }
            if (!allowDupes && ids.has(rec.id)) {
                log(`Duplicate ID found: ${rec.id}`);
                valid = false;
            }
        });
        if (valid) log("Validation passed.");
    });

    // ===== Merge =====
    $("#btnMerge").addEventListener("click", () => {
        if (!newData.length) return log("No new data to merge.");
        merged = [...currentData];
        const ids = new Set(currentData.map(c => c.id));
        newData.forEach(rec => {
            if (ids.has(rec.id)) {
                if ($("#allowDuplicates").checked) {
                    merged = merged.map(c => c.id === rec.id ? rec : c);
                }
            } else {
                merged.push(rec);
            }
        });
        log(`Merge complete. Total records: ${merged.length}`);
    });

    // ===== Download =====
    $("#btnDownload").addEventListener("click", () => {
        if (!merged) return log("No merged data to download.");
        const blob = new Blob([JSON.stringify(merged, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "citations.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        log("Download started.");
    });
})();
