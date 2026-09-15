(() => {
  let theme = "light";
  try {
    if (window.localStorage.getItem("rupantar-theme") === "dark") theme = "dark";
  } catch {
    /* Storage restrictions preserve the approved light default. */
  }

  document.documentElement.dataset.rhTheme = theme;
  document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";

  if (theme === "dark") {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#151412");
  }
})();
