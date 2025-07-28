let citations = [];
let breachTags = [];
let currentFilter = '';
let currentSearch = '';

async function loadJSON(url) {
  const response = await fetch(url);
  return await response.json();
}

function normalize(str) {
  return str.toLowerCase().trim();
}

function getCanonicalTag(input) {
  const lowerInput = normalize(input);
  for (const breach of breachTags) {
    const aliases = breach.aliases.map(normalize);
    if (normalize(breach.tag) === lowerInput || aliases.includes(lowerInput)) {
      return breach.tag;
    }
  }
  return null;
}

function matchesSearch(citation, keyword) {
  const fields = [
    citation.case_name,
    citation.summary,
    citation.holding,
    citation.legal_principle,
    ...(citation.compliance_flags || [])
  ];
  const keywordLower = keyword.toLowerCase();
  return fields.some(field =>
    (Array.isArray(field)
      ? field.join(' ').toLowerCase()
      : (field || '').toLowerCase()
    ).includes(keywordLower)
  );
}

function renderCitations() {
  const container = document.getElementById("citationsContainer");
  container.innerHTML = "";

  let filtered = [...citations];

  if (currentFilter && currentFilter !== "-- All Breaches --") {
    filtered = filtered.filter(c => (c.compliance_flags || []).includes(currentFilter));
  }

  if (currentSearch && currentSearch.trim() !== "") {
    const canonical = getCanonicalTag(currentSearch);
    filtered = filtered.filter(c =>
      matchesSearch(c, currentSearch) ||
      (canonical && (c.compliance_flags || []).includes(canonical))
    );
  }

  filtered.forEach(citation => {
    const card = document.createElement("div");
    card.className = "citation-card";
    card.innerHTML = `
      <p><strong>Case Name:</strong> ${citation.case_name}</p>
      <p><strong>Citation:</strong> ${citation.citation}</p>
      <p><strong>Year:</strong> ${citation.year}</p>
      <p><strong>Court:</strong> ${citation.court}</p>
      <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
      <p><strong>Summary:</strong> ${citation.summary}</p>
      <p><strong>Compliance Flags:</strong> ${(citation.compliance_flags || []).join(", ")}</p>
      <button onclick="printCitation(${JSON.stringify(citation).replace(/"/g, '&quot;')})">Print</button>
      <button onclick="exportText(${JSON.stringify(citation).replace(/"/g, '&quot;')})">Export as .txt</button>
    `;
    container.appendChild(card);
  });
}

function printCitation(citation) {
  const printWindow = window.open("", "_blank");
  printWindow.document.write("<pre>" + JSON.stringify(citation, null, 2) + "</pre>");
  printWindow.document.close();
  printWindow.print();
}

function exportText(citation) {
  const text = `Case Name: ${citation.case_name}
Citation: ${citation.citation}
Year: ${citation.year}
Court: ${citation.court}
Jurisdiction: ${citation.jurisdiction}
Summary: ${citation.summary}
Compliance Flags: ${(citation.compliance_flags || []).join(", ")}
`;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${citation.case_name.replace(/\s+/g, "_")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

async function initialize() {
  citations = await loadJSON("data/citations/citations.json");
  breachTags = await loadJSON("data/breaches/breaches.json");

  const breachSelect = document.getElementById("breachFilter");
  breachSelect.innerHTML = `<option>-- All Breaches --</option>`;
  breachTags.forEach(tag => {
    const option = document.createElement("option");
    option.textContent = tag.tag;
    breachSelect.appendChild(option);
  });

  document.getElementById("searchBox").addEventListener("input", (e) => {
    currentSearch = e.target.value;
    renderCitations();
  });

  breachSelect.addEventListener("change", (e) => {
    currentFilter = e.target.value;
    renderCitations();
  });

  renderCitations();
}

window.onload = initialize;
