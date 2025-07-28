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
  breaches.forEach(breach => {
    const canonical = breach.tag;
    breach.aliases.forEach(alias => {
      aliasToCanonical[normalize(alias)] = canonical;
    });
    aliasToCanonical[normalize(canonical)] = canonical;
  });
}

function displayCitations(filtered) {
  const container = document.getElementById('citation-container');
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<p>No citations match the selected filters.</p>';
    return;
  }

  filtered.forEach(citation => {
    const card = document.createElement('div');
    card.className = 'citation-card';

    card.innerHTML = `
      <h3>${citation.case_name} (${citation.year})</h3>
      <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
      <p><strong>Summary:</strong> ${citation.summary}</p>
      <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}</p>
    `;

    container.appendChild(card);
  });
}

function applyFilters() {
  const selected = document.getElementById('breach-filter').value;
  const keyword = document.getElementById('search-input').value.trim().toLowerCase();

  const results = citations.filter(cite => {
    const allFlags = cite.compliance_flags.map(f => normalize(f));
    const matchBreach = !selected || allFlags.includes(normalize(selected)) || allFlags.includes(normalize(aliasToCanonical[selected]));
    const matchKeyword = !keyword || (
      cite.case_name.toLowerCase().includes(keyword) ||
      cite.summary.toLowerCase().includes(keyword)
    );
    return matchBreach && matchKeyword;
  });

  displayCitations(results);
}

document.getElementById('breach-filter').addEventListener('change', applyFilters);
document.getElementById('search-input').addEventListener('input', applyFilters);

// Start
loadData();
