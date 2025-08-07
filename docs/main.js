document.addEventListener("DOMContentLoaded", () => {
  const citationsPath = "docs/data/citations/citations.json";
  const breachesPath = "docs/data/breaches/breaches.json";

  const citationsContainer = document.getElementById("citationsContainer");
  const breachFilter = document.getElementById("breachFilter");
  const drawer = document.getElementById("drawer");
  const openDrawerBtn = document.getElementById("openDrawerBtn");
  const closeDrawerBtn = document.getElementById("closeDrawerBtn");

  async function loadCitations() {
    try {
      const response = await fetch(citationsPath);
      const citations = await response.json();
      displayCitations(citations);
    } catch (err) {
      console.error("Error loading citations:", err);
      citationsContainer.innerHTML = "<p>Error loading citations.</p>";
    }
  }

  async function loadBreaches() {
    try {
      const response = await fetch(breachesPath);
      const breaches = await response.json();

      breachFilter.innerHTML = '<option value="">All</option>';
      breaches.forEach((b) => {
        const opt = document.createElement("option");
        opt.value = b.tag;
        opt.textContent = b.tag;
        breachFilter.appendChild(opt);
      });
    } catch (err) {
      console.error("Error loading breaches:", err);
    }
  }

  function displayCitations(citations) {
    citationsContainer.innerHTML = "";
    citations.forEach((c) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${c.case_name}</h3>
        <p><strong>Citation:</strong> ${c.citation}</p>
        <p><strong>Year:</strong> ${c.year}</p>
        <p><strong>Court:</strong> ${c.court}</p>
        <p><strong>Jurisdiction:</strong> ${c.jurisdiction}</p>
        <p><strong>Summary:</strong> ${c.summary}</p>
      `;
      citationsContainer.appendChild(card);
    });
  }

  openDrawerBtn.addEventListener("click", () => {
    drawer.classList.add("open");
    drawer.classList.remove("hidden");
  });

  closeDrawerBtn.addEventListener("click", () => {
    drawer.classList.remove("open");
    drawer.classList.add("hidden");
  });

  loadCitations();
  loadBreaches();
});
