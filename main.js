let currentData = [];

function loadJSON() {
  fetch("citations.json")
    .then((response) => response.json())
    .then((data) => {
      currentData = data;
      renderCards();
    })
    .catch((error) => {
      document.body.innerHTML = `<h2 style="color: red;">Error loading citations.json:<br>${error.message}</h2>`;
    });
}

function renderCards() {
  const container = document.getElementById("card-container");
  container.innerHTML = "";
  currentData.forEach((entry, index) => {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = entry.case_name;

    const citation = document.createElement("p");
    citation.innerHTML = `<strong>Citation:</strong> ${entry.citation}`;

    const court = document.createElement("p");
    court.innerHTML = `<strong>Court:</strong> ${entry.court}`;

    const jurisdiction = document.createElement("p");
    jurisdiction.innerHTML = `<strong>Jurisdiction:</strong> ${entry.jurisdiction}`;

    const compliance = document.createElement("p");
    compliance.innerHTML = `<strong>Compliance Flags:</strong> ${entry.compliance_flags.join(", ")}`;

    const tags = document.createElement("p");
    tags.innerHTML = `<strong>Tags:</strong> ${entry.tags.join(", ")}`;

    const detailsBtn = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Details";

    detailsBtn.appendChild(summary);
    detailsBtn.innerHTML += `
      <p><strong>Summary:</strong> ${entry.summary}</p>
      <p><strong>Legal Principle:</strong> ${entry.legal_principle}</p>
      <p><strong>Holding:</strong> ${entry.holding}</p>
      <p><strong>Key Points:</strong> ${entry.key_points.join(", ")}</p>
      <p><strong>Case Link:</strong> ${entry.case_link || "None"}</p>
      <p><strong>Printable:</strong> ${entry.printable ? "Yes" : "No"}</p>
    `;

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.onclick = () => editEntry(index);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.style.marginLeft = "8px";
    deleteBtn.onclick = () => {
      if (confirm("Delete this citation?")) {
        currentData.splice(index, 1);
        renderCards();
      }
    };

    const printBtn = document.createElement("button");
    printBtn.textContent = "Print";
    printBtn.style.marginLeft = "8px";
    printBtn.onclick = () => printEntry(entry);

    card.append(
      title,
      citation,
      court,
      jurisdiction,
      compliance,
      tags,
      detailsBtn,
      editBtn,
      deleteBtn,
      printBtn
    );

    container.appendChild(card);
  });
}

function editEntry(index) {
  const entry = currentData[index];
  const edited = prompt("Edit full JSON entry:", JSON.stringify(entry, null, 2));
  try {
    const parsed = JSON.parse(edited);
    currentData[index] = parsed;
    renderCards();
  } catch (e) {
    alert("Invalid JSON. No changes made.");
  }
}

function printEntry(entry) {
  const printWindow = window.open("", "_blank");
  const content = `
    <html><head><title>${entry.case_name}</title></head><body>
    <h1>${entry.case_name}</h1>
    <p><strong>Citation:</strong> ${entry.citation}</p>
    <p><strong>Court:</strong> ${entry.court}</p>
    <p><strong>Jurisdiction:</strong> ${entry.jurisdiction}</p>
    <p><strong>Compliance Flags:</strong> ${entry.compliance_flags.join(", ")}</p>
    <p><strong>Tags:</strong> ${entry.tags.join(", ")}</p>
    <p><strong>Summary:</strong> ${entry.summary}</p>
    <p><strong>Legal Principle:</strong> ${entry.legal_principle}</p>
    <p><strong>Holding:</strong> ${entry.holding}</p>
    <p><strong>Key Points:</strong> ${entry.key_points.join(", ")}</p>
    <p><strong>Case Link:</strong> ${entry.case_link || "None"}</p>
    <p><strong>Printable:</strong> ${entry.printable ? "Yes" : "No"}</p>
    </body></html>
  `;
  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.print();
}

function exportData() {
  const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "citations.json";
  a.click();
}

window.onload = loadJSON;
