let citations = [];
let breaches = [];
let aliasToCanonical = {};

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, '');
}

async function loadData() {
  try {
    const [citationsRes, breachesRes] = await Promise.all([
      fetch('citations.json'),
      fetch('breaches.json')
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
    aliasToCanonical[normalize(breach.tag)] = breach.tag;
    breach.aliases.forEach(alias => {
      aliasToCanonical[normalize(alias)] = breach.tag;
    });
  });
}

function matchBreachAlias(input) {
  return aliasToCanonical[normalize(input)] || null;
}

function displayCitations(data) {
  const container = document.getElementById('citation-container');
  container.innerHTML = '';

  data.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'citation-card';

    card.innerHTML = `
      <h3>Case Name: ${entry.case_name}</h3>
      <p><strong>Citation:</strong> ${entry.citation}</p>
      <p><strong>Year:</strong> ${entry.year}</p>
      <p><strong>Court:</strong> ${entry.court}</p>
      <p><strong>Jurisdiction:</strong> ${entry.jurisdiction}</p>
      <p><strong>Summary:</strong> ${entry.summary}</p>
      <p><strong>Compliance Flags:</strong> ${entry.compliance_flags.join(', ')}</p>
      <button onclick="window.print()">Print</button>
      <button onclick="exportCitation(${JSON.stringify(entry).replace(/"/g, '&quot;')})">Export as .txt</button>
    `;
    container.appendChild(card);
  });
}

function exportCitation(citation) {
  const content = `Case Name: ${citation.case_name}
Citation: ${citation.citation}
Year: ${citation.year}
Court: ${citation.court}
Jurisdiction: ${citation.jurisdiction}
Summary: ${citation.summary}
Compliance Flags: ${citation.compliance_flags.join(', ')}`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${citation.case_name.replace(/\s+/g, '_')}.txt`;
  a.click();

  URL.revokeObjectURL(url);
}

document.getElementById('search-input').addEventListener('input', (e) => {
  const keyword = e.target.value.trim().toLowerCase();
  const mapped = matchBreachAlias(keyword);

  const results = citations.filter(c =>
    c.case_name.toLowerCase().includes(keyword) ||
    c.summary.toLowerCase().includes(keyword) ||
    c.compliance_flags.some(flag =>
      flag.toLowerCase().includes(keyword) ||
      (mapped && normalize(flag) === normalize(mapped))
    )
  );

  displayCitations(results);
});

document.getElementById('breach-filter').addEventListener('change', (e) => {
  const value = e.target.value;
  const filtered = value
    ? citations.filter(c => c.compliance_flags.includes(value))
    : citations;
  displayCitations(filtered);
});

loadData();
