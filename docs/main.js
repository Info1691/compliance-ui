document.addEventListener('DOMContentLoaded', () => {
  const citationContainer = document.getElementById('citationContainer');
  const breachFilter = document.getElementById('breachFilter');
  const openBtn = document.getElementById('openDrawerBtn');
  const closeBtn = document.getElementById('closeDrawerBtn');
  const drawer = document.getElementById('drawer');

  // Drawer toggle
  openBtn.addEventListener('click', () => drawer.classList.add('open'));
  closeBtn.addEventListener('click', () => drawer.classList.remove('open'));

  // Load citations
  fetch('docs/data/citations/citations.json')
    .then(r => r.json())
    .then(data => {
      citationContainer.innerHTML = '';
      data.forEach(c => {
        const card = document.createElement('div');
        card.className = 'citation-card';
        card.innerHTML = `
          <h3>${c.case_name}</h3>
          <p><strong>Citation:</strong> ${c.citation}</p>
          <p><strong>Year:</strong> ${c.year}</p>
          <p><strong>Court:</strong> ${c.court}</p>
          <p><strong>Jurisdiction:</strong> ${c.jurisdiction}</p>
          <p><strong>Summary:</strong> ${c.summary}</p>
        `;
        citationContainer.appendChild(card);
      });
    })
    .catch(e => {
      console.error('Error loading citations:', e);
      citationContainer.innerHTML = '<p>Error loading citations.</p>';
    });

  // Load breaches (not critical)
  fetch('docs/data/breaches/breaches.json')
    .then(r => r.json())
    .then(data => {
      breachFilter.innerHTML = '<option value="">All</option>';
      data.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.tag;
        opt.textContent = b.tag;
        breachFilter.appendChild(opt);
      });
    })
    .catch(e => {
      console.warn('Breaches not loaded (optional):', e);
    });
});
