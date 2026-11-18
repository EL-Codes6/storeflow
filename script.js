const STORAGE_KEY = "storeflow-deals";
const stages = ["New", "Contacted", "In progress", "Won"];
const sampleDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
};
const starterDeals = [
  { id: "deal-1", customer: "Olivia Chen", product: "Signature gift box", value: 1280, stage: "In progress", createdAt: sampleDate(1) },
  { id: "deal-2", customer: "Marcus Reed", product: "Monthly coffee subscription", value: 840, stage: "Contacted", createdAt: sampleDate(2) },
  { id: "deal-3", customer: "Sofia Patel", product: "Custom wedding favors", value: 2350, stage: "Won", createdAt: sampleDate(3) },
  { id: "deal-4", customer: "Ethan Brooks", product: "Seasonal candle collection", value: 560, stage: "New", createdAt: sampleDate(4) },
  { id: "deal-5", customer: "Amara Johnson", product: "Wholesale starter bundle", value: 1740, stage: "In progress", createdAt: sampleDate(5) }
];

const dealList = document.getElementById("deal-list");
const searchInput = document.getElementById("search-input");
const emptyState = document.getElementById("empty-state");
const dialog = document.getElementById("deal-dialog");
const dealForm = document.getElementById("deal-form");
const notice = document.getElementById("app-notice");

function showNotice(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function isValidDeal(deal) {
  return deal && typeof deal.id === "string" &&
    typeof deal.customer === "string" && typeof deal.product === "string" &&
    Number.isFinite(deal.value) && deal.value > 0 &&
    stages.includes(deal.stage) && !Number.isNaN(Date.parse(deal.createdAt));
}

function loadDeals() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(starterDeals));
      return [...starterDeals];
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isValidDeal)) {
      throw new Error("Stored deal data has an unexpected format.");
    }
    return parsed;
  } catch (error) {
    console.error("Unable to load saved sales deals.", error);
    showNotice("Saved deals couldn't be loaded. Showing the sample deals for now.");
    return [...starterDeals];
  }
}

let deals = loadDeals();

function saveDeals() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
    notice.hidden = true;
  } catch (error) {
    console.error("Unable to save sales deals.", error);
    showNotice("Your latest changes are only saved for this session. Check your browser storage settings.");
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2
  }).format(value);
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase();
}

function stageClass(stage) {
  return `stage-${stage.toLowerCase().replace(/\s+/g, "-")}`;
}

function createCell(className, text) {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = text;
  return cell;
}

function renderDeals() {
  const query = searchInput.value.trim().toLowerCase();
  const filteredDeals = deals.filter((deal) =>
    `${deal.customer} ${deal.product} ${deal.stage}`.toLowerCase().includes(query)
  );
  dealList.replaceChildren();

  filteredDeals.forEach((deal) => {
    const row = document.createElement("tr");
    const customerCell = document.createElement("td");
    const customerWrap = document.createElement("div");
    const avatar = document.createElement("span");
    const customerName = document.createElement("span");
    customerWrap.className = "customer-cell";
    avatar.className = "customer-avatar";
    avatar.textContent = initials(deal.customer);
    avatar.setAttribute("aria-hidden", "true");
    customerName.className = "customer-name";
    customerName.textContent = deal.customer;
    customerWrap.append(avatar, customerName);
    customerCell.append(customerWrap);

    const stageCell = document.createElement("td");
    const stageSelect = document.createElement("select");
    stageSelect.className = `stage-select ${stageClass(deal.stage)}`;
    stageSelect.setAttribute("aria-label", `Stage for ${deal.customer}`);
    stageSelect.dataset.dealId = deal.id;
    stages.forEach((stage) => {
      const option = document.createElement("option");
      option.value = stage;
      option.textContent = stage;
      option.selected = stage === deal.stage;
      stageSelect.append(option);
    });
    stageCell.append(stageSelect);

    row.append(
      customerCell,
      createCell("product-name", deal.product),
      createCell("value-cell", formatCurrency(deal.value)),
      stageCell,
      createCell("", new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(deal.createdAt)))
    );
    dealList.append(row);
  });

  const activeDeals = deals.filter((deal) => deal.stage !== "Won");
  const now = new Date();
  const wonDeals = deals.filter((deal) => {
    const createdAt = new Date(deal.createdAt);
    return deal.stage === "Won" && createdAt.getMonth() === now.getMonth() &&
      createdAt.getFullYear() === now.getFullYear();
  });
  document.getElementById("pipeline-total").textContent = formatCurrency(
    activeDeals.reduce((total, deal) => total + deal.value, 0)
  );
  document.getElementById("active-count").textContent = String(activeDeals.length);
  document.getElementById("won-total").textContent = formatCurrency(
    wonDeals.reduce((total, deal) => total + deal.value, 0)
  );
  document.getElementById("deal-count").textContent = `${filteredDeals.length} ${filteredDeals.length === 1 ? "deal" : "deals"}`;
  emptyState.hidden = filteredDeals.length > 0;
}

document.getElementById("today-label").textContent = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric"
}).format(new Date()).toUpperCase();

document.getElementById("add-deal-button").addEventListener("click", () => {
  dealForm.reset();
  dialog.showModal();
  document.getElementById("customer-input").focus();
});

document.getElementById("close-dialog").addEventListener("click", () => dialog.close());
document.getElementById("cancel-dialog").addEventListener("click", () => dialog.close());
searchInput.addEventListener("input", renderDeals);

dealList.addEventListener("change", (event) => {
  if (!event.target.matches(".stage-select")) return;
  const deal = deals.find((item) => item.id === event.target.dataset.dealId);
  if (!deal) return;
  deal.stage = event.target.value;
  saveDeals();
  renderDeals();
});

dealForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!dealForm.reportValidity()) return;

  const formData = new FormData(dealForm);
  const value = Number(formData.get("value"));
  if (!Number.isFinite(value) || value <= 0) return;

  deals.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    customer: String(formData.get("customer")).trim(),
    product: String(formData.get("product")).trim(),
    value,
    stage: String(formData.get("stage")),
    createdAt: new Date().toISOString()
  });
  saveDeals();
  searchInput.value = "";
  renderDeals();
  dialog.close();
});

renderDeals();