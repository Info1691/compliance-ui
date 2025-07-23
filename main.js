window.onload = () => {
  const container = document.getElementById("container");
  if (!container) {
    console.error("❌ Cannot find #container in DOM");
    return;
  }

  fetch("citations.json")
    .then(response => {
      if (!response.ok) {
        throw new Error(`❌ Failed to load citations.json: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      container.innerHTML = "";
      data.forEach(entry => {
        const card = document.createElement("div");
        card.className = "citation-card";

        card.innerHTML = `
          <h3>${entry.case_name} (${entry.year})</h3>
          <p><strong>Citation:</strong> ${entry.citation}</p>
          <p><strong>Court:</strong> ${entry.court}</p>
          <p><strong>Jurisdiction:</strong> ${entry.jurisdiction}</p>
          <p><strong>Summary:</strong> ${entry.summary}</p>
          <p><strong>Legal Principle:</strong> ${entry.legal_principle}</p>
          <p><strong>Holding:</strong> ${entry.holding}</p>
          <p><strong>Compliance Flags:</strong> ${entry.compliance_flags.join(", ")}</p>
          <p><strong>Key Points:</strong> ${entry.key_points.join(", ")}</p>
          <p><strong>Tags:</strong> ${entry.tags.join(", ")}</p>
          <p><strong>Case Link:</strong> ${entry.case_link ? `<a href="${entry.case_link}" target="_blank">View</a>` : "N/A"}</p>
          <p><strong>Printable:</strong> ${entry.printable ? "Yes" : "No"}</p>
        `;

        if (entry.full_case_text) {
          const details = document.createElement("details");
          details.innerHTML = `<summary>📄 Full Case Text</summary><pre>${entry.full_case_text}</pre>`;
          card.appendChild(details);
        }

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
  const dataStr = JSON.stringify(currentData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "citations.json";
  link.click();
  URL.revokeObjectURL(url);
}

function clearCitations() {
  const container = document.getElementById("container");
  if (container) container.innerHTML = "";
}
