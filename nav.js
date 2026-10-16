fetch('nav.html')
  .then(response => response.text())
  .then(html => {
    document.getElementById('site-header').innerHTML = html;

    const themeToggle = document.querySelector('.theme-toggle');
    const themeIcon = document.querySelector('.theme-toggle__icon');
    const body = document.body;
    const storedTheme = localStorage.getItem('theme');

    function updateThemeIcon(isDarkMode) {
      if (!themeIcon) return;
      themeIcon.textContent = isDarkMode ? '☀️' : '🌙';
    }

    if (storedTheme === 'dark') {
      body.classList.add('dark-mode');
      updateThemeIcon(true);
    } else {
      updateThemeIcon(false);
    }

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