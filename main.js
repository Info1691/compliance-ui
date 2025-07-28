document.addEventListener("DOMContentLoaded", async () => {
  const citationsUrl = "data/citations/citations.json";
  const breachesUrl = "data/breaches/breaches.json";

  const citationContainer = document.getElementById("citation-container");
  const filterDropdown = document.getElementById("breach-filter");
  const searchBox = document.getElementById("search-box");

  let citations = [];
  let breaches = [];
  let aliasMap = {};

  try {
    const citationResponse = await fetch(citationsUrl);
    const breachResponse = await fetch(breachesUrl);
    citations = await citationResponse.json();
    breaches = await breachResponse.json();
  } catch (err) {
    console.error("Error loading data:", err);
    citationContainer.innerHTML = "<p>Error loading citations or breaches.</p>";
    return;
  }

  // Build alias → canonical tag map
  breaches.forEach(b => {
    aliasMap[b.tag.toLowerCase()] = b.tag;
    b.aliases.forEach(alias => {
      aliasMap[alias.toLowerCase()] = b.tag;
    });
  });

  function renderCitations(filtered) {
    citationContainer.innerHTML = "";
    if (!filtered.length) {
      citationContainer.innerHTML = "<p>No matching citations found.</p>";
      return;
    }

    filtered.forEach(c => {
      const card = document.createElement("div");
      card.className = "citation-card";
      card.innerHTML = `
        <h3>${c.case_name}</h3>
        <p><strong>Citation:</strong> ${c.citation}</p>
        <p><strong>Year:</strong> ${c.year}</p>
        <p><strong>Court:</strong> ${c.court}</p>
        <p><strong>Jurisdiction:</strong> ${c.jurisdiction}</p>
        <p><strong>Summary:</strong> ${c.summary}</p>
        <p><strong>Compliance Flags:</strong> ${c.compliance_flags.join(", ")}</p>
      `;
      citationContainer.appendChild(card);
    });
  }

  function filterByBreach(breach) {
    if (!breach || breach === "-- All Breaches --") return citations;
    const canonical = aliasMap[breach.toLowerCase()] || breach;
    return citations.filter(c =>
      c.compliance_flags.some(flag => {
        const flagCanon = aliasMap[flag.toLowerCase()] || flag;
        return flagCanon.toLowerCase() === canonical.toLowerCase();
      })
    );
  }

  function searchByText(query) {
    const q = query.toLowerCase().trim();
    if (!q) return citations;
    const canonical = aliasMap[q] || q;
    return citations.filter(c =>
      c.compliance_flags.some(f => {
        const fCanon = aliasMap[f.toLowerCase()] || f;
        return fCanon.toLowerCase().includes(canonical.toLowerCase());
      }) ||
      c.summary.toLowerCase().includes(q) ||
      c.case_name.toLowerCase().includes(q)
    );
  }

  function populateDropdown() {
    const defaultOption = document.createElement("option");
    defaultOption.textContent = "-- All Breaches --";
    defaultOption.value = "";
    filterDropdown.appendChild(defaultOption);

    breaches.forEach(b => {
      const option = document.createElement("option");
      option.value = b.tag;
      option.textContent = b.tag;
      filterDropdown.appendChild(option);
    });
  }

  populateDropdown();
  renderCitations(citations);

  filterDropdown.addEventListener("change", () => {
    const selected = filterDropdown.value;
    const filtered = filterByBreach(selected);
    renderCitations(filtered);
  });

  searchBox.addEventListener("keyup", e => {
    if (e.key === "Enter") {
      const query = searchBox.value;
      const filtered = searchByText(query);
      renderCitations(filtered);
    }
  });
});
