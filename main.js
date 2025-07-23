let currentIndex = 0;
let allCitations = [];

function renderCitation(index) {
  const entry = allCitations[index];
  const container = document.getElementById('container');
  container.innerHTML = ''; // clear previous

  if (!entry) {
    container.innerHTML = '<p>No citation here.</p>';
    return;
  }

  const html = `
    <h2>${entry.case_name} (${entry.year})</h2>
    <p><strong>Citation:</strong> ${entry.citation}</p>
    <p><strong>Court:</strong> ${entry.court}</p>
    <p><strong>Jurisdiction:</strong> ${entry.jurisdiction}</p>
    <p><strong>Summary:</strong> ${entry.summary}</p>
    <p><strong>Legal Principle:</strong> ${entry.legal_principle}</p>
    <p><strong>Holding:</strong> ${entry.holding}</p>
    <p><strong>Compliance Flags:</strong> ${entry.compliance_flags.join(', ')}</p>
    <p><strong>Key Points:</strong> ${entry.key_points.join(', ')}</p>
    <p><strong>Tags:</strong> ${entry.tags.join(', ')}</p>
    <p><strong>Case Link:</strong> ${entry.case_link || 'N/A'}</p>
    <p><strong>Printable:</strong> ${entry.printable ? 'Yes' : 'No'}</p>
  `;

  const card = document.createElement('div');
  card.className = 'citation-card';
  card.innerHTML = html;
  container.appendChild(card);
}

window.onload = () => {
  fetch('citations.json')
    .then(r => r.json())
    .then(data => {
      allCitations = data;
      renderCitation(currentIndex);
    })
    .catch(e => {
      document.getElementById('container').innerHTML = `<pre style="color:red">${e}</pre>`;
    });

  document.getElementById('prevBtn').onclick = () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderCitation(currentIndex);
    }
  };
  document.getElementById('nextBtn').onclick = () => {
    if (currentIndex < allCitations.length - 1) {
      currentIndex++;
      renderCitation(currentIndex);
    }
  };
};
