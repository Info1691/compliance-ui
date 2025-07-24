let currentIndex = 0;
let citations = [];

async function loadCitations() {
  try {
    const response = await fetch("citations.json");
    citations = await response.json();
    if (citations.length > 0) {
      displayCitation(currentIndex);
    } else {
      document.getElementById("citationCard").innerHTML = "<p>No citations found.</p>";
    }
  } catch (error) {
    console.error("Error loading citations.json", error);
    document.getElementById("citationCard").innerHTML = "<p>Error loading citations.</p>";
  }
}

function displayCitation(index) {
  const citation = citations[index];
  const card = document.getElementById("citationCard");
  card.innerHTML = `
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
    <p><strong>Full Text:</strong><br><textarea readonly rows="6" style="width:100%;">${citation.full_case_text || "-"}</textarea></p>
    <p><strong>Printable:</strong> ${citation.printable ? "Yes" : "No"}</p>
    <button onclick="editCitation()">Edit</button>
    <button onclick="deleteCitation()">Delete</button>
  `;
}

function showPrevious() {
  if (citations.length === 0) return;
  currentIndex = (currentIndex - 1 + citations.length) % citations.length;
  displayCitation(currentIndex);
}

function showNext() {
  if (citations.length === 0) return;
  currentIndex = (currentIndex + 1) % citations.length;
  displayCitation(currentIndex);
}

function printCitation() {
  const printWindow = window.open("", "_blank");
  const citation = citations[currentIndex];
  printWindow.document.write(`<pre>${JSON.stringify(citation, null, 2)}</pre>`);
  printWindow.document.close();
  printWindow.print();
}

function exportCitation() {
  const citation = citations[currentIndex];
  const blob = new Blob([JSON.stringify(citation, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${citation.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function editCitation() {
  const citation = citations[currentIndex];
  const card = document.getElementById("citationCard");
  card.innerHTML = `
    ${generateEditField("case_name", "Case Name", citation.case_name)}
    ${generateEditField("citation", "Citation", citation.citation)}
    ${generateEditField("year", "Year", citation.year)}
    ${generateEditField("court", "Court", citation.court)}
    ${generateEditField("jurisdiction", "Jurisdiction", citation.jurisdiction)}
    ${generateEditField("summary", "Summary", citation.summary)}
    ${generateEditField("legal_principle", "Legal Principle", citation.legal_principle)}
    ${generateEditField("holding", "Holding", citation.holding)}
    ${generateEditField("compliance_flags", "Compliance Flags (comma-separated)", citation.compliance_flags.join(", "))}
    ${generateEditField("key_points", "Key Points (comma-separated)", citation.key_points.join(", "))}
    ${generateEditField("tags", "Tags (comma-separated)", citation.tags.join(", "))}
    ${generateEditField("case_link", "Case Link", citation.case_link)}
    ${generateEditField("full_case_text", "Full Case Text", citation.full_case_text, true)}
    <label><strong>Printable:</strong> 
      <select id="printable">
        <option value="true" ${citation.printable ? "selected" : ""}>Yes</option>
        <option value="false" ${!citation.printable ? "selected" : ""}>No</option>
      </select>
    </label><br><br>
    <button onclick="saveCitation()">Save</button>
    <button onclick="displayCitation(currentIndex)">Cancel</button>
  `;
}

function generateEditField(id, label, value, isTextarea = false) {
  if (isTextarea) {
    return `<label><strong>${label}:</strong><br><textarea id="${id}" rows="6" style="width:100%;">${value || ""}</textarea></label><br><br>`;
  } else {
    return `<label><strong>${label}:</strong><br><input type="text" id="${id}" value="${value || ""}" style="width:100%;" /></label><br><br>`;
  }
}

function saveCitation() {
  const citation = citations[currentIndex];
  citation.case_name = document.getElementById("case_name").value;
  citation.citation = document.getElementById("citation").value;
  citation.year = parseInt(document.getElementById("year").value);
  citation.court = document.getElementById("court").value;
  citation.jurisdiction = document.getElementById("jurisdiction").value;
  citation.summary = document.getElementById("summary").value;
  citation.legal_principle = document.getElementById("legal_principle").value;
  citation.holding = document.getElementById("holding").value;
  citation.compliance_flags = document.getElementById("compliance_flags").value.split(",").map(s => s.trim());
  citation.key_points = document.getElementById("key_points").value.split(",").map(s => s.trim());
  citation.tags = document.getElementById("tags").value.split(",").map(s => s.trim());
  citation.case_link = document.getElementById("case_link").value;
  citation.full_case_text = document.getElementById("full_case_text").value;
  citation.printable = document.getElementById("printable").value === "true";
  displayCitation(currentIndex);
}

function deleteCitation() {
  if (!confirm("Are you sure you want to delete this citation?")) return;
  citations.splice(currentIndex, 1);
  if (citations.length === 0) {
    document.getElementById("citationCard").innerHTML = "<p>No citations remaining.</p>";
    return;
  }
  currentIndex = Math.min(currentIndex, citations.length - 1);
  displayCitation(currentIndex);
}

// Initialize on page load
window.onload = loadCitations;
