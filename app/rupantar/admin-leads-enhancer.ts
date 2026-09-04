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

function findLogoutButton() {
  if (window.location.pathname !== "/admin") return null;
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.includes("Logout"),
  ) ?? null;
}

function adminIsBusy() {
  return Boolean(findLogoutButton()?.disabled);
}

function syncAdminBusyControls() {
  if (window.location.pathname !== "/admin") return;
  const busy = adminIsBusy();
  const controls = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>("input, select, textarea, button"));

  for (const control of controls) {
    if (busy) {
      if (!control.disabled) {
        control.dataset.rhBusyDisabled = "true";
        control.disabled = true;
      }
      continue;
    }

    if (control.dataset.rhBusyDisabled === "true") {
      delete control.dataset.rhBusyDisabled;
      control.disabled = false;
    }
  }
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
      if (!fileInput.disabled && !adminIsBusy()) fileInput.click();
    };

    slot.addEventListener("click", openPicker);
    slot.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openPicker();
    });
  }
}

function enhanceViewSiteButton() {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (candidate) => candidate.textContent?.trim() === "View Site",
  );
  if (!button || button.dataset.rhFreshViewSite === "true") return;

  button.dataset.rhFreshViewSite = "true";
  button.addEventListener(
    "click",
    (event) => {
      if (adminIsBusy()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign("/");
    },
    true,
  );
}

export function initAdminLeadsEnhancements() {
  let enhancementScheduled = false;
  let busySyncScheduled = false;
  let watchedLogout: HTMLButtonElement | null = null;
  let busyObserver: MutationObserver | null = null;

  const scheduleBusySync = () => {
    if (busySyncScheduled) return;
    busySyncScheduled = true;
    window.requestAnimationFrame(() => {
      busySyncScheduled = false;
      syncAdminBusyControls();
    });
  };

  const watchBusySignal = () => {
    const logout = findLogoutButton();
    if (logout === watchedLogout) return;

    busyObserver?.disconnect();
    busyObserver = null;
    watchedLogout = logout;

    if (!logout) return;
    busyObserver = new MutationObserver(scheduleBusySync);
    busyObserver.observe(logout, { attributes: true, attributeFilter: ["disabled"] });
  };

  const scheduleEnhancements = () => {
    if (enhancementScheduled) return;
    enhancementScheduled = true;
    window.requestAnimationFrame(() => {
      enhancementScheduled = false;
      syncAdminBusyControls();
      enhanceAdminLeads();
      enhanceWorkImageSlots();
      enhanceViewSiteButton();
      watchBusySignal();
    });
  };

  scheduleEnhancements();

  const observer = new MutationObserver(scheduleEnhancements);
  observer.observe(document.body, { childList: true, subtree: true });
}
