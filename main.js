document.addEventListener('DOMContentLoaded', () => {
  const citationContainer = document.getElementById('citation-container');
  const breachFilter = document.getElementById('breach-filter');
  const searchInput = document.getElementById('search-input');
  let citations = [];
  let breaches = [];

  // Load citations and breaches
  Promise.all([
    fetch('data/citations/citations.json').then(res => res.json()),
    fetch('data/breaches/breaches.json').then(res => res.json())
  ])
  .then(([citationData, breachData]) => {
    citations = citationData;
    breaches = breachData;
    populateBreachFilter();
    displayCitations(citations);
  });

  function populateBreachFilter() {
    breaches.forEach(breach => {
      const option = document.createElement('option');
      option.value = breach.tag.toLowerCase();
      option.textContent = breach.tag;
      breachFilter.appendChild(option);
    });
  }

  function displayCitations(data) {
    citationContainer.innerHTML = '';
    data.forEach(citation => {
      const div = document.createElement('div');
      div.className = 'citation-card';
      div.innerHTML = `
        <p><strong>Case Name:</strong> ${citation.case_name}</p>
        <p><strong>Citation:</strong> ${citation.citation}</p>
        <p><strong>Year:</strong> ${citation.year}</p>
        <p><strong>Court:</strong> ${citation.court}</p>
        <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
        <p><strong>Summary:</strong> ${citation.summary}</p>
        <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}</p>
        <button onclick="window.print()">Print</button>
        <button onclick="exportText('${citation.case_name}', \`${citation.summary}\`)">Export as .txt</button>
      `;
      citationContainer.appendChild(div);
    });
  }

  function getAliasTerms(tag) {
    const breach = breaches.find(b => b.tag.toLowerCase() === tag.toLowerCase());
    if (!breach) return [];
    return [breach.tag.toLowerCase(), ...breach.aliases.map(a => a.toLowerCase())];
  }

  function matchesFilter(citation, filterTerms) {
    return citation.compliance_flags?.some(flag => {
      const normalized = flag.toLowerCase().split(/\W+/).join(' ');
      return filterTerms.some(term => normalized.includes(term));
    });
  }

  function matchesKeyword(citation, keyword) {
    const lowerKeyword = keyword.toLowerCase();
    return citation.case_name.toLowerCase().includes(lowerKeyword) ||
           citation.summary.toLowerCase().includes(lowerKeyword) ||
           citation.compliance_flags?.some(flag => {
             const normalized = flag.toLowerCase().split(/\W+/).join(' ');
             return normalized.includes(lowerKeyword);
           });
  }

  function applyFilters() {
    const selectedTag = breachFilter.value;
    const keyword = searchInput.value.trim();
    const filterTerms = selectedTag ? getAliasTerms(selectedTag) : [];

    const filtered = citations.filter(citation => {
      const matchFilter = filterTerms.length ? matchesFilter(citation, filterTerms) : true;
      const matchKeyword = keyword ? matchesKeyword(citation, keyword) : true;
      return matchFilter && matchKeyword;
    });

    displayCitations(filtered);
  }

  breachFilter.addEventListener('change', applyFilters);
  searchInput.addEventListener('keyup', applyFilters);
});

function exportText(caseName, content) {
  const blob = new Blob([caseName + '\n\n' + content], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = caseName.replace(/\s+/g, '_') + '.txt';
  link.click();
}
