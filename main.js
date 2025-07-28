let citations = [];
let breaches = [];
let aliasToCanonical = {};

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, '');
}

async function loadData() {
  try {
    const [citationsRes, breachesRes] = await Promise.all([
      fetch('data/breaches/citations.json'),
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
    const canonical = breach.tag;
    breach.aliases.forEach(alias => {
      aliasToCanonical[normalize(alias)] = canonical;
    });
    aliasToCanonical[normalize(canonical)] = canonical;
  });
}

function displayCitations(citationsToDisplay) {
  const container = document.getElementById('citation-container');
  container.innerHTML = '';

  citationsToDisplay.forEach(citation => {
    const card = document.createElement('div');
    card.className = 'citation-card';

    card.innerHTML = `
      <h3>${citation.case_name}</h3>
      <p><strong>Citation:</strong> ${citation.citation}</p>
      <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
      <p><strong>Year:</strong> ${citation.year}</p>
      <p><strong>Court:</strong> ${citation.court}</p>
      <p><strong>Summary:</strong> ${citation.summary}</p>
      <p><strong>Legal Principle:</strong> ${citation.legal_principle}</p>
      <p><strong>Holding:</strong> ${citation.holding}</p>
      <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}</p>
      <p><strong>Tags:</strong> ${citation.tags.join(', ')}</p>
    `;

    container.appendChild(card);
  });
}

function filterCitations() {
  const dropdown = document.getElementById('breach-filter');
  const searchInput = document.getElementById('search-input');
  const selectedTag = dropdown.value;
  const searchText = normalize(searchInput.value);

  const filtered = citations.filter(citation => {
    const matchesTag = selectedTag === '' || citation.compliance_flags.includes(selectedTag);
    const matchesSearch = searchText === '' || (
      normalize(citation.case_name).includes(searchText) ||
      normalize(citation.summary).includes(searchText) ||
      citation.tags.some(tag => normalize(tag).includes(searchText)) ||
      citation.compliance_flags.some(flag => {
        const canonical = aliasToCanonical[normalize(flag)];
        return canonical && normalize(canonical).includes(searchText);
      })
    );
    return matchesTag && matchesSearch;
  });

  displayCitations(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();

  document.getElementById('breach-filter').addEventListener('change', filterCitations);
  document.getElementById('search-input').addEventListener('input', filterCitations);
});
