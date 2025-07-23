let currentIndex = 0;
let citations = [];

fetch('citations.json')
  .then(response => response.json())
  .then(data => {
    citations = data;
    displayCitation(currentIndex);
  });

function displayCitation(index) {
  const citation = citations[index];
  const container = document.getElementById('citationCard');
  if (!citation) {
    container.innerHTML = '<p>No citation found.</p>';
    return;
  }

  container.innerHTML = `
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
    <p><strong>Case Link:</strong> ${citation.case_link ? `<a href="${citation.case_link}" target="_blank">View Case</a>` : 'N/A'}</p>
    <p><strong>Printable:</strong> ${citation.printable ? "Yes" : "No"}</p>
    <p><strong>Full Text:</strong><br/><pre>${citation.full_case_text || "–"}</pre></p>
    <button onclick="editCitation(${index})">Edit</button>
    <button onclick="deleteCitation(${index})">Delete</button>
  `;
}

function showNext() {
  if (currentIndex < citations.length - 1) {
    currentIndex++;
    displayCitation(currentIndex);
  }
}

function showPrevious() {
  if (currentIndex > 0) {
    currentIndex--;
    displayCitation(currentIndex);
  }
}

function printCitation() {
  window.print();
}

function exportCitation() {
  const citation = citations[currentIndex];
  const blob = new Blob([JSON.stringify(citation, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${citation.id || "citation"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function editCitation(index) {
  alert("Full edit interface coming in next phase.");
}

function deleteCitation(index) {
  alert("You will perform this deletion manually. Integrity preserved.");
}
