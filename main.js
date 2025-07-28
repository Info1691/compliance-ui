let citations = [];
let breaches = [];

async function loadData() {
  const citationsRes = await fetch('citations.json');
  citations = await citationsRes.json();

  const breachesRes = await fetch('data/breaches/breaches.json');
  breaches = await breachesRes.json();

  populateBreachFilter();
  renderCitations(citations);
}

function populateBreachFilter() {
  const select = document.getElementById('breachFilter');
  breaches.forEach(breach => {
    const option = document.createElement('option');
    option.value = breach.tag;
    option.textContent = breach.tag;
    select.appendChild(option);
  });
}

function renderCitations(data) {
  const container = document.getElementById('citationsContainer');
  container.innerHTML = '';

  data.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'citation-card';

    div.innerHTML = `
      <p><strong>Case Name:</strong> ${entry.case_name}</p>
      <p><strong>Citation:</strong> ${entry.citation}</p>
      <p><strong>Year:</strong> ${entry.year}</p>
      <p><strong>Court:</strong> ${entry.court}</p>
      <p><strong>Jurisdiction:</strong> ${entry.jurisdiction}</p>
      <p><strong>Summary:</strong> ${entry.summary}</p>
      <p><strong>Compliance Flags:</strong> ${entry.compliance_flags.join(', ')}</p>
      <div class="button-row">
        <button onclick="printCitation(\`${entry.case_name}\`)">Print</button>
        <button onclick="exportText(\`${entry.case_name}\`, \`${entry.summary.replace(/`/g, "'")}\`)">Export as .txt</button>
      </div>
    `;
    container.appendChild(div);
  });
}

function printCitation(caseName) {
  window.print();
}

function exportText(caseName, summary) {
  const blob = new Blob([`${caseName}\n\n${summary}`], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${caseName}.txt`;
  link.click();
}

function matchAlias(breachTag, flags) {
  const found = breaches.find(b => b.tag === breachTag);
  if (!found) return false;
  const allTerms = [found.tag.toLowerCase(), ...found.aliases.map(a => a.toLowerCase())];
  return flags.some(flag => allTerms.includes(flag.toLowerCase()));
}

function filterAndSearch() {
  const selected = document.getElementById('breachFilter').value;
  const query = document.getElementById('searchInput').value.trim().toLowerCase();

  let filtered = citations;

  if (selected) {
    filtered = filtered.filter(cite =>
      cite.compliance_flags &&
      matchAlias(selected, cite.compliance_flags)
    );
  }

  if (query) {
    filtered = filtered.filter(cite =>
      JSON.stringify(cite).toLowerCase().includes(query)
    );
  }

  renderCitations(filtered);
  renderBreachSummary(filtered);
}

function renderBreachSummary(filteredCitations) {
  const container = document.getElementById('breachSummaryContainer');
  container.innerHTML = '';

  const grouped = {};

  filteredCitations.forEach(c => {
    if (!grouped[c.jurisdiction]) grouped[c.jurisdiction] = [];
    grouped[c.jurisdiction].push(c);
  });

  for (const [jurisdiction, entries] of Object.entries(grouped)) {
    const section = document.createElement('div');
    section.className = 'summary-group';

    const title = document.createElement('h2');
    title.textContent = jurisdiction;
    section.appendChild(title);

    entries.forEach(entry => {
      const line = document.createElement('div');
      line.className = 'summary-line';
      line.innerHTML = `
        <strong>${entry.case_name}</strong> (${entry.citation})<br />
        <em>${entry.compliance_flags.join(', ')}</em><br />
        ${entry.summary}
        <hr />
      `;
      section.appendChild(line);
    });

    container.appendChild(section);
  }
}

document.getElementById('breachFilter').addEventListener('change', filterAndSearch);
document.getElementById('searchInput').addEventListener('input', filterAndSearch);

loadData();
