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
  aliasToCanonical = {};
  breaches.forEach(breach => {
    const canonical = normalize(breach.tag);
    aliasToCanonical[canonical] = breach.tag;
    breach.aliases.forEach(alias => {
      aliasToCanonical[normalize(alias)] = breach.tag;
    });
  });
}

function displayCitations(citationsToDisplay) {
  const container = document.getElementById('citation-container');
  container.innerHTML = '';
  citationsToDisplay.forEach(citation => {
    const div = document.createElement('div');
    div.className = 'citation-card';
    div.innerHTML = `
      <h3>${citation.case_name} (${citation.year})</h3>
      <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
      <p><strong>Citation:</strong> ${citation.citation}</p>
      <p><strong>Summary:</strong> ${citation.summary}</p>
      <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}</p>
    `;
    container.appendChild(div);
  });
}

function applyFilters() {
  const breachFilter = document.getElementById('breach-filter').value;
  const searchInput = document.getElementById('search-input').value.trim().toLowerCase();
  const normalizedSearch = normalize(searchInput);

  const filtered = citations.filter(citation => {
    const matchesBreach = !breachFilter || citation.compliance_flags.includes(breachFilter);
    const matchesAlias = !searchInput || citation.compliance_flags.some(flag => {
      return normalize(flag) === normalizedSearch || aliasToCanonical[normalizedSearch] === flag;
    }) || JSON.stringify(citation).toLowerCase().includes(searchInput);
    return matchesBreach && matchesAlias;
  });

  displayCitations(filtered);
}

document.getElementById('breach-filter').addEventListener('change', applyFilters);
document.getElementById('search-input').addEventListener('keyup', applyFilters);

window.onload = loadData;
