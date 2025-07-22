let currentData = [];

async function loadCitations() {
  try {
    const response = await fetch('./citations.json');
    if (!response.ok) throw new Error('Failed to load JSON');
    const data = await response.json();
    currentData = data;
    renderCards(data);

    document.getElementById("searchBox").addEventListener("input", () => {
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
    console.error('Load error:', error);
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
      ${citation.case_link ? `<p><strong>Case Link:</strong> <a href="${citation.case_link}" target="_blank">View Case</a></p>` : ""}
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

function editCard(id) {
  const c = currentData.find(c => c.id === id);
  if (!c) return;

  document.getElementById("editId").value = c.id;
  document.getElementById("editCaseName").value = c.case_name;
  document.getElementById("editCitation").value = c.citation;
  document.getElementById("editYear").value = c.year;
  document.getElementById("editCourt").value = c.court;
  document.getElementById("editJurisdiction").value = c.jurisdiction;
  document.getElementById("editSummary").value = c.summary;
  document.getElementById("editLegalPrinciple").value = c.legal_principle;
  document.getElementById("editHolding").value = c.holding;
  document.getElementById("editFlags").value = c.compliance_flags.join(", ");
  document.getElementById("editKeyPoints").value = c.key_points.join(", ");
  document.getElementById("editTags").value = c.tags.join(", ");
  document.getElementById("editCaseLink").value = c.case_link || "";
  document.getElementById("editFullText").value = c.full_case_text || "";
  document.getElementById("editPrintable").value = c.printable ? "true" : "false";

  document.getElementById("editModal").classList.remove("hidden");
}

document.getElementById("closeModal").onclick = () => {
  document.getElementById("editModal").classList.add("hidden");
};

document.getElementById("editForm").onsubmit = function (e) {
  e.preventDefault();

  const id = document.getElementById("editId").value;
  const c = currentData.find(c => c.id === id);
  if (!c) return alert("Citation not found");

  c.case_name = document.getElementById("editCaseName").value;
  c.citation = document.getElementById("editCitation").value;
  c.year = parseInt(document.getElementById("editYear").value);
  c.court = document.getElementById("editCourt").value;
  c.jurisdiction = document.getElementById("editJurisdiction").value;
  c.summary = document.getElementById("editSummary").value;
  c.legal_principle = document.getElementById("editLegalPrinciple").value;
  c.holding = document.getElementById("editHolding").value;
  c.compliance_flags = document.getElementById("editFlags").value.split(",").map(s => s.trim());
  c.key_points = document.getElementById("editKeyPoints").value.split(",").map(s => s.trim());
  c.tags = document.getElementById("editTags").value.split(",").map(s => s.trim());
  c.case_link = document.getElementById("editCaseLink").value || null;
  c.full_case_text = document.getElementById("editFullText").value || "";
  c.printable = document.getElementById("editPrintable").value === "true";

  renderCards(currentData);
  document.getElementById("editModal").classList.add("hidden");
};

function deleteCard(id) {
  alert(`Delete not implemented yet.\n\nCard ID: ${id}`);
}

// Load data on startup
window.onload = loadCitations;
