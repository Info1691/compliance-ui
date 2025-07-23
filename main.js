window.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("container");
  if (!container) {
    console.error("❌ Cannot find #container in DOM!");
    return;
  }

  // Load citations.json automatically
  fetch("citations.json")
    .then(response => {
      if (!response.ok) {
        throw new Error(`❌ Failed to load citations.json: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => renderCitations(data))
    .catch(error => {
      container.innerHTML = `<pre style="color:red;">Error loading citations.json:\n${error.message}</pre>`;
      console.error("❌ JSON Error:", error);
    });

  // Allow loading from user file
  document.getElementById("fileInput").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const json = JSON.parse(e.target.result);
        renderCitations(json);
      } catch (err) {
        container.innerHTML = `<pre style="color:red;">Invalid JSON file:\n${err.message}</pre>`;
      }
    };
    reader.readAsText(file);
  });

  // Export data
  window.exportData = function () {
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
  window.clearCitations = function () {
    container.innerHTML = "";
    localStorage.removeItem("citations");
  };

  // Load
  window.loadCitations = function () {
    const input = document.getElementById("fileInput");
    if (input) input.click();
  };

  // Render function
  function renderCitations(data) {
    localStorage.setItem("citations", JSON.stringify(data));
    container.innerHTML = ""; // Clear previous
    data.forEach(entry => {
      const card = document.createElement("div");
      card.className = "citation-card";
      card.innerHTML = `
        <h3>${entry.case_name} (${entry.year})</h3>
        <p><strong>Citation:</strong> ${entry.citation}</p>
        <p><strong>Jurisdiction:</strong> ${entry.jurisdiction}</p>
        <p><strong>Compliance Flags:</strong> ${entry.compliance_flags.join(", ")}</p>
        <p><strong>Tags:</strong> ${entry.tags.join(", ")}</p>
      `;
      container.appendChild(card);
    });
  }
});
