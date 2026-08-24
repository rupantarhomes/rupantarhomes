const leadSectionTitles = ["Estimate Leads", "Website Queries"] as const;

function findLeadHeading(title: (typeof leadSectionTitles)[number]) {
  return Array.from(document.querySelectorAll<HTMLHeadingElement>("h2")).find(
    (heading) => heading.textContent?.trim() === title,
  );
}

function setSectionOpen(section: HTMLElement, header: HTMLElement, panel: HTMLElement, open: boolean) {
  section.dataset.rhLeadOpen = String(open);
  section.classList.toggle("is-open", open);
  header.setAttribute("aria-expanded", String(open));
  panel.hidden = !open;
}

function enhanceLeadSection(title: (typeof leadSectionTitles)[number]) {
  const heading = findLeadHeading(title);
  const section = heading?.closest("section");
  const header = heading?.parentElement;
  const panel = header?.nextElementSibling;

  if (!(section instanceof HTMLElement) || !(header instanceof HTMLElement) || !(panel instanceof HTMLElement)) return;

  section.classList.add("rh-admin-lead-section");
  header.classList.add("rh-admin-lead-toggle");
  panel.classList.add("rh-admin-lead-panel");

  if (header.dataset.rhLeadToggleReady !== "true") {
    header.dataset.rhLeadToggleReady = "true";
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    header.setAttribute("aria-controls", `${title.toLowerCase().replace(/\s+/g, "-")}-panel`);
    panel.id = `${title.toLowerCase().replace(/\s+/g, "-")}-panel`;

    setSectionOpen(section, header, panel, false);

    const toggle = () => {
      const open = section.dataset.rhLeadOpen !== "true";
      setSectionOpen(section, header, panel, open);
    };

    header.addEventListener("click", toggle);
    header.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggle();
    });
  } else {
    setSectionOpen(section, header, panel, section.dataset.rhLeadOpen === "true");
  }
}

function enhanceAdminLeads() {
  const leadsHeading = Array.from(document.querySelectorAll<HTMLHeadingElement>("h1")).find(
    (heading) => heading.textContent?.trim() === "Leads",
  );
  if (!leadsHeading) return;

  leadSectionTitles.forEach(enhanceLeadSection);
}

export function initAdminLeadsEnhancements() {
  let scheduled = false;

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceAdminLeads();
    });
  };

  schedule();

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
}
