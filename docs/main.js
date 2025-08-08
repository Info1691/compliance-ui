document.addEventListener('DOMContentLoaded', () => {
  const drawer = document.getElementById('drawer');
  const openDrawerBtn = document.getElementById('openDrawerBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const citationsContainer = document.getElementById('citationsContainer');
  const breachFilter = document.getElementById('breachFilter');
  const keywordSearch = document.getElementById('keywordSearch');

  // Drawer wiring
  if (openDrawerBtn && drawer) {
    openDrawerBtn.addEventListener('click', () => {
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
    });
  }
  if (closeDrawerBtn && drawer) {
    closeDrawerBtn.addEventListener('click', () => {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    });
  }

  // Data endpoints (cache-bust with v=timestamp)
  const citationsURL = `./data/citations/citations.json?v=${Date.now()}`;
  const breachesURL  = `./data/breaches/breaches.json?v=${Date.now()}`;

  // Load + render
  Promise.all([
    fetch(citationsURL),
    fetch(breachesURL)
  ])
  .then(async ([citRes, breachRes]) => {
    // Use info logs to avoid red console noise
    console.info('CITATIONS fetch:', citRes.status, citRes.url);
    console.info('BREACHES fetch:', breachRes.status, breachRes.url);

    if (!citRes.ok || !breachRes.ok) throw new Error('Failed to fetch data');
    const citations = await citRes.json();
    const breachTags = await breachRes.json();

    populateFilter(breachTags);
    renderCitations(citations);

    // Wire up filter/search
    breachFilter.addEventListener('change', () => {
      renderCitations(filterSearch(citations));
    });
    keywordSearch.addEventListener('input', () => {
      renderCitations(filterSearch(citations));
    });
  })
  .catch(err => {
    console.error('Error loading citations or breaches:', err);
    if (citationsContainer) citationsContainer.innerHTML = `<p>Error loading citations.</p>`;
  });

  function populateFilter(tags) {
    if (!Array.isArray(tags)) return;
    breachFilter.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = 'All';
    breachFilter.appendChild(optAll);

    tags.forEach(t => {
      const opt = document.createElement('option');
      opt.value = String(t).trim();
      opt.textContent = String(t).trim();
      breachFilter.appendChild(opt);
    });
  }

  function filterSearch(all) {
    const byTag = breachFilter.value.trim().toLowerCase();
    const q = keywordSearch.value.trim().toLowerCase();

    return all.filter(item => {
      // tag match?
      let tagPass = true;
      if (byTag) {
        const flags = Array.is
