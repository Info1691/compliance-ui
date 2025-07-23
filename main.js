let currentIndex = 0;
let citations = [];

function displayCitation(index) {
  const citation = citations[index];
  const container = document.getElementById('citationCard');
  if (!citation) return container.innerHTML = "<p>No citation found.</p>";

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
    <p><strong>Case Link:</strong> ${
      citation.case_link ? `<a href="${citation.case_link}" target="_blank">View Case</a>` : 'N/A'
    }</p>
    <p><strong>Printable:</strong> ${citation.printable ? "Yes" : "No"}</p>
    <p><strong>Full Text:</strong><br><pre>${citation.full_case_text || "—"}</pre></p>
    <br>
    <button onclick="editCitation(${index})">Edit</button>
    <button onclick="deleteCitation(${index})">Delete</button>
  `;
}

function editCitation(index) {
  const citation = citations[index];
  const container = document.getElementById('citationCard');

  container.innerHTML = `
    <h2>Edit: ${citation.case_name}</h2>
    <form id="editForm">
      <label>Case Name:<br><input name="case_name" value="${citation.case_name}" /></label><br>
      <label>Citation:<br><input name="citation" value="${citation.citation}" /></label><br>
      <label>Year:<br><input name="year" value="${citation.year}" /></label><br>
      <label>Court:<br><input name="court" value="${citation.court}" /></label><br>
      <label>Jurisdiction:<br><input name="jurisdiction" value="${citation.jurisdiction}" /></label><br>
      <label>Summary:<br><textarea name="summary">${citation.summary}</textarea></label><br>
      <label>Legal Principle:<br><textarea name="legal_principle">${citation.legal_principle}</textarea></label><br>
      <label>Holding:<br><textarea name="holding">${citation.holding}</textarea></label><br>
      <label>Compliance Flags:<br><input name="compliance_flags" value="${citation.compliance_flags.join(", ")}" /></label><br>
      <label>Key Points:<br><input name="key_points" value="${citation.key_points.join(", ")}" /></label><br>
      <label>Tags:<br><input name="tags" value="${citation.tags.join(", ")}" /></label><br>
      <label>Case Link:<br><input name="case_link" value="${citation.case_link || ""}" /></label><br>
      <label>Full Case Text:<br><textarea name="full_case_text">${citation.full_case_text || ""}</textarea></label><br>
      <label>Printable:<br><input name="printable" value="${citation.printable}" /></label><br><br>
      <button type="submit">Save</button>
      <button type="button" onclick="displayCitation(${index})">Cancel</button>
    </form>
  `;

  document.getElementById("editForm").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    citations[index] = {
      id: citation.id,
      case_name: fd.get("case_name"),
      citation: fd.get("citation"),
      year: fd.get("year"),
      court: fd.get("court"),
      jurisdiction: fd.get("jurisdiction"),
      summary: fd.get("summary"),
      legal_principle: fd.get("legal_principle"),
      holding: fd.get("holding"),
      compliance_flags: fd.get("compliance_flags").split(",").map(t => t.trim()),
      key_points: fd.get("key_points").split(",").map(t => t.trim()),
      tags: fd.get("tags").split(",").map(t => t.trim()),
      case_link: fd.get("case_link"),
      full_case_text: fd.get("full_case_text"),
      printable: fd.get("printable") === "true"
    };
    displayCitation(index);
  };
}

function deleteCitation(index) {
  if (!confirm("Delete this citation?")) return;
  citations.splice(index, 1);
  if (currentIndex >= citations.length) currentIndex = citations.length - 1;
  displayCitation(currentIndex);
}

function printCitation() {
  window.print();
}

function exportCitation() {
  const citation = citations[currentIndex];
  const blob = new Blob([JSON.stringify(citation, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${citation.id || "citation"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("prevBtn").onclick = () => {
  if (currentIndex > 0) {
    currentIndex--;
    displayCitation(currentIndex);
  }
};

document.getElementById("nextBtn").onclick = () => {
  if (currentIndex < citations.length - 1) {
    currentIndex++;
    displayCitation(currentIndex);
  }
};

document.getElementById("printBtn").onclick = printCitation;
document.getElementById("exportBtn").onclick = exportCitation;

fetch('citations.json')
  .then(r => r.json())
  .then(json => {
    citations = json;
    displayCitation(currentIndex);
  });
