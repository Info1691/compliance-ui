let citations = [];
let breaches = [];

async function loadCitations() {
  try {
    const response = await fetch('data/citations/citations.json');
    if (!response.ok) throw new Error('Failed to load citations');
    citations = await response.json();
    renderCitations(citations);
  } catch (error) {
    console.error('Error loading citations:', error);
    document.getElementById('citationsContainer').innerHTML = '<p>Error loading citations.</p>';
  }
}

function renderCitations(citations) {
  const container = document.getElementById('citationsContainer');
  container.innerHTML = '';
  if (!citations.length) {
    container.innerHTML = '<p>No citations found.</p>';
    return;
  }

  citations.forEach(citation => {
    const card = document.createElement('div');
    card.className = 'citation-card';
    card.innerHTML = `
      <h3>${citation.case_name}</h3>
      <p><strong>Citation:</strong> ${citation.citation}</p>
      <p><strong>Year:</strong> ${citation.year}</p>
      <p><strong>Court:</strong> ${citation.court}</p>
      <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
      <p><strong>Summary:</strong> ${citation.summary}</p>
      <p><strong>Legal Principle:</strong> ${citation.legal_principle}</p>
      <p><strong>Holding:</strong> ${citation.holding}</p>
      <p><strong>Compliance Flags:</strong> ${citation.compliance_flags?.join(', ')}</p>
      <p><strong>Canonical Breach Tag:</strong> ${citation.canonical_breach_tag}</p>
    `;
    container.appendChild(card);
  });
}

window.addEventListener('DOMContentLoaded', loadCitations);
