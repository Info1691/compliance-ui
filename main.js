let breaches = [];

fetch('data/breaches/breaches.json')
  .then(response => response.json())
  .then(data => {
    breaches = data;
    const breachFilter = document.getElementById('breachFilter');
    data.forEach(entry => {
      const option = document.createElement('option');
      option.value = entry.tag;
      option.textContent = entry.tag;
      breachFilter.appendChild(option);
    });
  });

fetch('citations.json')
  .then(response => response.json())
  .then(citations => {
    const container = document.getElementById('citationsContainer');

    function renderCards(filtered) {
      container.innerHTML = '';
      filtered.forEach(citation => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <strong>Case Name:</strong> ${citation.case_name}<br>
          <strong>Citation:</strong> ${citation.citation}<br>
          <strong>Year:</strong> ${citation.year}<br>
          <strong>Court:</strong> ${citation.court}<br>
          <strong>Jurisdiction:</strong> ${citation.jurisdiction}<br>
          <strong>Summary:</strong> ${citation.summary}<br>
          <strong>Legal Principle:</strong> ${citation.legal_principle}<br>
          <strong>Holding:</strong> ${citation.holding}<br>
          <strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}<br>
          <strong>Key Points:</strong> ${citation.key_points.join(', ')}<br>
          <strong>Tags:</strong> ${citation.tags.join(', ')}<br>
          <strong>Case Link:</strong> ${citation.case_link ? `<a href="${citation.case_link}" target="_blank">View Case</a>` : 'N/A'}<br>
          <strong>Full Text:</strong><br><pre>${citation.full_case_text || ''}</pre>
          <br>
          <button onclick="editEntry(${JSON.stringify(citation).replace(/"/g, '&quot;')})">Edit</button>
          <button onclick="printEntry(\`${formatTxt(citation)}\`)">Print</button>
          <button onclick="exportTxt(\`${formatTxt(citation)}\`)">Export as .txt</button>
        `;
        container.appendChild(card);
      });
    }

    function formatTxt(c) {
      return `Case: ${c.case_name}\nCitation: ${c.citation}\nYear: ${c.year}\nCourt: ${c.court}\nJurisdiction: ${c.jurisdiction}\n\nSummary:\n${c.summary}\n\nLegal Principle:\n${c.legal_principle}\n\nHolding:\n${c.holding}\n\nCompliance Flags: ${c.compliance_flags.join(', ')}\nKey Points: ${c.key_points.join(', ')}\nTags: ${c.tags.join(', ')}\nCase Link: ${c.case_link}\n\nFull Text:\n${c.full_case_text || ''}`;
    }

    document.getElementById('breachFilter').addEventListener('change', function () {
      const selected = this.value;
      const filtered = selected
        ? citations.filter(c => c.compliance_flags.includes(selected))
        : citations;
      renderCards(filtered);
    });

    renderCards(citations);
  });

function printEntry(txt) {
  const win = window.open('', '_blank');
  win.document.write(`<pre>${txt}</pre>`);
  win.print();
  win.close();
}

function exportTxt(content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'citation.txt';
  a.click();
}

function editEntry(data) {
  alert("Edit modal placeholder.\n\nNo save logic active.\n\nYou may edit fields in future versions.");
}
