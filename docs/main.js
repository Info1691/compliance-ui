document.addEventListener('DOMContentLoaded', () => {
  const citationContainer = document.getElementById('citationContainer');
  const breachFilter = document.getElementById('breachFilter');
  const openDrawerBtn = document.getElementById('openDrawerBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const drawer = document.getElementById('drawer');

  async function loadCitations() {
    try {
      const response = await fetch('docs/data/citations/citations.json');
      const data = await response.json();

      citationContainer.innerHTML = '';
      data.forEach(citation => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <h2>${citation.case_name}</h2>
          <p><strong>Citation:</strong> ${citation.citation}</p>
          <p><strong>Year:</strong> ${citation.year}</p>
          <p><strong>Court:</strong> ${citation.court}</p>
          <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
          <p><strong>Summary:</strong> ${citation.summary}</p>
        `;
        citationContainer.appendChild(card);
      });
    } catch (e) {
      citationContainer.innerHTML = 'Error loading citations.';
      console.error('Error loading citations:', e);
    }
  }

  async function loadBreaches() {
    try {
      const res = await fetch('docs/data/breaches/breaches.json');
      const breaches = await res.json();
      breachFilter.innerHTML = `<option value="">All</option>`;
      breaches.forEach(entry => {
        const option = document.createElement('option');
        option.value = entry.tag;
        option.textContent = entry.tag;
        breachFilter.appendChild(option);
      });
    } catch (e) {
      console.error("Error loading breaches:", e);
    }
  }

  // Drawer open/close
  openDrawerBtn.addEventListener('click', () => drawer.classList.add('open'));
  closeDrawerBtn.addEventListener('click', () => drawer.classList.remove('open'));

  loadCitations();
  loadBreaches();
});
