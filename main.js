async function loadCitations() {
  const response = await fetch('citations.json');
  const data = await response.json();
  renderCards(data);

  // Attach search functionality
  const searchBox = document.getElementById("searchBox");
  searchBox.addEventListener("input", () => {
    const q = searchBox.value.toLowerCase();
    const filtered = data.filter(c =>
      c.case_name.toLowerCase().includes(q) ||
      c.jurisdiction.toLowerCase().includes(q) ||
      c.compliance_flags.join(", ").toLowerCase().includes(q)
    );
    renderCards(filtered);
  });
}

function renderCards(data) {
  const container = document.getElementById("cardsContainer");
  container.innerHTML = "";

  data.forEach(citation => {
    const div = document.createElement("div");
    div.className = "card";
    div.id = citation.id;

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
      ${citation.case_link ? `<p><strong>Case Link:</strong> <a href="${citation.case_link}" target="_blank" rel="noopener noreferrer">View Case</a></p>` : ""}
      ${citation.full_case_text ? `
        <details>
          <summary><strong>Full Case Text</strong></summary>
          <div class="full-text">${citation.full_case_text.replace(/\n/g, "<br>")}</div>
        </details>` : ""}
      <p><strong>Printable:</strong> ${citation.printable ? "Yes" : "No"}</p>
      <button onclick="printCard(this)">🖨️ Print</button>
      <button onclick="editCard('${citation.id}')">✏️ Edit</button>
      <button onclick="deleteCard('${citation.id}')">🗑️ Delete</button>
    `;

    container.appendChild(div);
  });
}

// Print function
function printCard(button) {
  const card = button.parentElement;
  const win = window.open("", "PrintCard");
  win.document.write("<html><head><title>Print</title></head><body>");
  win.document.write(card.innerHTML);
  win.document.write("</body></html>");
  win.document.close();
  win.print();
}

// Edit function (simple prompt-based for now)
function editCard(id) {
  const card = document.getElementById(id);
  const nameElement = card.querySelector("h3");
  const summaryElement = card.querySelector("p:nth-of-type(3)");
  
  const currentName = nameElement.textContent;
  const currentSummary = summaryElement.textContent.replace("Summary:", "").trim();

  const newName = prompt("Edit Case Name:", currentName);
  const newSummary = prompt("Edit Summary:", currentSummary);

  if (newName) nameElement.textContent = newName;
  if (newSummary) summaryElement.innerHTML = `<strong>Summary:</strong> ${newSummary}`;
}

// Delete function
function deleteCard(id) {
  const card = document.getElementById(id);
  if (confirm("Are you sure you want to delete this citation?")) {
    card.remove();
  }
}

// Load on page open
window.onload = loadCitations;
