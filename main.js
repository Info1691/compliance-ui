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

    if (!citationsRes.ok || !breachesRes.ok) {
      throw new Error('Failed to fetch data files');
    }

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
  dropdown.innerHTML = '<option value="">-- All Breaches --</option>';
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

function displayCitations(citationList) {
  const container = document.getElementById('citation-container');
  container.innerHTML = '';
  citationList.forEach(citation => {
    const card = document.createElement('div');
    card.className = 'citation-card';
    card.innerHTML = `
      <h3>${citation.case_name}</h3>
      <p><strong>Citation:</strong> ${citation.citation}</p>
      <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
      <p><strong>Summary:</strong> ${citation.summary}</p>
      <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}</p>
    `;
    container.appendChild(card);
  });
}

document.getElementById('breach-filter').addEventListener('change', () => {
  const selectedTag = document.getElementById('breach-filter').value;
  if (!selectedTag) {
    displayCitations(citations);
    return;
  }

  const filtered = citations.filter(citation =>
    citation.compliance_flags.some(flag =>
      aliasToCanonical[normalize(flag)] === selectedTag
    )
  );

  displayCitations(filtered);
});

document.getElementById('keyword-search').addEventListener('input', () => {
  const keyword = normalize(document.getElementById('keyword-search').value);
  const filtered = citations.filter(citation =>
    normalize(citation.summary).includes(keyword) ||
    normalize(citation.case_name).includes(keyword)
  );
  displayCitations(filtered);
});

loadData();
