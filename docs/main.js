(() => {
  const cacheBust = `v=${Date.now()}`;

  function $(sel, root=document){ return root.querySelector(sel); }
  function el(tag, cls){ const e=document.createElement(tag); if(cls)e.className=cls; return e; }

  function safeAdd(elm, ev, fn){
    if(!elm) return;
    elm.addEventListener(ev, fn);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const drawer = $('#drawer');
    const openBtn = $('#openDrawerBtn');
    const closeBtn = $('#closeDrawerBtn');
    const container = $('#citationsContainer');
    const breachFilter = $('#breachFilter');
    const keywordSearch = $('#keywordSearch');

    // Drawer events
    safeAdd(openBtn, 'click', () => drawer.classList.add('open'));
    safeAdd(closeBtn, 'click', () => drawer.classList.remove('open'));

    // Load data (paths are relative to /docs/)
    let citations = [];
    let breaches = [];

    try{
      const [cRes, bRes] = await Promise.all([
        fetch(`./data/citations/citations.json?${cacheBust}`),
        fetch(`./data/breaches/breaches.json?${cacheBust}`)
      ]);
      if(!cRes.ok || !bRes.ok) throw new Error('Fetch failed');
      citations = await cRes.json();
      breaches  = await bRes.json();
    }catch(err){
      console.error(err);
      container.innerHTML = `<p>Error loading citations.</p>`;
      return;
    }

    // Populate breach filter
    const tags = Array.from(new Set(
      breaches.map(b => b.tag).filter(Boolean)
    )).sort();
    breachFilter.innerHTML = `<option value="__all">All</option>` +
      tags.map(t => `<option>${t}</option>`).join('');

    const state = { q:'', tag:'__all' };

    function matches(c){
      const q = state.q.trim().toLowerCase();
      const hitTag = state.tag==='__all' || (c.canonical_breach_tag||'').toLowerCase()===state.tag.toLowerCase();
      if(!q) return hitTag;
      const hay = JSON.stringify(c).toLowerCase();
      return hitTag && hay.includes(q);
    }

    function render(){
      const list = citations.filter(matches);
      if(!list.length){ container.innerHTML = `<p>No citations.</p>`; return; }
      const frag = document.createDocumentFragment();
      list.forEach(c => {
        const card = el('article', 'citation-card');
        card.innerHTML = `
          <h2>${c.case_name||''}</h2>
          ${row('Citation', c.citation)}
          ${row('Year', c.year)}
          ${row('Court', c.court)}
          ${row('Jurisdiction', c.jurisdiction)}
          ${row('Summary', c.summary)}
          ${row('Legal Principle', c.legal_principle)}
          ${row('Holding', c.holding)}
          ${row('Authority Basis', c.authority_basis)}
          ${row('Sources', (c.sources||[]).join(', '))}
          ${row('Compliance Flags', (c.compliance_flags||[]).join(', '))}
        `;
        frag.appendChild(card);
      });
      container.innerHTML = '';
      container.appendChild(frag);
    }

    function row(label, val){
      if(!val) return '';
      return `<p><strong>${label}:</strong> ${escapeHTML(val)}</p>`;
    }

    function escapeHTML(s){
      return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

    // Events
    safeAdd(breachFilter, 'change', e => { state.tag = e.target.value; render(); });
    safeAdd(keywordSearch, 'input', e => { state.q = e.target.value; render(); });

    // Initial render
    render();
  });
})();
