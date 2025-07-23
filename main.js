window.onload = () => {
  const container = document.getElementById("container");
  if (!container) {
    console.error("❌ Cannot find #container in DOM");
    return;
  }

  // Attempt to fetch citations.json
  fetch("citations.json")
    .then(response => {
      if (!response.ok) {
        throw new Error(`❌ Failed to load citations.json: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      container.innerHTML = ""; // Clear any prior
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
    })
    .catch(error => {
      container.innerHTML = `<pre style="color:red;">Error loading citations.json:\n${error.message}</pre>`;
      console.error("❌ JSON Error:", error);
    });
};

// Button functions
function loadCitations() {
  document.location.reload();
}

function exportData() {
  const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "citations.json";
  a.click();
  URL.revokeObjectURL(url);
}

function clearCitations() {
  const container = document.getElementById("container");
  if (container) container.innerHTML = "";
}
