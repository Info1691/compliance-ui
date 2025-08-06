let citations = [];
let breaches = [];
let aliasToCanonical = {};

function normalize(text) {
  return text.toLowerCase().replace(/\s*/g, '');
}

async function loadData() {
  try {
    const [citationsRes, breachesRes] = await Promise.all([
      fetch('data/citations/citations.json'),  // ✅ Corrected path
      fetch('data/breaches/breaches.json')     // ✅ Local path, not external GitHub Pages
    ]);

    if (!citationsRes.ok || !breachesRes.ok) {
      throw new Error('Failed to fetch one or more data files');
    }

    citations = await citationsRes.json();
    breaches = await breachesRes.json();

    console.log(`Loaded ${citations.length} citations and ${breaches.length} breach tags.`);

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
  dropdown.innerHTML = '<option value="all">← All Breaches →</option>';

  breaches.forEach(breach => {
    const option = document.createElement('option');
    option.value = breach.tag;
    option.textContent = breach.tag;
    dropdown.appendChild(option);
  });

  dropdown.addEventListener('change', filterCitations);
}

function buildAliasMap() {
  aliasToCanonical = {};
  breaches.forEach(breach => {
    aliasToCanonical[normalize(breach.tag)] = breach.tag;
    if (breach.aliases) {
      breach.aliases.forEach(alias => {
        aliasToCanonical[normalize(alias)] = breach.tag;
      });
    }
  });
}

function filterCitations() {
  const selectedTag = document.getElementById('breach-filter').value;
  const searchKeyword = document.getElementById('keyword-search')?.value?.toLowerCase() || '';

  const filtered = citations.filter(citation => {
    const matchesTag =
      selectedTag === 'all' ||
      citation.compliance_flags?.includes(selectedTag);
    const matchesKeyword =
      citation.case_name?.toLowerCase().includes(searchKeyword) ||
      citation.summary?.toLowerCase().includes(searchKeyword) ||
      citation.legal_principle?.toLowerCase().includes(searchKeyword);
    return matchesTag && matchesKeyword;
  });

  displayCitations(filtered);
}

function displayCitations(list) {
  const container = document.getElementById('citation-container');
  container.innerHTML = '';

  if (!list.length) {
    container.innerHTML = '<p>No matching citations found.</p>';
    return;
  }

  list.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'citation-card';
    card.innerHTML = `
      <h3>${entry.case_name}</h3>
      <p><strong>Citation:</strong> ${entry.citation}</p>
      <p><strong>Jurisdiction:</strong> ${entry.jurisdiction}</p>
      <p><strong>Summary:</strong> ${entry.summary}</p>
      <p><strong>Compliance Flags:</strong> ${entry.compliance_flags?.join(', ') || 'None'}</p>
    `;
    container.appendChild(card);
  });
}

// Kick off
window.addEventListener('DOMContentLoaded', loadData);
