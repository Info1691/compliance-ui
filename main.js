let currentIndex = 0;
let citations = [];

// Fetch citations from JSON
fetch('citations.json')
  .then(response => {
    if (!response.ok) throw new Error('Network response was not ok');
    return response.json();
  })
  .then(data => {
    citations = data;
    displayCitation(currentIndex);
  })
  .catch(error => {
    document.getElementById('citationCard').innerHTML = `<p>Error loading citations: ${error.message}</p>`;
  });

// Display a single citation
function displayCitation(index) {
  const citation = citations[index];
  const container = document.getElementById('citationCard');
  if (!citation) {
    container.innerHTML = `<p>No citation found.</p>`;
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
    <p><strong>Full Text:</strong><br/><pre>${citation.full_case_text || "—"}</pre></p>
    <button onclick="editCitation(${index})">Edit</button>
    <button onclick="deleteCitation(${index})">Delete</button>
  `;
}

// Edit a citation (in-place form)
function editCitation(index) {
  const citation = citations[index];
  const container = document.getElementById('citationCard');

  container.innerHTML = `
    <h2>Edit Citation</h2>
    <form id="editForm">
      <label>Case Name: <input type="text" name="case_name" value="${citation.case_name}" /></label><br/>
      <label>Citation: <input type="text" name="citation" value="${citation.citation}" /></label><br/>
      <label>Year: <input type="text" name="year" value="${citation.year}" /></label><br/>
      <label>Court: <input type="text" name="court" value="${citation.court}" /></label><br/>
      <label>Jurisdiction: <input type="text" name="jurisdiction" value="${citation.jurisdiction}" /></label><br/>
      <label>Summary:<br/><textarea name="summary">${citation.summary}</textarea></label><br/>
      <label>Legal Principle:<br/><textarea name="legal_principle">${citation.legal_principle}</textarea></label><br/>
      <label>Holding:<br/><textarea name="holding">${citation.holding}</textarea></label><br/>
      <label>Compliance Flags: <input type="text" name="compliance_flags" value="${citation.compliance_flags.join(", ")}" /></label><br/>
      <label>Key Points: <input type="text" name="key_points" value="${citation.key_points.join(", ")}" /></label><br/>
      <label>Tags: <input type="text" name="tags" value="${citation.tags.join(", ")}" /></label><br/>
      <label>Case Link: <input type="text" name="case_link" value="${citation.case_link || ''}" /></label><br/>
      <label>Full Case Text:<br/><textarea name="full_case_text">${citation.full_case_text || ''}</textarea></label><br/>
      <label>Printable: 
        <select name="printable">
          <option value="true" ${citation.printable ? "selected" : ""}>Yes</option>
          <option value="false" ${!citation.printable ? "selected" : ""}>No</option>
        </select>
      </label><br/><br/>
      <button type="submit">Save</button>
    </form>
  `;

  document.getElementById("editForm").onsubmit = function (e) {
    e.preventDefault();
    const form = new FormData(e.target);
    citations[index] = {
      id: citation.id,
      case_name: form.get("case_name"),
      citation: form.get("citation"),
      year: form.get("year"),
      court: form.get("court"),
      jurisdiction: form.get("jurisdiction"),
      summary: form.get("summary"),
      legal_principle: form.get("legal_principle"),
      holding: form.get("holding"),
      compliance_flags: form.get("compliance_flags").split(",").map(x => x.trim()),
      key_points: form.get("key_points").split(",").map(x => x.trim()),
      tags: form.get("tags").split(",").map(x => x.trim()),
      case_link: form.get("case_link"),
      full_case_text: form.get("full_case_text"),
      printable: form.get("printable") === "true"
    };
    displayCitation(index);
  };
}

// Delete a citation
function deleteCitation(index) {
  if (!confirm("Are you sure you want to delete this citation?")) return;
  citations.splice(index, 1);
  if (currentIndex >= citations.length) {
    currentIndex = citations.length - 1;
  }
  displayCitation(currentIndex);
}

// Navigation
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
