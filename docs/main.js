document.addEventListener("DOMContentLoaded", async () => {
  const citationContainer = document.getElementById("citation-container");
  const breachFilter = document.getElementById("breach-filter");
  const keywordSearch = document.getElementById("keyword-search");

  try {
    const [citationsResponse, breachesResponse] = await Promise.all([
      fetch("docs/data/citations/citations.json"),
      fetch("docs/data/breaches/breaches.json"),
    ]);

    if (!citationsResponse.ok || !breachesResponse.ok) {
      throw new Error("Failed to fetch data");
    }

    const citations = await citationsResponse.json();
    const breachTags = await breachesResponse.json();

    function renderCitation(citation) {
      return `
        <div class="citation-card">
          <h2>${citation.case_name}</h2>
          <p><strong>Citation:</strong> ${citation.citation}</p>
          <p><strong>Year:</strong> ${citation.year}</p>
          <p><strong>Court:</strong> ${citation.court}</p>
          <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
          <p><strong>Summary:</strong> ${citation.summary}</p>
          <p><strong>Legal Principle:</strong> ${citation.legal_principle}</p>
          <p><strong>Holding:</strong> ${citation.holding}</p>
          <p><strong>Observed Conduct:</strong> ${citation.observed_conduct}</p>
          <p><strong>Anomaly Detected:</strong> ${citation.anomaly_detected}</p>
          <p><strong>Breached Law/Rule:</strong> ${citation.breached_law_or_rule}</p>
          <p><strong>Authority Basis:</strong> ${citation.authority_basis}</p>
          <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(", ")}</p>
          <p><strong>Canonical Breach Tag:</strong> ${citation.canonical_breach_tag}</p>
        </div>
      `;
    }

    function filterAndRender() {
      const selectedTag = breachFilter.value.toLowerCase();
      const keyword = keywordSearch.value.toLowerCase();

      const filtered = citations.filter(c => {
        const breachMatch =
          selectedTag === "all" ||
          c.canonical_breach_tag?.toLowerCase() === selectedTag ||
          c.compliance_flags?.some(f => f.toLowerCase() === selectedTag);

        const keywordMatch =
          !keyword ||
          JSON.stringify(c).toLowerCase().includes(keyword);

        return breachMatch && keywordMatch;
      });

      citationContainer.innerHTML = filtered.length
        ? filtered.map(renderCitation).join("")
        : "<p>No matching citations found.</p>";
    }

    // Load dropdown
    breachFilter.innerHTML = `<option value="all">All</option>` + breachTags
      .map(tag => `<option value="${tag.tag.toLowerCase()}">${tag.tag}</option>`)
      .join("");

    // Event listeners
    breachFilter.addEventListener("change", filterAndRender);
    keywordSearch.addEventListener("input", filterAndRender);

    // Initial render
    filterAndRender();

  } catch (error) {
    citationContainer.innerHTML = `<p>Error loading citations or breaches.</p>`;
    console.error("Error loading data:", error);
  }
});
