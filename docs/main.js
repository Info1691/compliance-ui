async function loadCitations() {
  try {
    const response = await fetch('docs/data/citations/citations.json');
    const citations = await response.json();
    displayCitations(citations);
  } catch (err) {
    console.error("Error loading citations:", err);
    document.getElementById('citationList').innerHTML = 'Error loading citations.';
  }
}

async function loadBreaches() {
  try {
    const response = await fetch('docs/data/breaches/breaches.json');
    const breaches = await response.json();
    const filter = document.getElementById('breachFilter');
    breaches.forEach(b => {
      const option = document.createElement('option');
      option.value = b.tag;
      option.textContent = b.tag;
      filter.appendChild(option);
    });
  } catch (err) {
    console.warn("Breaches not loaded (optional file):", err);
    document.getElementById('breachFilter').innerHTML = '<option value="">(Unavailable)</option>';
  }
}

function displayCitations(citations) {
  const container = document.getElementById('citationList');
  container.innerHTML = '';
  citations.forEach(cite => {
    const card = document.createElement('div');
    card.className = 'citation-card';
    card.innerHTML = `
      <h3>${cite.case_name}</h3>
      <p><strong>Citation:</strong> ${cite.citation}</p>
      <p><strong>Year:</strong> ${cite.year}</p>
      <p><strong>Court:</strong> ${cite.court}</p>
      <p><strong>Jurisdiction:</strong> ${cite.jurisdiction}</p>
      <p><strong>Summary:</strong> ${cite.summary}</p>
    `;
    container.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadCitations();
  loadBreaches();

  const drawer = document.getElementById('drawer');
  const openBtn = document.getElementById('openDrawerBtn');
  const closeBtn = document.getElementById('closeDrawerBtn');

  openBtn.addEventListener('click', () => drawer.classList.add('open'));
  closeBtn.addEventListener('click', () => drawer.classList.remove('open'));
});
