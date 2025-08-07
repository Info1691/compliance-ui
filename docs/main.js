let citations = [];
let breachTags = [];

const citationContainer = document.getElementById("citationContainer");
const drawer = document.getElementById("citationDrawer");
const openDrawerBtn = document.getElementById("openDrawerBtn");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");

fetch("data/citations/citations.json")
  .then((res) => res.json())
  .then((data) => {
    citations = data;
    renderCitations(citations);
  })
  .catch((err) => {
    console.error("Error loading citations:", err);
    citationContainer.innerHTML = "<p>Error loading citations or breaches.</p>";
  });

fetch("data/breaches/breaches.json")
  .then((res) => res.json())
  .then((data) => {
    breachTags = data;
    populateBreachDropdown(data);
  })
  .catch((err) => {
    console.error("Error loading breaches:", err);
  });

function renderCitations(data) {
  if (!data.length) {
    citationContainer.innerHTML = "<p>No citations found.</p>";
    return;
  }

  citationContainer.innerHTML = "";
  data.forEach((c) => {
    const div = document.createElement("div");
    div.className = "citation-card";
    div.innerHTML = `
      <h2>${c.case_name}</h2>
      <p><strong>Citation:</strong> ${c.citation}</p>
      <p><strong>Year:</strong> ${c.year}</p>
      <p><strong>Court:</strong> ${c.court}</p>
      <p><strong>Jurisdiction:</strong> ${c.jurisdiction}</p>
      <p><strong>Summary:</strong> ${c.summary}</p>
    `;
    citationContainer.appendChild(div);
  });
}

function populateBreachDropdown(tags) {
  const select = document.getElementById("breachTypeFilter");
  select.innerHTML = `<option value="">All Breaches</option>`;
  tags.forEach((t) => {
    const option = document.createElement("option");
    option.value = t.tag;
    option.textContent = t.tag;
    select.appendChild(option);
  });
}

// Drawer open/close logic
openDrawerBtn.addEventListener("click", () => drawer.classList.add("open"));
closeDrawerBtn.addEventListener("click", () => drawer.classList.remove("open"));
