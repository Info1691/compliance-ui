let currentIndex = 0;
let citations = [];

async function loadCitations() {
  const response = await fetch('citations.json');
  citations = await response.json();
  renderCitation();
}

function renderCitation() {
  const container = document.getElementById('citation-container');
  container.innerHTML = '';
  if (citations.length === 0) {
    container.innerHTML = '<p>No citations available.</p>';
    return;
  }

  const data = citations[currentIndex];
  const card = document.createElement('div');
  card.className = 'citation-card';

  card.innerHTML = `
    <h2>${data.case_name} (${data.year})</h2>
    <p><strong>Citation:</strong> ${data.citation}</p>
    <p><strong>Court:</strong> ${data.court}</p>
    <p><strong>Jurisdiction:</strong> ${data.jurisdiction}</p>
    <p><strong>Summary:</strong> ${data.summary}</p>
    <p><strong>Legal Principle:</strong> ${data.legal_principle}</p>
    <p><strong>Holding:</strong> ${data.holding}</p>
    <p><strong>Compliance Flags:</strong> ${data.compliance_flags.join(', ')}</p>
    <p><strong>Key Points:</strong> ${data.key_points.join(', ')}</p>
    <p><strong>Tags:</strong> ${data.tags.join(', ')}</p>
    <p><strong>Case Link:</strong> ${data.case_link || 'N/A'}</p>
    <p><strong>Printable:</strong> ${data.printable ? 'Yes' : 'No'}</p>
  `;

  container.appendChild(card);
}

function prevCitation() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCitation();
  }
}

function nextCitation() {
  if (currentIndex < citations.length - 1) {
    currentIndex++;
    renderCitation();
  }
}

function printCitation() {
  window.print();
}

function exportCitation() {
  const citation = citations[currentIndex];
  const blob = new Blob([JSON.stringify(citation, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${citation.id || 'citation'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function editCitation() {
  const fields = ['case_name', 'citation', 'court', 'jurisdiction', 'summary', 'legal_principle', 'holding'];
  const citation = citations[currentIndex];
  for (let key of fields) {
    const newValue = prompt(`Edit ${key}:`, citation[key]);
    if (newValue !== null) citation[key] = newValue;
  }
  renderCitation();
}

function deleteCitation() {
  if (confirm('Are you sure you want to delete this citation?')) {
    citations.splice(currentIndex, 1);
    if (currentIndex >= citations.length) currentIndex = citations.length - 1;
    renderCitation();
  }
}

window.onload = loadCitations;
