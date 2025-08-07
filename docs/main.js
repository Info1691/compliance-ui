document.addEventListener("DOMContentLoaded", () => {
  const citationContainer = document.getElementById("citationContainer");
  const breachFilter = document.getElementById("breachFilter");
  const drawer = document.getElementById("drawer");
  const openDrawer = document.getElementById("openDrawer");
  const closeDrawer = document.getElementById("closeDrawer");

  fetch("citations.json")
    .then(response => response.json())
    .then(data => {
      renderCitations(data);
      populateFilter(data);
    })
    .catch(error => {
      console.error("Error loading citations:", error);
      citationContainer.innerHTML = "<p>Error loading citations.</p>";
    });

  function renderCitations(data) {
    citationContainer.innerHTML = "";
    data.forEach(citation => {
      const div = document.createElement("div");
      div.classList.add("citation-card");
      div.innerHTML = `
        <h3>${citation.case_name}</h3>
        <p><strong>Citation:</strong> ${citation.citation}</p>
        <p><strong>Year:</strong> ${citation.year}</p>
        <p><strong>Court:</strong> ${citation.court}</p>
        <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
        <p><strong>Summary:</strong> ${citation.summary}</p>
        <p><strong>Legal Principle:</strong> ${citation.legal_principle}</p>
        <p><strong>Holding:</strong> ${citation.holding}</p>
        <p><strong>Compliance Flags:</strong> ${citation.compliance_flags?.join(", ")}</p>
        <p><strong>Canonical Breach Tag:</strong> ${citation.canonical_breach_tag || ""}</p>
      `;
      citationContainer.appendChild(div);
    });
  }

  function populateFilter(data) {
    const allFlags = new Set();
    data.forEach(c => (c.compliance_flags || []).forEach(f => allFlags.add(f)));
    breachFilter.innerHTML = `<option value="">All</option>`;
    [...allFlags].sort().forEach(flag => {
      const option = document.createElement("option");
      option.value = flag;
      option.textContent = flag;
      breachFilter.appendChild(option);
    });
  }

  openDrawer.addEventListener("click", () => drawer.classList.remove("hidden"));
  closeDrawer.addEventListener("click", () => drawer.classList.add("hidden"));
});
