// Apply the saved theme straight away, not after the nav has been fetched,
// so the page doesn't flash light first
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
}

fetch('nav.html')
  .then(response => response.text())
  .then(html => {
    document.getElementById('site-header').innerHTML = html;

    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = document.querySelector('.theme-toggle__icon');
    const body = document.body;

    function updateThemeIcon(isDarkMode) {
      if (!themeIcon) return;
      themeIcon.textContent = isDarkMode ? '☀️' : '🌙';
    }

    updateThemeIcon(body.classList.contains('dark-mode'));

    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const isDarkMode = body.classList.toggle('dark-mode');

        if (isDarkMode) {
          localStorage.setItem('theme', 'dark');
          updateThemeIcon(true);
        } else {
          localStorage.setItem('theme', 'light');
          updateThemeIcon(false);
        }
      });
    }
  });
