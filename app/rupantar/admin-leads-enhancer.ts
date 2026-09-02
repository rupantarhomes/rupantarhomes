const leadSectionTitles = ["Estimate Leads", "Website Queries"] as const;

function findLeadHeading(title: (typeof leadSectionTitles)[number]) {
  return Array.from(document.querySelectorAll<HTMLHeadingElement>("h2")).find(
    (heading) => heading.textContent?.trim() === title,
  );
}

function setSectionOpen(section: HTMLElement, header: HTMLElement, panel: HTMLElement, open: boolean) {
  section.dataset.rhLeadOpen = String(open);
  section.style.display = "block";
  header.style.display = "flex";
  header.style.cursor = "pointer";
  header.setAttribute("aria-expanded", String(open));
  panel.hidden = !open;
  panel.style.display = open ? "block" : "none";
}

function enhanceLeadSection(title: (typeof leadSectionTitles)[number]) {
  const heading = findLeadHeading(title);
  const section = heading?.closest("section");
  const header = heading?.parentElement;
  const panel = header?.nextElementSibling;

  if (!(section instanceof HTMLElement) || !(header instanceof HTMLElement) || !(panel instanceof HTMLElement)) return;

  section.classList.remove(
    "rh-admin-lead-section",
    "rh-admin-lead-section-estimate",
    "rh-admin-lead-section-queries",
    "is-open",
  );
  header.classList.remove("rh-admin-lead-original-header", "rh-admin-lead-toggle");
  panel.classList.remove("rh-admin-lead-panel");

  section.style.display = "block";
  header.style.display = "flex";
  header.style.cursor = "pointer";

  if (header.dataset.rhLeadToggleReady !== "true") {
    header.dataset.rhLeadToggleReady = "true";
    header.setAttribute("role", "button");
    header.setAttribute("tabindex", "0");
    header.setAttribute("aria-controls", `${title.toLowerCase().replace(/\s+/g, "-")}-panel`);
    panel.id = `${title.toLowerCase().replace(/\s+/g, "-")}-panel`;

    setSectionOpen(section, header, panel, false);

    const toggle = () => {
      setSectionOpen(section, header, panel, section.dataset.rhLeadOpen !== "true");
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

  document.querySelectorAll<HTMLElement>("[data-rh-admin-leads-selector]").forEach((selector) => selector.remove());
  leadSectionTitles.forEach(enhanceLeadSection);
}

function enhanceWorkImageSlots() {
  const worksHeading = Array.from(document.querySelectorAll<HTMLHeadingElement>("h1")).find(
    (heading) => heading.textContent?.trim() === "Manage Works",
  );
  if (!worksHeading) return;

  const fileInput = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]')).find(
    (input) => input.multiple && input.accept.includes("image/jpeg"),
  );
  if (!fileInput) return;

  const emptyLabels = Array.from(document.querySelectorAll<HTMLElement>("span")).filter(
    (label) => label.textContent?.trim() === "Empty",
  );

  for (const emptyLabel of emptyLabels) {
    const slot = emptyLabel.parentElement;
    if (!(slot instanceof HTMLElement) || slot.dataset.rhWorkSlotReady === "true") continue;

    slot.dataset.rhWorkSlotReady = "true";
    slot.setAttribute("role", "button");
    slot.setAttribute("tabindex", "0");
    slot.setAttribute("aria-label", "Add work image");
    slot.style.cursor = "pointer";

    const openPicker = () => {
      if (!fileInput.disabled) fileInput.click();
    };

    slot.addEventListener("click", openPicker);
    slot.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openPicker();
    });
  }
}

export function initAdminLeadsEnhancements() {
  let scheduled = false;

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceAdminLeads();
      enhanceWorkImageSlots();
    });
  };

  schedule();

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
}
