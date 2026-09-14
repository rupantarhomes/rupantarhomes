if (window.location.pathname.startsWith("/admin")) {
  for (const href of ["/admin-work-actions.css", "/admin-work-actions-v2.css"]) {
    if (document.head.querySelector(`link[href="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
  void import("./admin-mobile-lock");
}
