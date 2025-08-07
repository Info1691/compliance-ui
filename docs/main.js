document.addEventListener("DOMContentLoaded", () => {
  const drawer = document.getElementById("citationDrawer");
  const openDrawerBtn = document.getElementById("openDrawerBtn");
  const closeDrawerBtn = document.getElementById("closeDrawerBtn");
  const citationsContainer = document.getElementById("citationsContainer");
  const breachFilter = document.getElementById("breachFilter");

  if (openDrawerBtn) {
    openDrawerBtn.addEventListener("click", () => {
      drawer.classList.add("open");
    });
  }

  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener("click", () => {
      drawer.classList.remove("open");
    });
  }

  async function loadBreaches() {
    try {
      const res = await fetch("data/breaches/breaches.json");
      const breaches = await res.json();
      breachFilter.innerHTML = `<option value="">All</option>`;
      breaches.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b.tag;
        opt.textContent = `${b.category} – ${b.tag}`;
        breachFilter.appendChild(opt);
      });
    } catch (e) {
      console.error("Error loading breaches:", e);
      breachFilter.innerHTML = `<option>Error loading breaches</option>`;
    }
  }

  async function loadCitations() {
    try {
      const res = await fetch("data/citations/citations.json");
      const citations = await res.json();
      citationsContainer.innerHTML = "";
      citations.forEach(cite => {
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
          <strong>${cite.case_name}</strong><br/>
          <em>Citation:</em> ${cite.citation} <br/>
          <em>Year:</em> ${cite.year} <br/>
          <em>Court:</em> ${cite.court} <br/>
          <em>Jurisdiction:</em> ${cite.jurisdiction} <br/>
          <em>Summary:</em> ${cite.summary}
        `;
        citationsContainer.appendChild(div);
      });
    } catch (e) {
      console.error("Error loading citations:", e);
      citationsContainer.innerHTML = `<p>Error loading citations</p>`;
    }
  }

  loadBreaches();
  loadCitations();
});
