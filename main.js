let currentIndex = 0;
let citations = [];

function displayCitation(index) {
  const citation = citations[index];
  const container = document.getElementById('citationCard');
  if (!citation) {
    container.innerHTML = "<p>No citation found.</p>";
    return;
  }

  container.innerHTML = `
    <div class="card">
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
      <p><strong>Case Link:</strong> ${
        citation.case_link ? `<a href="${citation.case_link}" target="_blank">View Case</a>` : 'N/A'
      }</p>
      <p><strong>Printable:</strong> ${citation.printable ? 'Yes' : 'No'}</p>
      <p><strong>Full Text:</strong><br><pre>${citation.full_case_text || '—'}</pre></p>
      <button onclick="editCitation(${index})">Edit</button>
      <button onclick="deleteCitation(${index})">Delete</button>
    </div>
  `;
}

function editCitation(index) {
  // Implement edit popup or modal here if needed
  alert("Edit function not yet implemented.");
}

function deleteCitation(index) {
  if (confirm("Are you sure you want to delete this citation?")) {
    citations.splice(index, 1);
    if (currentIndex >= citations.length) currentIndex = citations.length - 1;
    displayCitation(currentIndex);
  }
}

function showPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    displayCitation(currentIndex);
  }
}

function showNext() {
  if (currentIndex < citations.length - 1) {
    currentIndex++;
    displayCitation(currentIndex);
  }
}

function printCitation() {
  window.print();
}

function exportCitation() {
  const blob = new Blob([JSON.stringify(citations[currentIndex], null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${citations[currentIndex].id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Load citations.json and display first entry
fetch("citations.json")
  .then((response) => {
    if (!response.ok) throw new Error("Fetch failed");
    return response.json();
  })
  .then((data) => {
    citations = data;
    displayCitation(currentIndex);
  })
  .catch((err) => {
    console.error("Error loading citations.json", err);
    document.getElementById('citationCard').innerHTML = `
      <p style='color:red'>
        ⚠️ Failed to load citations.json. Please check that it exists in the root directory and is valid JSON.
      </p>
    `;
  });

// Bind buttons
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("prevBtn").addEventListener("click", showPrev);
  document.getElementById("nextBtn").addEventListener("click", showNext);
  document.getElementById("printBtn").addEventListener("click", printCitation);
  document.getElementById("exportBtn").addEventListener("click", exportCitation);
});
