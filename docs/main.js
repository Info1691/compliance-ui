document.addEventListener("DOMContentLoaded", () => {
  const drawer = document.getElementById("drawer");
  const openDrawerBtn = document.getElementById("openDrawerBtn");
  const breachFilter = document.getElementById("breachFilter");
  const citationsContainer = document.getElementById("citationsContainer");

  // Toggle drawer
  openDrawerBtn.addEventListener("click", () => {
    drawer.classList.toggle("hidden");
  });

  // Load citations
  fetch("data/citations/citations.json")
    .then((res) => res.json())
    .then((data) => renderCitations(data))
    .catch((err) => {
      console.error("Error loading citations:", err);
      citationsContainer.textContent = "Error loading citations.";
    });

  // Load breaches
  fetch("data/breaches/breaches.json")
    .then((res) => res.json())
    .then((data) => {
      breachFilter.innerHTML = `<option value="">All</option>`;
      data.forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item.tag;
        opt.textContent = item.tag;
        breachFilter.appendChild(opt);
      });
    })
    .catch((err) => {
      console.error("Error loading breaches:", err);
    });

  function renderCitations(citations) {
    citationsContainer.innerHTML = "";
    citations.forEach((c) => {
      const div = document.createElement("div");
      div.className = "citation-card";
      div.innerHTML = `
        <h3>${c.case_name}</h3>
        <p><strong>Citation:</strong> ${c.citation}</p>
        <p><strong>Year:</strong> ${c.year}</p>
        <p><strong>Court:</strong> ${c.court}</p>
        <p><strong>Jurisdiction:</strong> ${c.jurisdiction}</p>
        <p><strong>Summary:</strong> ${c.summary}</p>
      `;
      citationsContainer.appendChild(div);
    });
  }
});
