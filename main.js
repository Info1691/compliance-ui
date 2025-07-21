async function loadCitations() {
  const response = await fetch("/citations.json");
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
        ${citation.case_link ? `
          <p><strong>Case Link:</strong> 
            <a href="${citation.case_link}" target="_blank" rel="noopener noreferrer">View Case</a>
          </p>` : ""}
        ${citation.full_case_text ? `
          <details>
            <summary><strong>Full Case Text</strong></summary>
            <div class="full-text">${citation.full_case_text.replace(/\n/g, "<br>")}</div>
          </details>` : ""}
        <p><strong>Printable:</strong> ${citation.printable ? "Yes" : "No"}</p>
        <div style="margin-top:10px;">
          <button onclick="printCard(this)">🖨️ Print</button>
          <button onclick="editCard('${citation.id}')">✏️ Edit</button>
          <button onclick="deleteCard('${citation.id}')">🗑️ Delete</button>
        </div>
      `;
      container.appendChild(div);
    });
  }

  // 🔍 Search Function
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

// 🖨️ Print / ✏️ Edit / 🗑️ Delete Button Functions

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
  const citation = currentData.find(c => c.id === id);
  if (!citation) return;

  const fields = Object.keys(citation).filter(k => k !== "id");
  let formHTML = `<form id="editForm"><h3>Edit: ${citation.case_name}</h3>`;
  fields.forEach(key => {
    const value = Array.isArray(citation[key]) ? citation[key].join("\n") : citation[key];
    formHTML += `
      <label>${key}:</label><br>
      <textarea name="${key}" rows="3" style="width:100%">${value}</textarea><br><br>
    `;
  });
  formHTML += `<button type="submit">Save</button></form>`;

  const modal = document.createElement("div");
  modal.style.position = "fixed";
  modal.style.top = "10%";
  modal.style.left = "10%";
  modal.style.width = "80%";
  modal.style.height = "80%";
  modal.style.overflow = "auto";
  modal.style.background = "#fff";
  modal.style.padding = "20px";
  modal.style.zIndex = 9999;
  modal.innerHTML = formHTML;
  document.body.appendChild(modal);

  document.getElementById("editForm").onsubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    fields.forEach(key => {
      const raw = formData.get(key);
      citation[key] = raw.includes("\n") ? raw.split("\n").map(s => s.trim()).filter(Boolean) : raw;
    });
    document.body.removeChild(modal);
    renderCards(currentData);
    alert("Edited! Save changes manually in GitHub if needed.");
  };
}

function deleteCard(id) {
  alert("Delete not implemented yet.\n\nCard ID: " + id);
}

// 🚀 Initial Load
window.onload = loadCitations;
