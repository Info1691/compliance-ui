window.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("container");
  const fileInput = document.getElementById("fileInput");

  if (!container) {
    console.error("❌ #container not found");
    return;
  }

  // Load citations from static file
  fetch("citations.json")
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load citations.json: ${res.statusText}`);
      return res.json();
    })
    .then(data => renderCitations(data))
    .catch(err => {
      container.innerHTML = `<pre style="color:red;">Error loading citations.json:\n${err.message}</pre>`;
      console.error(err);
    });

  // Load from user file
  fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        renderCitations(data);
        localStorage.setItem("citations", JSON.stringify(data));
      } catch (err) {
        container.innerHTML = `<pre style="color:red;">Invalid JSON format:\n${err.message}</pre>`;
      }
    };
    reader.readAsText(file);
  });

  // Export
  window.exportData = () => {
    const data = localStorage.getItem("citations");
    if (!data) return alert("Nothing to export.");
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "citations.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear
  window.clearCitations = () => {
    container.innerHTML = "";
    localStorage.removeItem("citations");
  };

  // Manual load button
  window.loadCitations = () => fileInput.click();

  // Render function
  function renderCitations(data) {
    container.innerHTML = "";
    data.forEach(entry => {
      const card = document.createElement("div");
      card.className = "citation-card";
      card.innerHTML = `
        <h3>${entry.case_name} (${entry.year})</h3>
        <p><strong>Citation:</strong> ${entry.citation}</p>
        <p><strong>Jurisdiction:</strong> ${entry.jurisdiction}</p>
        <p><strong>Compliance Flags:</strong> ${entry.compliance_flags?.join(", ") || ""}</p>
        <p><strong>Tags:</strong> ${entry.tags?.join(", ") || ""}</p>
      `;
      container.appendChild(card);
    });
  }
});
