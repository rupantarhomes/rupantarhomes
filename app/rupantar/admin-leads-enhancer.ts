type LeadSectionKind = "estimate" | "queries";

let activeLeadSection: LeadSectionKind | null = null;
let lastLeadsPage: HTMLElement | null = null;

function findHeading<T extends HTMLElement>(selector: string, text: string, root: ParentNode = document) {
  return Array.from(root.querySelectorAll<T>(selector)).find((element) => element.textContent?.trim() === text);
}

function setSectionState(
  selector: HTMLElement,
  estimateSection: HTMLElement,
  querySection: HTMLElement,
  kind: LeadSectionKind | null,
) {
  activeLeadSection = kind;

  const sections: Array<[LeadSectionKind, HTMLElement]> = [
    ["estimate", estimateSection],
    ["queries", querySection],
  ];

  sections.forEach(([sectionKind, section]) => {
    const open = kind === sectionKind;
    section.classList.toggle("is-open", open);
    const button = selector.querySelector<HTMLButtonElement>(`[data-rh-lead-selector="${sectionKind}"]`);
    button?.classList.toggle("is-active", open);
    button?.setAttribute("aria-expanded", String(open));
  });
}

function selectorButton(kind: LeadSectionKind, label: string, count: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "rh-admin-leads-selector-card";
  button.dataset.rhLeadSelector = kind;
  button.setAttribute("aria-expanded", "false");

  const top = document.createElement("span");
  top.className = "rh-admin-leads-selector-top";

  const title = document.createElement("span");
  title.className = "rh-admin-leads-selector-title";
  title.textContent = label;

  const badge = document.createElement("span");
  badge.className = "rh-admin-leads-selector-count";
  badge.dataset.rhLeadSelectorCount = kind;
  badge.textContent = count;

  const arrow = document.createElement("span");
  arrow.className = "rh-admin-leads-selector-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "›";

  top.append(title, badge);
  button.append(top, arrow);
  return button;
}

function enhanceAdminLeads() {
  const leadsHeading = findHeading<HTMLHeadingElement>("h1", "Leads");
  if (!leadsHeading) {
    activeLeadSection = null;
    lastLeadsPage = null;
    return;
  }

  const page = leadsHeading.parentElement?.parentElement;
  if (!(page instanceof HTMLElement)) return;

  const estimateHeading = findHeading<HTMLHeadingElement>("h2", "Estimate Leads", page);
  const queriesHeading = findHeading<HTMLHeadingElement>("h2", "Website Queries", page);
  const estimateSection = estimateHeading?.closest("section");
  const querySection = queriesHeading?.closest("section");
  if (!(estimateSection instanceof HTMLElement) || !(querySection instanceof HTMLElement)) return;

  const estimateHeader = estimateHeading.parentElement;
  const queryHeader = queriesHeading.parentElement;
  const estimatePanel = estimateHeader?.nextElementSibling;
  const queryPanel = queryHeader?.nextElementSibling;
  if (!(estimateHeader instanceof HTMLElement) || !(queryHeader instanceof HTMLElement)) return;
  if (!(estimatePanel instanceof HTMLElement) || !(queryPanel instanceof HTMLElement)) return;

  estimateSection.classList.add("rh-admin-lead-section", "rh-admin-lead-section-estimate");
  querySection.classList.add("rh-admin-lead-section", "rh-admin-lead-section-queries");
  estimateHeader.classList.add("rh-admin-lead-original-header");
  queryHeader.classList.add("rh-admin-lead-original-header");
  estimatePanel.classList.add("rh-admin-lead-panel");
  queryPanel.classList.add("rh-admin-lead-panel");

  const estimateCount = estimateHeader.querySelector("span")?.textContent?.trim() || "0";
  const queryCount = queryHeader.querySelector("span")?.textContent?.trim() || "0";

  let selector = page.querySelector<HTMLElement>("[data-rh-admin-leads-selector]");
  if (!selector) {
    selector = document.createElement("div");
    selector.className = "rh-admin-leads-selector";
    selector.dataset.rhAdminLeadsSelector = "true";

    const estimateButton = selectorButton("estimate", "Estimate Leads", estimateCount);
    const queryButton = selectorButton("queries", "Website Queries", queryCount);
    selector.append(estimateButton, queryButton);
    estimateSection.before(selector);

    estimateButton.addEventListener("click", () => {
      setSectionState(selector!, estimateSection, querySection, activeLeadSection === "estimate" ? null : "estimate");
    });
    queryButton.addEventListener("click", () => {
      setSectionState(selector!, estimateSection, querySection, activeLeadSection === "queries" ? null : "queries");
    });
  }

  selector.querySelector<HTMLElement>('[data-rh-lead-selector-count="estimate"]')!.textContent = estimateCount;
  selector.querySelector<HTMLElement>('[data-rh-lead-selector-count="queries"]')!.textContent = queryCount;

  if (lastLeadsPage !== page) {
    activeLeadSection = null;
    lastLeadsPage = page;
  }

  setSectionState(selector, estimateSection, querySection, activeLeadSection);
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
