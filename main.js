let currentIndex = 0;
let citations = [];

// Fetch citations from citations.json
fetch('./citations.json')
  .then(response => {
    if (!response.ok) throw new Error("Network response was not ok");
    return response.json();
  })
  .then(data => {
    citations = data;
    displayCitation(currentIndex);
  })
  .catch(error => {
    console.error("Error loading citations.json", error);
  });

// Display a citation based on index
function displayCitation(index) {
  const citation = citations[index];
  const container = document.getElementById('citationCard');
  if (!citation || !container) return;

  container.innerHTML = `
    <h2>${citation.case_name} (${citation.year})</h2>
    <p><strong>Citation:</strong> ${citation.citation}</p>
    <p><strong>Court:</strong> ${citation.court}</p>
    <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
    <p><strong>Summary:</strong> ${citation.summary}</p>
    <p><strong>Legal Principle:</strong> ${citation.legal_principle}</p>
    <p><strong>Holding:</strong> ${citation.holding}</p>
    <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}</p>
    <p><strong>Key Points:</strong> ${citation.key_points.join(', ')}</p>
    <p><strong>Tags:</strong> ${citation.tags.join(', ')}</p>
    <p><strong>Case Link:</strong> ${citation.case_link ? `<a href="${citation.case_link}" target="_blank">View Case</a>` : 'N/A'}</p>
    <p><strong>Full Text:</strong><br><pre>${citation.full_case_text || '—'}</pre></p>
    <p><strong>Printable:</strong> ${citation.printable ? 'Yes' : 'No'}</p>
    <button onclick="editCitation(${index})">Edit</button>
    <button onclick="deleteCitation(${index})">Delete</button>
  `;
}

// Prev/Next handlers
function showPrevious() {
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

// Print citation card
function printCitation() {
  const content = document.getElementById('citationCard').innerHTML;
  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(`<html><head><title>Print</title></head><body>${content}</body></html>`);
  printWindow.document.close();
  printWindow.print();
}

// Export citation card as text
function exportCitation() {
  const citation = citations[currentIndex];
  const blob = new Blob([JSON.stringify(citation, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${citation.case_name.replace(/ /g, '_')}.json`;
  link.click();
}

// Edit handler
function editCitation(index) {
  const citation = citations[index];
  const fields = [
    "case_name", "citation", "court", "jurisdiction", "summary", "legal_principle",
    "holding", "compliance_flags", "key_points", "tags", "case_link", "full_case_text", "printable"
  ];

  const container = document.getElementById('citationCard');
  let formHTML = `<h3>Edit Citation</h3>`;
  fields.forEach(field => {
    const value = Array.isArray(citation[field]) ? citation[field].join(', ') : citation[field];
    const inputType = field === "full_case_text" ? "textarea" : "input";
    formHTML += `
      <label for="${field}">${field}:</label><br>
      ${inputType === "textarea"
        ? `<textarea id="${field}" rows="6" style="width:100%">${value || ''}</textarea>`
        : `<input id="${field}" value="${value || ''}" style="width:100%"/><br>`
      }<br>`;
  });

  formHTML += `<button onclick="saveCitation(${index})">Save</button>`;

  container.innerHTML = formHTML;
}

// Save changes from edit
function saveCitation(index) {
  const fields = [
    "case_name", "citation", "court", "jurisdiction", "summary", "legal_principle",
    "holding", "compliance_flags", "key_points", "tags", "case_link", "full_case_text", "printable"
  ];

  fields.forEach(field => {
    const element = document.getElementById(field);
    const value = element.value.trim();
    if (["compliance_flags", "key_points", "tags"].includes(field)) {
      citations[index][field] = value ? value.split(',').map(v => v.trim()) : [];
    } else if (field === "printable") {
      citations[index][field] = value.toLowerCase() === 'yes';
    } else {
      citations[index][field] = value;
    }
  });

  displayCitation(index);
}

// Delete handler (removes from array and redisplays)
function deleteCitation(index) {
  if (confirm("Are you sure you want to delete this citation?")) {
    citations.splice(index, 1);
    if (currentIndex >= citations.length) currentIndex = citations.length - 1;
    displayCitation(currentIndex);
  }
}
