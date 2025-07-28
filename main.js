let citations = [];
let breaches = [];
let aliasToCanonical = {};

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, '');
}

async function loadData() {
  try {
    const [citationsRes, breachesRes] = await Promise.all([
      fetch('data/citations.json'),
      fetch('data/breaches/breaches.json')
    ]);

    citations = await citationsRes.json();
    breaches = await breachesRes.json();

    populateBreachDropdown();
    buildAliasMap();
    displayCitations(citations);
  } catch (err) {
    console.error("Error loading data:", err);
    document.getElementById('citation-container').innerHTML = '<p>Error loading citations or breaches.</p>';
  }
}

function populateBreachDropdown() {
  const dropdown = document.getElementById('breach-filter');
  breaches.forEach(breach => {
    const option = document.createElement('option');
    option.value = breach.tag;
    option.textContent = breach.tag;
    dropdown.appendChild(option);
  });
}

function buildAliasMap() {
  breaches.forEach(breach => {
    const canonical = normalize(breach.tag);
    aliasToCanonical[canonical] = breach.tag;
    breach.aliases.forEach(alias => {
      aliasToCanonical[normalize(alias)] = breach.tag;
    });
  });
}

function displayCitations(filteredCitations) {
  const container = document.getElementById('citation-container');
  container.innerHTML = '';

  filteredCitations.forEach(citation => {
    const card = document.createElement('div');
    card.className = 'citation-card';

    card.innerHTML = `
      <p><strong>Case Name:</strong> ${citation.case_name}</p>
      <p><strong>Citation:</strong> ${citation.citation}</p>
      <p><strong>Year:</strong> ${citation.year}</p>
      <p><strong>Court:</strong> ${citation.court}</p>
      <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
      <p><strong>Summary:</strong> ${citation.summary}</p>
      <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}</p>
      <button onclick="printCitation('${citation.id}')">Print</button>
      <button onclick="exportCitation('${citation.id}')">Export as .txt</button>
    `;

    container.appendChild(card);
  });
}

function printCitation(id) {
  const citation = citations.find(c => c.id === id);
  if (!citation) return;

  const content = `
Case Name: ${citation.case_name}
Citation: ${citation.citation}
Year: ${citation.year}
Court: ${citation.court}
Jurisdiction: ${citation.jurisdiction}
Summary: ${citation.summary}
Compliance Flags: ${citation.compliance_flags.join(', ')}
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write('<pre>' + content + '</pre>');
  printWindow.document.close();
  printWindow.print();
}

function exportCitation(id) {
  const citation = citations.find(c => c.id === id);
  if (!citation) return;

  const content = `
Case Name: ${citation.case_name}
Citation: ${citation.citation}
Year: ${citation.year}
Court: ${citation.court}
Jurisdiction: ${citation.jurisdiction}
Summary: ${citation.summary}
Compliance Flags: ${citation.compliance_flags.join(', ')}
  `;

  const blob = new Blob([content], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${citation.id}.txt`;
  link.click();
}

document.getElementById('breach-filter').addEventListener('change', function () {
  const selected = this.value;
  if (!selected) {
    displayCitations(citations);
  } else {
    const filtered = citations.filter(c =>
      c.compliance_flags.includes(selected)
    );
    displayCitations(filtered);
  }
});

document.getElementById('search-input').addEventListener('input', function () {
  const query = normalize(this.value);
  if (!query) {
    displayCitations(citations);
    return;
  }

  const canonicalTag = aliasToCanonical[query];

  const filtered = citations.filter(citation =>
    citation.case_name.toLowerCase().includes(query) ||
    citation.summary.toLowerCase().includes(query) ||
    citation.compliance_flags.some(flag =>
      normalize(flag) === query || normalize(flag) === canonicalTag
    )
  );

  displayCitations(filtered);
});

loadData();
