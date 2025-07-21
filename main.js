async function loadCitations() {
  const response = await fetch("citations.json");
  const data = await response.json();
  const container = document.getElementById("cardsContainer");
  const searchBox = document.getElementById("searchBox");

  function renderCards(filteredData) {
    container.innerHTML = "";
    filteredData.forEach(citation => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `<h3>${citation.case_name} (${citation.year})</h3>
        <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
        <p><strong>Summary:</strong> ${citation.summary}</p>
        <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(", ")}</p>`;
      container.appendChild(div);
    });
  }

  searchBox.addEventListener("input", () => {
    const q = searchBox.value.toLowerCase();
    const filtered = data.filter(c =>
      c.case_name.toLowerCase().includes(q) ||
      c.jurisdiction.toLowerCase().includes(q) ||
      c.compliance_flags.join(" ").toLowerCase().includes(q)
    );
    renderCards(filtered);
  });

  renderCards(data);
}

window.onload = loadCitations;
