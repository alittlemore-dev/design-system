(() => {
  try {
    const documentElement = globalThis.document?.documentElement;
    if (!documentElement) return;

    let theme = documentElement.getAttribute('data-bs-theme');

    try {
      const storedTheme = globalThis.window?.localStorage?.getItem('chosenTheme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        theme = storedTheme;
      }
    } catch {}

    if (theme !== 'light' && theme !== 'dark') {
      theme = 'light';
    }

    documentElement.setAttribute('data-bs-theme', theme);
  } catch {}
})();
