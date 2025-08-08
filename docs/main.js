document.addEventListener('DOMContentLoaded', () => {
  const drawer = document.getElementById('drawer');
  const openDrawerBtn = document.getElementById('openDrawerBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const citationsContainer = document.getElementById('citationsContainer');
  const breachFilter = document.getElementById('breachFilter');
  const searchInput = document.getElementById('searchInput');

  // --- Drawer wiring (guarded to avoid null errors)
  if (openDrawerBtn && drawer) {
    openDrawerBtn.addEventListener('click', () => drawer.classList.add('open'));
  }
  if (closeDrawerBtn && drawer) {
    closeDrawerBtn.addEventListener
