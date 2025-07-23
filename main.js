let citations = [];
let currentIndex = 0;

async function loadCitationsFromJSON() {
  try {
    const res = await fetch('citations.json');
    citations = await res.json();
    displayCitation(currentIndex);
  } catch (err) {
    const container = document.getElementById("citation-container");
    if (container) {
      container.innerHTML = `<p style="color:red">❌ Error loading citations.json: ${err.message}</p>`;
    }
  }
}

function displayCitation(index) {
  const container = document.getElementById("citation-container");
  if (!container || !citations.length || !citations[index]) return;

  const c = citations[index];
  container.innerHTML = `
    <h2>${c.case_name} (${c.year})</h2>
    <p><strong>Citation:</strong> ${c.citation}</p>
    <p><strong>Court:</strong> ${c.court}</p>
    <p><strong>Jurisdiction:</strong> ${c.jurisdiction}</p>
    <p><strong><u>Summary:</u></strong> ${c.summary}</p>
    <p><strong><u>Legal Principle:</u></strong> ${c.legal_principle}</p>
    <p><strong><u>Holding:</u></strong> ${c.holding}</p>
    <p><strong>Compliance Flags:</strong> ${c.compliance_flags?.join(', ')}</p>
    <p><strong>Key Points:</strong> ${c.key_points?.join(', ')}</p>
    <p><strong>Tags:</strong> ${c.tags?.join(', ')}</p>
    <p><strong>Case Link:</strong> ${c.case_link || "N/A"}</p>
    <p><strong>Printable:</strong> ${c.printable ? "Yes" : "No"}</p>
  `;
}

function nextCitation() {
  if (currentIndex < citations.length - 1) {
    currentIndex++;
    displayCitation(currentIndex);
  }
}

function prevCitation() {
  if (currentIndex > 0) {
    currentIndex--;
    displayCitation(currentIndex);
  }
}

function editCitation() {
  alert("✏️ Edit UI coming soon (this is a placeholder).");
}

function printCurrentCitation() {
  const printableWindow = window.open('', '_blank');
  printableWindow.document.write('<html><head><title>Print Citation</title></head><body>');
  printableWindow.document.write(document.getElementById('citation-container').innerHTML);
  printableWindow.document.write('</body></html>');
  printableWindow.document.close();
  printableWindow.print();
}

function exportCurrentCitation() {
  const citation = citations[currentIndex];
  const blob = new Blob([JSON.stringify(citation, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${citation.id || 'citation'}-${currentIndex + 1}.json`;
  a.click();
}

window.onload = loadCitationsFromJSON;
