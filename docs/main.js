document.addEventListener("DOMContentLoaded", () => {
  fetch("verified_citations_partial.json")
    .then((response) => response.json())
    .then((data) => {
      let currentIndex = 0;
      const total = data.length;

      const caseContainer = document.getElementById("case-container");
      const prevBtn = document.getElementById("prevBtn");
      const nextBtn = document.getElementById("nextBtn");

      function renderCase(index) {
        const c = data[index];
        caseContainer.innerHTML = `
          <h2>${c.case_name}</h2>
          <p><strong>Citation:</strong> ${c.citation}</p>
          <p><strong>Year:</strong> ${c.year}</p>
          <p><strong>Court:</strong> ${c.court}</p>
          <p><strong>Jurisdiction:</strong> ${c.jurisdiction}</p>
          <p><strong>Summary:</strong> ${c.summary}</p>
          <p><strong>Legal Principle:</strong> ${c.legal_principle}</p>
          <p><strong>Holding:</strong> ${c.holding}</p>
          <p><strong>Compliance Flags:</strong> ${c.compliance_flags.join(", ")}</p>
          <p><strong>Key Points:</strong> ${c.key_points.join(", ")}</p>
          <p><strong>Tags:</strong> ${c.tags.join(", ")}</p>
          <p><strong>Breached Law or Rule:</strong> ${c.breached_law_or_rule || '—'}</p>
          <p><strong>Observed Conduct:</strong> ${c.observed_conduct || '—'}</p>
          <p><strong>Anomaly Detected:</strong> ${c.anomaly_detected || '—'}</p>
          <p><strong>Authority Basis:</strong> ${c.authority_basis || '—'}</p>
          <p><strong>Canonical Breach Tag:</strong> ${c.canonical_breach_tag || '—'}</p>
          ${c.full_case_text ? `<details><summary>Full Case Text</summary><pre>${c.full_case_text}</pre></details>` : ""}
          ${c.case_link ? `<a href="${c.case_link}" target="_blank">View Case</a><br>` : ""}
          <button onclick="window.print()">Print</button>
        `;
      }

      renderCase(currentIndex);

      prevBtn.addEventListener("click", () => {
        if (currentIndex > 0) {
          currentIndex--;
          renderCase(currentIndex);
        }
      });

      nextBtn.addEventListener("click", () => {
        if (currentIndex < total - 1) {
          currentIndex++;
          renderCase(currentIndex);
        }
      });
    })
    .catch((error) => {
      document.getElementById("case-container").innerHTML = `<p>Error loading data: ${error}</p>`;
    });
});
