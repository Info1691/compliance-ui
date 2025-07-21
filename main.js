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
      div.innerHTML = `
  <h3>${citation.case_name} (${citation.year})</h3>
  <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
  <p><strong>Court:</strong> ${citation.court}</p>
  <p><strong>Citation:</strong> ${citation.citation}</p>
  <p><strong>Summary:</strong> ${citation.summary}</p>
  <p><strong>Legal Principle:</strong> ${citation.legal_principle}</p>
  <p><strong>Holding:</strong> ${citation.holding}</p>
  <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(", ")}</p>
  <p><strong>Key Points:</strong> ${citation.key_points.join(", ")}</p>
  <p><strong>Tags:</strong> ${citation.tags.join(", ")}</p>
  ${citation.case_link ? `<p><strong>Case Link:</strong> <a href="${citation.case_link}" target="_blank">${citation.case_link}</a></p>` : ""}
  ${citation.full_case_text ? `<details><summary><strong>Full Case Text</strong></summary><pre>${citation.full_case_text}</pre></details>` : ""}
  <p><strong>Printable:</strong> ${citation.printable ? "Yes" : "No"}</p>
  <button onclick="printCard(this)">🖨️ Print</button>
  <button onclick="editCard('${citation.id}')">✏️ Edit</button>
  <button onclick="deleteCard('${citation.id}')">🗑️ Delete</button>
`;
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

loadCitations();  // 👈 This line ensures your cards load on page open

  renderCards(data);
}

window.onload = loadCitations;
