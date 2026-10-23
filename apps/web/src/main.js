import { loadCaptures, saveCaptures, makeCapture, visibleCaptures } from "./store.js";

const $ = selector => document.querySelector(selector);
const form = $("#capture-form");
const draft = $("#capture-text");
const saveButton = $("#save-button");
const list = $("#capture-list");
const search = $("#search");
const count = $("#capture-count");
const status = $("#status");
const composeLabel = $("#compose-label");
const filters = Array.from(document.querySelectorAll("[data-filter]"));
let captures = loadCaptures();
let activeFilter = "all";
let editingId = null;
let statusTimer = null;

function say(message) {
  status.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { status.textContent = ""; }, 2800);
}

function isLink(text) {
  return /^https?:\/\//i.test(text.trim());
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "Saved";
  }
}

function persist() {
  if (!saveCaptures(captures)) say("Browser storage is unavailable or full. Export your inbox before closing.");
}

function render() {
  const shown = visibleCaptures(captures, activeFilter, search.value);
  count.textContent = captures.length + (captures.length === 1 ? " item" : " items");
  list.replaceChildren();

  if (!shown.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    const title = document.createElement("strong");
    title.textContent = captures.length ? "No matching captures" : "Your inbox is clear";
    const description = document.createElement("p");
    description.textContent = captures.length
      ? "Try another search or switch the filter."
      : "Paste a link or write a thought above. Everything you save lives in this browser profile.";
    empty.append(title, description);
    list.append(empty);
    return;
  }

  shown.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "item" + (item.pinned ? " pinned" : "");
    card.style.animationDelay = Math.min(index * 25, 175) + "ms";

    const head = document.createElement("div");
    head.className = "item-head";
    const kind = document.createElement("span");
    kind.className = "kind";
    kind.textContent = item.pinned ? "Pinned" : (isLink(item.text) ? "Link" : "Note");
    const pin = makeAction(item.pinned ? "Unpin" : "Pin", "pin", item.id);
    head.append(kind, pin);

    const body = document.createElement("p");
    body.className = "item-text" + (isLink(item.text) ? " link" : "");
    body.textContent = item.text;
    if (isLink(item.text)) {
      const url = document.createElement("a");
      url.href = item.text.trim();
      url.target = "_blank";
      url.rel = "noopener noreferrer";
      url.textContent = "Open link ↗";
      url.style.cssText = "display:inline-block;margin-top:12px;color:#aaa;font-size:11px;text-decoration:none";
      body.append(document.createElement("br"), url);
    }

    const foot = document.createElement("div");
    foot.className = "item-foot";
    const date = document.createElement("span");
    date.className = "date";
    date.textContent = formatDate(item.updatedAt || item.createdAt);
    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(
      makeAction("Copy", "copy", item.id),
      makeAction("Edit", "edit", item.id),
      makeAction("Delete", "delete", item.id)
    );
    foot.append(date, actions);
    card.append(head, body, foot);
    list.append(card);
  });
}

function makeAction(label, action, id) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action";
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = id;
  return button;
}

function resetEditor() {
  editingId = null;
  draft.value = "";
  composeLabel.textContent = "Quick capture";
  saveButton.textContent = "Save to inbox ↗";
  saveButton.disabled = true;
}

draft.addEventListener("input", () => {
  saveButton.disabled = !draft.value.trim();
});
draft.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && draft.value.trim()) {
    event.preventDefault();
    form.requestSubmit();
  }
});
form.addEventListener("submit", event => {
  event.preventDefault();
  const text = draft.value.trim();
  if (!text) return;
  const existing = editingId ? captures.find(item => item.id === editingId) : null;
  if (existing) {
    captures = captures.map(item => item.id === editingId
      ? { ...item, text: text.slice(0, 100000), updatedAt: Date.now() }
      : item);
    say("Capture updated");
  } else {
    captures.unshift(makeCapture(text));
    say("Saved to this device");
  }
  persist();
  resetEditor();
  render();
});
search.addEventListener("input", render);
filters.forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  filters.forEach(item => item.classList.toggle("active", item === button));
  render();
}));

list.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  const item = captures.find(entry => entry.id === id);
  if (!item) return;

  if (action === "pin") {
    captures = captures.map(entry => entry.id === id ? { ...entry, pinned: !entry.pinned, updatedAt: Date.now() } : entry);
    persist();
    render();
    say(item.pinned ? "Removed from pinned" : "Pinned for later");
  } else if (action === "delete") {
    captures = captures.filter(entry => entry.id !== id);
    if (editingId === id) resetEditor();
    persist();
    render();
    say("Capture deleted");
  } else if (action === "edit") {
    editingId = id;
    draft.value = item.text;
    composeLabel.textContent = "Edit capture";
    saveButton.textContent = "Save changes ↗";
    saveButton.disabled = false;
    draft.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (action === "copy") {
    try {
      await navigator.clipboard.writeText(item.text);
      say("Copied to clipboard");
    } catch {
      draft.value = item.text;
      draft.focus();
      draft.select();
      say("Clipboard access blocked. Text placed in the editor for manual copying.");
    }
  }
});

$("#export-button").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), captures }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "linka-inbox.json";
  anchor.click();
  URL.revokeObjectURL(url);
  say("Inbox export created");
});
$("#import-button").addEventListener("click", () => $("#import-file").click());
$("#import-file").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const imported = Array.isArray(parsed) ? parsed : parsed.captures;
    if (!Array.isArray(imported)) throw new Error("Invalid file");
    const normalized = imported.map(item => makeCapture(item.text, item)).filter(Boolean);
    const map = new Map(captures.map(item => [item.id, item]));
    normalized.forEach(item => map.set(item.id, item));
    captures = Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 1000);
    persist();
    render();
    say("Imported " + normalized.length + " capture(s)");
  } catch {
    say("That file is not a valid Linka JSON export");
  } finally {
    event.target.value = "";
  }
});

render();