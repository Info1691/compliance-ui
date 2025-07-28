document.addEventListener("DOMContentLoaded", async () => {
  const citationContainer = document.getElementById("citationContainer");
  const breachFilter = document.getElementById("breachFilter");

  let citations = [];
  let breaches = [];

  async function loadData() {
    const citationRes = await fetch("citations.json");
    citations = await citationRes.json();

    const breachRes = await fetch("breaches.json");
    breaches = await breachRes.json();
  }

  function populateBreachFilter() {
    const categories = {};

    breaches.forEach(breach => {
      if (!categories[breach.category]) categories[breach.category] = [];
      categories[breach.category].push(breach.tag);
    });

    Object.entries(categories).forEach(([category, tags]) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = category;
      tags.forEach(tag => {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        optgroup.appendChild(option);
      });
      breachFilter.appendChild(optgroup);
    });
  }

  function renderCitations(filtered = citations) {
    citationContainer.innerHTML = "";

    filtered.forEach(entry => {
      const card = document.createElement("div");
      card.className = "citation-card";

      card.innerHTML = `
        <strong>${entry.case_name} (${entry.year})</strong><br/>
        <em>${entry.citation}</em><br/>
        <p><strong>Jurisdiction:</strong> ${entry.jurisdiction}</p>
        <p><strong>Summary:</strong> ${entry.summary}</p>
        <p><strong>Legal Principle:</strong> ${entry.legal_principle}</p>
        <p><strong>Holding:</strong> ${entry.holding}</p>
        <p><strong>Compliance Flags:</strong> ${entry.compliance_flags.join(', ')}</p>
        <button onclick="printEntry(${JSON.stringify(entry).replace(/"/g, '&quot;')})">Print</button>
        <button onclick="exportEntry(${JSON.stringify(entry).replace(/"/g, '&quot;')})">Export</button>
        <button onclick="editEntry('${entry.id}')">Edit</button>
      `;

      citationContainer.appendChild(card);
    });
  }

  breachFilter.addEventListener("change", () => {
    const selected = breachFilter.value;
    if (!selected) return renderCitations();
    const filtered = citations.filter(c => c.compliance_flags.includes(selected));
    renderCitations(filtered);
  });

  window.printEntry = function (entry) {
    const newWindow = window.open("", "_blank");
    newWindow.document.write(`<pre>${entry.case_name} (${entry.year})\n\n${entry.summary}\n\nPrinciple: ${entry.legal_principle}\nHolding: ${entry.holding}</pre>`);
    newWindow.print();
  };

  window.exportEntry = function (entry) {
    const text = `${entry.case_name} (${entry.year})\n\n${entry.summary}\n\nPrinciple: ${entry.legal_principle}\nHolding: ${entry.holding}`;
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${entry.id}-export.txt`;
    link.click();
  };

  window.editEntry = function (id) {
    alert(`Edit mode not yet implemented. Entry ID: ${id}`);
    // In future: open edit modal or redirect to editable form
  };

  await loadData();
  populateBreachFilter();
  renderCitations();
});
