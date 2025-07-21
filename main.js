let currentData = [];

async function loadCitations() {
  try {
    // ✅ Use absolute path for GitHub Pages JSON loading
    const response = await fetch('https://info1691.github.io/compliance-ui/citations.json');
    if (!response.ok) throw new Error('Failed to load JSON');

    const data = await response.json();
    console.log("✅ JSON loaded:", data);
    currentData = data;
    renderCards(data);

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
  } catch (error) {
    document.body.innerHTML = `<h2 style="padding:2rem;color:red;">Error loading citations.json:<br>${error.message}</h2>`;
    console.error('❌ Load error:', error);
  }
}

function renderCards(filteredData) {
  const container = document.getElementById("cardsContainer");
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
      ${citation.case_link ? `<p><strong>Case Link:</strong> <a href="${citation.case_link}" target="_blank" rel="noopener noreferrer">View Case</a></p>` : ""}
      ${citation.full_case_text ? `
        <details>
          <summary><strong>Full Case Text</strong></summary>
          <div class="full-text">${citation.full_case_text.replace(/\n/g, "<br>")}</div>
        </details>` : ""}
      <p><strong>Printable:</strong> ${citation.printable ? "Yes" : "No"}</p>
      <div style="margin-top: 10px;">
        <button onclick="printCard(this)">🖨️ Print</button>
        <button onclick="editCard('${citation.id}')">✏️ Edit</button>
        <button onclick="deleteCard('${citation.id}')">🗑️ Delete</button>
      </div>
    `;

    container.appendChild(div);
  });
}

function printCard(button) {
  const card = button.parentElement.parentElement;
  const win = window.open("", "PrintCard");
  win.document.write("<html><head><title>Print</title></head><body>");
  win.document.write(card.innerHTML);
  win.document.write("</body></html>");
  win.document.close();
  win.print();
}

function editCard(cardId) {
  const citation = currentData.find(c => c.id === cardId);
  if (!citation) return alert("Citation not found");

  // Pre-fill form
  document.getElementById("editId").value = citation.id;
  document.getElementById("editCaseName").value = citation.case_name;
  document.getElementById("editYear").value = citation.year;
  document.getElementById("editJurisdiction").value = citation.jurisdiction;
  document.getElementById("editSummary").value = citation.summary;
  document.getElementById("editPrintable").value = citation.printable ? "true" : "false";

  // Show modal
  document.getElementById("editModal").classList.remove("hidden");
}

// Close modal logic
document.getElementById("closeModal").onclick = () => {
  document.getElementById("editModal").classList.add("hidden");
};

// Save form logic
document.getElementById("editForm").onsubmit = function (e) {
  e.preventDefault();

  const id = document.getElementById("editId").value;
  const updated = currentData.find(c => c.id === id);
  if (!updated) return alert("Citation not found");

  updated.case_name = document.getElementById("editCaseName").value;
  updated.year = parseInt(document.getElementById("editYear").value);
  updated.jurisdiction = document.getElementById("editJurisdiction").value;
  updated.summary = document.getElementById("editSummary").value;
  updated.printable = document.getElementById("editPrintable").value === "true";

  renderCards(currentData);
  document.getElementById("editModal").classList.add("hidden");
};

function deleteCard(id) {
  alert("Delete not implemented yet.\n\nCard ID: " + id);
}

// Initial Load
window.onload = loadCitations;
