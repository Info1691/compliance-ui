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
      <p><strong>Case Link:</strong> ${citation.case_link ? `<a href="${citation.case_link}" target="_blank">View Case</a>` : 'N/A'}</p>
      <p><strong>Full Text:</strong><br><pre>${citation.full_case_text || "—"}</pre></p>
      <p><strong>Printable:</strong> ${citation.printable ? "Yes" : "No"}</p>
      <button onclick="editCitation(${index})">Edit</button>
      <button onclick="deleteCitation(${index})">Delete</button>
    </div>
  `;
}

function editCitation(index) {
  const citation = citations[index];
  const container = document.getElementById('citationCard');

  container.innerHTML = `
    <div class="card">
      <h2>Edit Citation</h2>
      <form id="editForm">
        <label>Case Name: <input type="text" name="case_name" value="${citation.case_name}"/></label><br/>
        <label>Citation: <input type="text" name="citation" value="${citation.citation}"/></label><br/>
        <label>Year: <input type="text" name="year" value="${citation.year}"/></label><br/>
        <label>Court: <input type="text" name="court" value="${citation.court}"/></label><br/>
        <label>Jurisdiction: <input type="text" name="jurisdiction" value="${citation.jurisdiction}"/></label><br/>
        <label>Summary:<br/><textarea name="summary">${citation.summary}</textarea></label><br/>
        <label>Legal Principle:<br/><textarea name="legal_principle">${citation.legal_principle}</textarea></label><br/>
        <label>Holding:<br/><textarea name="holding">${citation.holding}</textarea></label><br/>
        <label>Compliance Flags: <input type="text" name="compliance_flags" value="${citation.compliance_flags.join(", ")}"/></label><br/>
        <label>Key Points: <input type="text" name="key_points" value="${citation.key_points.join(", ")}"/></label><br/>
        <label>Tags: <input type="text" name="tags" value="${citation.tags.join(", ")}"/></label><br/>
        <label>Case Link: <input type="text" name="case_link" value="${citation.case_link || ""}"/></label><br/>
        <label>Full Case Text:<br/><textarea name="full_case_text">${citation.full_case_text || ''}</textarea></label><br/>
        <label>Printable: <input type="checkbox" name="printable" ${citation.printable ? 'checked' : ''}></label><br/>
        <button type="submit">Save</button>
        <button type="button" onclick="displayCitation(${index})">Cancel</button>
      </form>
    </div>
  `;

  const form = document.getElementById('editForm');
  form.onsubmit = function (e) {
    e.preventDefault();
    const formData = new FormData(form);
    citations[index] = {
      case_name: formData.get("case_name"),
      citation: formData.get("citation"),
      year: formData.get("year"),
      court: formData.get("court"),
      jurisdiction: formData.get("jurisdiction"),
      summary: formData.get("summary"),
      legal_principle: formData.get("legal_principle"),
      holding: formData.get("holding"),
      compliance_flags: formData.get("compliance_flags").split(",").map(s => s.trim()),
      key_points: formData.get("key_points").split(",").map(s => s.trim()),
      tags: formData.get("tags").split(",").map(s => s.trim()),
      case_link: formData.get("case_link"),
      full_case_text: formData.get("full_case_text"),
      printable: formData.get("printable") === "on"
    };
    displayCitation(index);
  };
}

function deleteCitation(index) {
  if (!confirm("Are you sure you want to delete this citation?")) return;
  citations.splice(index, 1);
  if (currentIndex >= citations.length) currentIndex = citations.length - 1;
  displayCitation(currentIndex);
}

function prevCitation() {
  if (currentIndex > 0) {
    currentIndex--;
    displayCitation(currentIndex);
  }
}

function nextCitation() {
  if (currentIndex < citations.length - 1) {
    currentIndex++;
    displayCitation(currentIndex);
  }
}

function printCitation() {
  window.print();
}

function exportCitation() {
  const citation = citations[currentIndex];
  const blob = new Blob([JSON.stringify(citation, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${citation.id || "citation"}.json`;
  link.click();
}

fetch("citations.json")
  .then((response) => response.json())
  .then((data) => {
    citations = data;
    displayCitation(currentIndex);
  });
