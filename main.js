let currentIndex = 0;
let citations = [];

function loadCitations() {
  fetch("citations.json")
    .then((response) => response.json())
    .then((data) => {
      citations = data;
      if (citations.length > 0) {
        renderCitation(currentIndex);
      } else {
        document.getElementById("citation-container").innerHTML = "No citations found.";
      }
    })
    .catch((error) => {
      console.error("Error loading citations:", error);
      document.getElementById("citation-container").innerHTML = "Failed to load citations.";
    });
}

function renderCitation(index) {
  const citation = citations[index];
  const container = document.getElementById("citation-container");

  if (!citation || !container) return;

  container.innerHTML = `
    <div class="citation-card">
      <h2>${citation.case_name} (${citation.year})</h2>
      <p><strong>Citation:</strong> ${citation.citation}</p>
      <p><strong>Court:</strong> ${citation.court}</p>
      <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
      <p><strong>Summary:</strong> ${citation.summary}</p>
      <p><strong>Legal Principle:</strong> ${citation.legal_principle}</p>
      <p><strong>Holding:</strong> ${citation.holding}</p>
      <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(", ")}</p>
      <p><strong>Key Points:</strong> ${citation.key_points.join(", ")}</p>
      <p><strong>Tags:</strong> ${citation.tags.join(", ")}</p>
      <p><strong>Case Link:</strong> ${citation.case_link || "N/A"}</p>
      <p><strong>Printable:</strong> ${citation.printable ? "Yes" : "No"}</p>
    </div>
  `;
}

function prevCitation() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCitation(currentIndex);
  }
}

function nextCitation() {
  if (currentIndex < citations.length - 1) {
    currentIndex++;
    renderCitation(currentIndex);
  }
}

function printCurrentCitation() {
  window.print();
}

function exportCurrentCitation() {
  const citation = citations[currentIndex];
  const content = JSON.stringify(citation, null, 2);
  const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(content);
  const exportLink = document.createElement("a");
  exportLink.href = dataUri;
  exportLink.download = `${citation.case_name.replace(/\s+/g, "_")}_${citation.year}.json`;
  document.body.appendChild(exportLink);
  exportLink.click();
  document.body.removeChild(exportLink);
}

window.onload = loadCitations;
