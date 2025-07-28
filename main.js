let citations = [];
let breaches = [];
let aliasToCanonical = {};

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, '');
}

async function loadData() {
  try {
    const [citationsRes, breachesRes] = await Promise.all([
      fetch('data/citations/citations.json'),
      fetch('data/breaches/breaches.json')
    ]);

    citations = await citationsRes.json();
    breaches = await breachesRes.json();

    populateBreachDropdown();
    buildAliasMap();
    displayCitations(citations);
  } catch (err) {
    console.error("Error loading data:", err);
    document.getElementById('citation-container').innerHTML =
      '<p>Error loading citations or breaches.</p>';
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
    if (breach.aliases) {
      breach.aliases.forEach(alias => {
        aliasToCanonical[normalize(alias)] = breach.tag;
      });
    }
  });
}

function displayCitations(citationList) {
  const container = document.getElementById('citation-container');
  container.innerHTML = '';
  citationList.forEach(citation => {
    const div = document.createElement('div');
    div.className = 'citation-card';
    div.innerHTML = `
      <h3>${citation.case_name} (${citation.year})</h3>
      <p><strong>Citation:</strong> ${citation.citation}</p>
      <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
      <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}</p>
      <p><strong>Summary:</strong> ${citation.summary}</p>
    `;
    container.appendChild(div);
  });
}

function filterCitations() {
  const selectedBreach = document.getElementById('breach-filter').value;
  const searchText = normalize(document.getElementById('search-input').value);

  const filtered = citations.filter(citation => {
    const matchBreach = !selectedBreach || citation.compliance_flags.includes(selectedBreach);
    const matchText = !searchText || (
      citation.case_name.toLowerCase().includes(searchText) ||
      citation.summary.toLowerCase().includes(searchText) ||
      citation.jurisdiction.toLowerCase().includes(searchText) ||
      citation.compliance_flags.some(flag => normalize(flag).includes(searchText))
    );
    return matchBreach && matchText;
  });

  displayCitations(filtered);
}

document.getElementById('breach-filter').addEventListener('change', filterCitations);
document.getElementById('search-input').addEventListener('input', filterCitations);

window.onload = loadData;
