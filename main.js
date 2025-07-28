let citations = [];
let breaches = [];

async function loadData() {
  const citationsRes = await fetch('citations.json');
  citations = await citationsRes.json();

  const breachesRes = await fetch('data/breaches/breaches.json');
  breaches = await breachesRes.json();

  populateDropdown();
  renderCitations(citations);
  renderBreachSummary(citations);
}

function populateDropdown() {
  const dropdown = document.getElementById('breachFilter');
  dropdown.innerHTML = `<option value="">-- All Breaches --</option>`;
  breaches.forEach(breach => {
    const option = document.createElement('option');
    option.value = breach.tag;
    option.textContent = breach.tag;
    dropdown.appendChild(option);
  });
}

function filterAndSearch() {
  const selected = document.getElementById('breachFilter').value.trim().toLowerCase();
  const query = document.getElementById('searchInput').value.trim().toLowerCase();

  let filtered = citations;

  // Filter by dropdown
  if (selected) {
    const breachEntry = breaches.find(b =>
      b.tag.toLowerCase() === selected || b.aliases.some(alias => alias.toLowerCase() === selected)
    );
    if (breachEntry) {
      const matchTerms = [breachEntry.tag.toLowerCase(), ...breachEntry.aliases.map(a => a.toLowerCase())];
      filtered = filtered.filter(cite =>
        cite.compliance_flags.some(flag => matchTerms.includes(flag.toLowerCase()))
      );
    } else {
      filtered = []; // No match
    }
  }

  // Search bar match: loose match across name, summary, flags
  if (query) {
    filtered = filtered.filter(cite =>
      cite.case_name.toLowerCase().includes(query) ||
      cite.summary.toLowerCase().includes(query) ||
      cite.compliance_flags.some(flag => flag.toLowerCase().includes(query))
    );
  }

  renderCitations(filtered);
  renderBreachSummary(filtered);
}

function renderCitations(citationsList) {
  const container = document.getElementById('citationContainer');
  container.innerHTML = '';
  citationsList.forEach(cite => {
    const card = document.createElement('div');
    card.className = 'citation-card';
    card.innerHTML = `
      <p><strong>Case Name:</strong> ${cite.case_name}</p>
      <p><strong>Citation:</strong> ${cite.citation}</p>
      <p><strong>Year:</strong> ${cite.year}</p>
      <p><strong>Court:</strong> ${cite.court}</p>
      <p><strong>Jurisdiction:</strong> ${cite.jurisdiction}</p>
      <p><strong>Summary:</strong> ${cite.summary}</p>
      <p><strong>Legal Principle:</strong> ${cite.legal_principle}</p>
      <p><strong>Holding:</strong> ${cite.holding}</p>
      <p><strong>Compliance Flags:</strong> ${cite.compliance_flags.join(', ')}</p>
      <p><strong>Key Points:</strong> ${cite.key_points}</p>
      <p><strong>Tags:</strong> ${cite.tags.join(', ')}</p>
      <p><strong>Case Link:</strong> ${cite.case_link || 'N/A'}</p>
      <p><strong>Full Text:</strong> ${cite.full_case_text || 'N/A'}</p>
      <div class="actions">
        <button onclick="editCitation('${cite.id}')">Edit</button>
        <button onclick="printCitation('${cite.id}')">Print</button>
        <button onclick="exportCitation('${cite.id}')">Export as .txt</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderBreachSummary(citationsList) {
  const summary = document.getElementById('summaryContainer');
  if (summary) {
    summary.innerHTML = `<p>Showing ${citationsList.length} citation(s).</p>`;
  }
}

function editCitation(id) {
  alert(`Edit functionality is placeholder for citation ID: ${id}`);
}

function printCitation(id) {
  const citation = citations.find(c => c.id === id);
  if (!citation) return;

  const w = window.open();
  w.document.write('<pre>' + JSON.stringify(citation, null, 2) + '</pre>');
  w.document.close();
  w.print();
}

function exportCitation(id) {
  const citation = citations.find(c => c.id === id);
  if (!citation) return;

  const blob = new Blob([JSON.stringify(citation, null, 2)], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${citation.case_name.replace(/\s+/g, '_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// Hook search & dropdown
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  document.getElementById('breachFilter').addEventListener('change', filterAndSearch);
  document.getElementById('searchInput').addEventListener('input', filterAndSearch);
});
