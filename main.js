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
    aliasToCanonical[normalize(breach.tag)] = breach.tag;
    breach.aliases.forEach(alias => {
      aliasToCanonical[normalize(alias)] = breach.tag;
    });
  });
}

function displayCitations(filteredCitations) {
  const container = document.getElementById('citation-container');
  container.innerHTML = '';

  if (filteredCitations.length === 0) {
    container.innerHTML = '<p>No citations found.</p>';
    return;
  }

  filteredCitations.forEach(citation => {
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
      <p><strong>Key Points:</strong> ${citation.key_points.join(', ')}</p>
      <p><strong>Tags:</strong> ${citation.tags.join(', ')}</p>
    `;

    container.appendChild(card);
  });
}

document.getElementById('breach-filter').addEventListener('change', function () {
  const selected = this.value;
  if (!selected || selected === "-- All Breaches --") {
    displayCitations(citations);
  } else {
    const filtered = citations.filter(citation =>
      citation.compliance_flags.some(flag =>
        normalize(flag) === normalize(selected) ||
        normalize(flag) in aliasToCanonical && aliasToCanonical[normalize(flag)] === selected
      )
    );
    displayCitations(filtered);
  }
});

document.getElementById('search-input').addEventListener('input', function () {
  const searchTerm = normalize(this.value);
  const filtered = citations.filter(citation =>
    normalize(citation.case_name).includes(searchTerm) ||
    normalize(citation.summary).includes(searchTerm) ||
    citation.tags.some(tag => normalize(tag).includes(searchTerm)) ||
    citation.compliance_flags.some(flag =>
      normalize(flag).includes(searchTerm) ||
      (normalize(flag) in aliasToCanonical && normalize(aliasToCanonical[normalize(flag)]).includes(searchTerm))
    )
  );
  displayCitations(filtered);
});

window.onload = loadData;
