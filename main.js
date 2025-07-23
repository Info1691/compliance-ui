let currentData = [];

window.onload = async () => {
  await loadCitations();
  setupEventListeners();
};

async function loadCitations() {
  try {
    const response = await fetch('citations.json');
    currentData = await response.json();
    renderCards(currentData);
  } catch (error) {
    console.error('Failed to load citation data:', error);
  }
}

function renderCards(data) {
  const container = document.getElementById('cardsContainer');
  container.innerHTML = '';
  data.forEach(citation => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${citation.case_name} (${citation.year})</h3>
      <p><strong>Citation:</strong> ${citation.citation}</p>
      <p><strong>Court:</strong> ${citation.court}</p>
      <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
      <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}</p>
      <p><strong>Tags:</strong> ${citation.tags.join(', ')}</p>
      <details>
        <summary><strong>Details</strong></summary>
        <p><strong>Summary:</strong> ${citation.summary}</p>
        <p><strong>Legal Principle:</strong> ${citation.legal_principle}</p>
        <p><strong>Holding:</strong> ${citation.holding}</p>
        <p><strong>Key Points:</strong> ${citation.key_points.join(', ')}</p>
        <p><strong>Full Text:</strong></p>
        <div class="full-text">${citation.full_case_text}</div>
        ${citation.case_link ? `<p><a href="${citation.case_link}" target="_blank">View Case</a></p>` : ''}
        <p><strong>Printable:</strong> ${citation.printable ? 'Yes' : 'No'}</p>
      </details>
      <button onclick="openEditModal('${citation.id}')">Edit</button>
    `;
    container.appendChild(card);
  });
}

function openEditModal(id) {
  const citation = currentData.find(c => c.id === id);
  if (!citation) return;

  document.getElementById('editId').value = citation.id;
  document.getElementById('editCaseName').value = citation.case_name;
  document.getElementById('editCitation').value = citation.citation;
  document.getElementById('editYear').value = citation.year;
  document.getElementById('editCourt').value = citation.court;
  document.getElementById('editJurisdiction').value = citation.jurisdiction;
  document.getElementById('editSummary').value = citation.summary;
  document.getElementById('editLegalPrinciple').value = citation.legal_principle;
  document.getElementById('editHolding').value = citation.holding;
  document.getElementById('editFlags').value = citation.compliance_flags.join(', ');
  document.getElementById('editKeyPoints').value = citation.key_points.join(', ');
  document.getElementById('editTags').value = citation.tags.join(', ');
  document.getElementById('editCaseLink').value = citation.case_link || '';
  document.getElementById('editFullText').value = citation.full_case_text;
  document.getElementById('editPrintable').value = citation.printable.toString();

  document.getElementById('editModal').classList.remove('hidden');
}

function setupEventListeners() {
  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('editModal').classList.add('hidden');
  });

  document.getElementById('editForm').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const citation = currentData.find(c => c.id === id);
    if (!citation) return;

    citation.case_name = document.getElementById('editCaseName').value;
    citation.citation = document.getElementById('editCitation').value;
    citation.year = parseInt(document.getElementById('editYear').value);
    citation.court = document.getElementById('editCourt').value;
    citation.jurisdiction = document.getElementById('editJurisdiction').value;
    citation.summary = document.getElementById('editSummary').value;
    citation.legal_principle = document.getElementById('editLegalPrinciple').value;
    citation.holding = document.getElementById('editHolding').value;
    citation.compliance_flags = parseList('editFlags');
    citation.key_points = parseList('editKeyPoints');
    citation.tags = parseList('editTags');
    citation.case_link = document.getElementById('editCaseLink').value;
    citation.full_case_text = document.getElementById('editFullText').value;
    citation.printable = document.getElementById('editPrintable').value === 'true';

    document.getElementById('editModal').classList.add('hidden');
    renderCards(currentData);
  });

  document.getElementById('searchBox').addEventListener('input', e => {
    const query = e.target.value.toLowerCase();
    const filtered = currentData.filter(entry =>
      entry.case_name.toLowerCase().includes(query) ||
      entry.jurisdiction.toLowerCase().includes(query) ||
      entry.compliance_flags.join(' ').toLowerCase().includes(query)
    );
    renderCards(filtered);
  });
}

function parseList(id) {
  return document.getElementById(id).value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}
