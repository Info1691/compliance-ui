let citations = [];

// Drawer controls
document.getElementById("open-writer").addEventListener("click", () => {
  document.getElementById("citation-drawer").classList.add("open");
});

document.getElementById("close-drawer").addEventListener("click", () => {
  document.getElementById("citation-drawer").classList.remove("open");
});

// Load citations.json
fetch("citations.json")
  .then(response => response.json())
  .then(data => {
    citations = data;
    renderCitations();
  })
  .catch(err => {
    document.getElementById("citation-container").innerHTML = `<p>Error loading citations.</p>`;
  });

function renderCitations() {
  const container = document.getElementById("citation-container");
  container.innerHTML = "";
  citations.forEach(cite => {
    const card = document.createElement("div");
    card.className = "citation-card";
    card.innerHTML = `
      <h3>${cite.case_name}</h3>
      <p><strong>Citation:</strong> ${cite.citation}</p>
      <p><strong>Jurisdiction:</strong> ${cite.jurisdiction}</p>
      <p><strong>Summary:</strong> ${cite.summary}</p>
    `;
    container.appendChild(card);
  });
}

// Form validation (does not write to JSON file yet)
document.getElementById("citation-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const form = e.target;
  const newCitation = {
    id: form.id.value.trim(),
    case_name: form.case_name.value.trim(),
    citation: form.citation.value.trim(),
    year: parseInt(form.year.value.trim()),
    court: form.court.value.trim(),
    jurisdiction: form.jurisdiction.value.trim(),
    summary: form.summary.value.trim(),
    legal_principle: form.legal_principle.value.trim(),
    holding: form.holding.value.trim(),
    compliance_flags: form.compliance_flags.value.split(',').map(s => s.trim()).filter(Boolean),
    key_points: form.key_points.value.split(',').map(s => s.trim()).filter(Boolean),
    tags: form.tags.value.split(',').map(s => s.trim()).filter(Boolean),
    case_link: form.case_link.value.trim(),
    full_case_text: form.full_case_text.value.trim(),
    printable: form.printable.value === "true"
  };

  console.log("Validated Citation:", newCitation);
  alert("Citation validated in memory. This does NOT write to file yet.");
});
