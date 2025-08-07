document.addEventListener('DOMContentLoaded', () => {
  const drawer = document.getElementById('drawer');
  const openDrawerBtn = document.getElementById('openDrawerBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const citationsContainer = document.getElementById('citationsContainer');
  const breachFilter = document.getElementById('breachFilter');

  if (openDrawerBtn) {
    openDrawerBtn.addEventListener('click', () => {
      drawer.classList.add('open');
    });
  }

  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', () => {
      drawer.classList.remove('open');
    });
  }

  // Load citations
  fetch('citations.json')
    .then(response => {
      if (!response.ok) throw new Error('Citation fetch failed');
      return response.json();
    })
    .then(data => {
      renderCitations(data);
    })
    .catch(err => {
      console.error("Error loading citations:", err);
      citationsContainer.innerHTML = "<p>Error loading citations.</p>";
    });

  function renderCitations(data) {
    citationsContainer.innerHTML = '';
    data.forEach(citation => {
      const div = document.createElement('div');
      div.className = 'citation-card';
      div.innerHTML = `
        <h3>${citation.case_name}</h3>
        <p><strong>Citation:</strong> ${citation.citation}</p>
        <p><strong>Year:</strong> ${citation.year}</p>
        <p><strong>Court:</strong> ${citation.court}</p>
        <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
        <p><strong>Summary:</strong> ${citation.summary}</p>
      `;
      citationsContainer.appendChild(div);
    });
  }
});
