import { loadCaptures, saveCaptures, makeCapture, visibleCaptures } from "./store.js";
import {
  addDeletedId, createCloudAccount, disconnectCloud, getCloudConfig, getCloudSession,
  readDeletedIds, saveCloudConfig, signInCloud, syncCloudCaptures
} from "./cloud-sync.js";

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
const modalRoot = $("#modal-root");
const TERMS_VERSION = "2026-10-23-v2";
const TERMS_TEXT = `
Linka is a personal inbox for saving text and links on the device or browser profile where you use it.

1. Local storage. Your captures are stored in browser-local storage or local app storage. Clearing app data, resetting a browser, uninstalling the app or device failure may erase information. Export backups that matter to you.

2. Optional cloud sync. Linka keeps captures locally and can sync them across your devices when you configure the same Supabase project and sign in to the same account. Keep a backup of important data; local use and manual export/import remain available.

3. Your responsibility. You are responsible for the content you save, your device security and keeping backups. Do not rely on Linka as the only copy of critical, regulated or irreplaceable information.

4. External content. Linka may open links in other apps or your browser. Those destinations are operated by third parties and have their own terms and privacy practices.

5. Availability. Linka is provided as an early-stage utility. Features may change, and it is not guaranteed to be error-free or available on every device.

6. Acceptable use. Do not use Linka to store or distribute unlawful content or content that violates another person's rights. Keep sensitive information out of shared devices.

By selecting “I agree”, you confirm that you have read these terms and understand local storage, optional cloud synchronization and the need to keep backups. This notice is an in-app product agreement, not a substitute for professional legal advice.`;
let captures = loadCaptures();
let activeFilter = "all";
let editingId = null;
let statusTimer = null;
let cloudSyncTimer = null;
let cloudSyncBusy = false;
let cloudSyncStatus = "";
const desktopBuildVersion = String(import.meta.env.VITE_LINKA_DESKTOP_VERSION || "").trim();
let themeMode = localStorage.getItem("linka.theme") || "dark";
let reduceMotion = localStorage.getItem("linka.reduceMotion") === "true";

function say(message) {
  status.textContent = message;
  status.style.opacity = "1";
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { status.style.opacity = "0"; }, 2800);
}
function isLink(text) { return /^https?:\/\//i.test(text.trim()); }
function formatDate(value) {
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return "Saved"; }
}
function persist() {
  if (!saveCaptures(captures)) say("Storage unavailable or full. Export a backup before closing.");
  scheduleCloudSync();
}
function scheduleCloudSync() {
  if (!getCloudSession()) return;
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => { void syncNow({ silent: true }).catch(() => {}); }, 1400);
}
async function syncNow({ silent = false } = {}) {
  if (cloudSyncBusy) return null;
  cloudSyncBusy = true;
  try {
    const result = await syncCloudCaptures(captures, readDeletedIds());
    captures = result.captures;
    saveCaptures(captures);
    cloudSyncStatus = result.message;
    render();
    if (!silent) say(result.message);
    return result;
  } catch (error) {
    cloudSyncStatus = error?.message || "Cloud sync failed";
    if (!silent) say("Sync failed: " + cloudSyncStatus);
    throw error;
  } finally {
    cloudSyncBusy = false;
  }
}
function compareVersions(a, b) {
  const left = String(a || "").match(/\d+/g)?.map(Number) || [];
  const right = String(b || "").match(/\d+/g)?.map(Number) || [];
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const x = left[i] || 0, y = right[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function applyTheme(mode = themeMode) {
  themeMode = mode;
  document.documentElement.dataset.theme = mode;
  localStorage.setItem("linka.theme", mode);
}
applyTheme();

function render() {
  const shown = visibleCaptures(captures, activeFilter, search.value);
  count.textContent = captures.length + (captures.length === 1 ? " item" : " items");
  list.replaceChildren();
  if (!shown.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.innerHTML = '<span class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M3 12h18"/></svg></span>';
    const title = document.createElement("strong");
    title.textContent = captures.length ? "Nothing matches this view" : "A little room for what matters";
    const description = document.createElement("p");
    description.textContent = captures.length ? "Try another search or switch the filter." : "Paste a link or write a thought above. It will stay in this browser profile until you remove it.";
    empty.append(title, description);
    list.append(empty);
    return;
  }
  shown.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "item" + (item.pinned ? " pinned" : "");
    card.style.setProperty("--index", String(index));
    const head = document.createElement("div"); head.className = "item-head";
    const kind = document.createElement("span"); kind.className = "kind";
    kind.textContent = item.pinned ? "Pinned" : (isLink(item.text) ? "Link" : "Note");
    head.append(kind, makeAction(item.pinned ? "Unpin" : "Pin", "pin", item.id));
    const body = document.createElement("p");
    body.className = "item-text" + (isLink(item.text) ? " link" : "");
    body.textContent = item.text;
    if (isLink(item.text)) {
      const url = document.createElement("a");
      url.href = item.text.trim(); url.target = "_blank"; url.rel = "noopener noreferrer";
      url.className = "open-link"; url.textContent = "Open link ↗";
      body.append(document.createElement("br"), url);
    }
    const foot = document.createElement("div"); foot.className = "item-foot";
    const date = document.createElement("span"); date.className = "date"; date.textContent = formatDate(item.updatedAt || item.createdAt);
    const actions = document.createElement("div"); actions.className = "actions";
    actions.append(makeAction("Copy", "copy", item.id), makeAction("Edit", "edit", item.id), makeAction("Delete", "delete", item.id));
    foot.append(date, actions); card.append(head, body, foot); list.append(card);
  });
}
function makeAction(label, action, id) {
  const button = document.createElement("button");
  button.type = "button"; button.className = "action"; button.textContent = label;
  button.dataset.action = action; button.dataset.id = id;
  return button;
}
function resetEditor() {
  editingId = null; draft.value = ""; composeLabel.textContent = "Quick capture";
  saveButton.innerHTML = 'Save to inbox <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M7 7h10v10"/></svg>';
  saveButton.disabled = true;
}
function modalShell(content, { dismissable = false } = {}) {
  const layer = document.createElement("div");
  layer.className = "modal-layer";
  layer.innerHTML = '<section class="modal" role="dialog" aria-modal="true"></section>';
  layer.firstElementChild.append(content);
  if (dismissable) {
    layer.addEventListener("click", event => { if (event.target === layer) layer.remove(); });
    const esc = event => { if (event.key === "Escape") { layer.remove(); document.removeEventListener("keydown", esc); } };
    document.addEventListener("keydown", esc);
  }
  modalRoot.replaceChildren(layer);
  return layer;
}
function addTermsBody(container) {
  const head = document.createElement("div"); head.className = "modal-head";
  const logo = document.createElement("img"); logo.className = "modal-logo"; logo.src = "/linka-mark.svg"; logo.alt = "";
  const meta = document.createElement("div");
  const title = document.createElement("h2"); title.textContent = "A quick agreement";
  const subtitle = document.createElement("p"); subtitle.textContent = "Please read this before using Linka";
  meta.append(title, subtitle); head.append(logo, meta); container.append(head);
  const body = document.createElement("div");
  const sections = [
    ["Your data stays local", "Captures live in this browser profile or local app storage. Browser resets, cleared data, device loss or uninstallation may erase them. Keep an export backup."],
    ["No automatic sync yet", "Accounts and cloud synchronization are not available. Transfer between devices is manual through export, import or the system share sheet."],
    ["Use and responsibility", "You are responsible for what you save, protecting your device, and keeping backups. Do not use Linka as the only copy of critical information."],
    ["Links and early access", "Opened links are handled by external apps/sites. Linka is an early-stage utility; features can change and uninterrupted, error-free operation is not guaranteed."],
    ["Acceptable use", "Use Linka lawfully, respect other people’s rights, and avoid saving sensitive information on shared devices."]
  ];
  sections.forEach(([h,p]) => { const h3=document.createElement("h3"); h3.textContent=h; const para=document.createElement("p"); para.textContent=p; body.append(h3,para); });
  const note=document.createElement("p"); note.textContent="This in-app product agreement explains how the current version works; it is not professional legal advice.";
  body.append(note); container.append(body);
}
function showAgreement({mustAccept = false} = {}) {
  const content = document.createElement("div"); addTermsBody(content);
  const actions = document.createElement("div"); actions.className="modal-actions";
  if (mustAccept) {
    const decline=document.createElement("button"); decline.className="ghost"; decline.textContent="Decline";
    decline.addEventListener("click", () => {
      modalRoot.replaceChildren();
      $("#app").replaceChildren();
      const panel=document.createElement("section"); panel.className="declined";
      const h=document.createElement("h1"); h.textContent="Linka is paused";
      const p=document.createElement("p"); p.className="hero-sub"; p.textContent="You need to accept the in-app agreement to use this version. You can close this window or reload to review it again.";
      panel.append(h,p); $("#app").append(panel);
    });
    const accept=document.createElement("button"); accept.className="primary"; accept.textContent="I agree and continue";
    accept.addEventListener("click", () => { localStorage.setItem("linka.termsAccepted", TERMS_VERSION); modalRoot.replaceChildren(); say("Agreement saved on this device"); });
    actions.append(decline, accept);
  } else {
    const close=document.createElement("button"); close.className="primary"; close.textContent="Done";
    close.addEventListener("click", () => modalRoot.replaceChildren());
    actions.append(close);
  }
  content.append(actions);
  return modalShell(content);
}
function showCloudSyncSettings() {
  const content = document.createElement("div");
  const head = document.createElement("div"); head.className = "modal-head";
  const logo = document.createElement("img"); logo.className = "modal-logo"; logo.src = "/linka-mark.svg"; logo.alt = "";
  const meta = document.createElement("div");
  const title = document.createElement("h2"); title.textContent = "Linka Cloud Sync";
  const sub = document.createElement("p"); sub.textContent = "Use the same account on Android, Windows and the website.";
  meta.append(title, sub); head.append(logo, meta); content.append(head);

  const note = document.createElement("p");
  note.textContent = "Your inbox remains available offline. Cloud sync needs the same Supabase project URL and public publishable/anon key on each device. Never enter a service_role or secret key here.";
  content.append(note);
  const config = getCloudConfig();
  const session = getCloudSession();

  const form = document.createElement("div"); form.className = "cloud-form";
  const field = (labelText, type, value, placeholder) => {
    const wrap = document.createElement("label"); wrap.className = "cloud-field";
    const label = document.createElement("span"); label.textContent = labelText;
    const input = document.createElement("input"); input.type = type; input.value = value || ""; input.placeholder = placeholder || ""; input.autocomplete = type === "password" ? "current-password" : (type === "email" ? "email" : "url");
    wrap.append(label, input); form.append(wrap); return input;
  };
  const url = field("Supabase project URL", "url", config.url, "https://your-project.supabase.co");
  const key = field("Public publishable / anon key", "text", config.key, "sb_publishable_… or legacy anon key");
  const email = field("Email", "email", session?.email || "", "you@example.com");
  const password = field("Password", "password", "", "At least 8 characters");
  content.append(form);

  const statusLine = document.createElement("p"); statusLine.className = "cloud-status";
  statusLine.textContent = session ? `Signed in as ${session.email || "your account"}.` : "Not connected. Create or sign in to a Linka sync account.";
  content.append(statusLine);
  const actions = document.createElement("div"); actions.className = "modal-actions";
  const close = document.createElement("button"); close.type = "button"; close.className = "ghost"; close.textContent = "Close";
  close.addEventListener("click", () => modalRoot.replaceChildren());
  const runAction = async action => {
    const buttons = actions.querySelectorAll("button");
    buttons.forEach(button => { button.disabled = true; });
    statusLine.textContent = "Working…";
    try {
      saveCloudConfig(url.value, key.value);
      if (action === "signup") {
        const result = await createCloudAccount({ url: url.value, key: key.value, email: email.value, password: password.value });
        if (result.verificationRequired) {
          statusLine.textContent = result.message;
          return;
        }
      } else if (action === "signin") {
        await signInCloud({ url: url.value, key: key.value, email: email.value, password: password.value });
      } else if (action === "sync") {
        const result = await syncNow({ silent: true });
        statusLine.textContent = result?.message || "Sync complete.";
        password.value = "";
        return;
      }
      password.value = "";
      const result = await syncNow({ silent: true });
      statusLine.textContent = result?.message ? `Connected. ${result.message}.` : "Connected and ready to sync.";
      say("Linka Cloud Sync connected");
    } catch (error) {
      statusLine.textContent = error?.message || "Cloud sync failed.";
    } finally {
      buttons.forEach(button => { button.disabled = false; });
    }
  };
  const makeButton = (label, cls, fn) => {
    const button = document.createElement("button"); button.type = "button"; button.className = cls; button.textContent = label;
    button.addEventListener("click", fn); actions.append(button); return button;
  };
  if (session) {
    makeButton("Disconnect", "ghost", () => {
      disconnectCloud();
      statusLine.textContent = "Disconnected. Your local captures were not deleted.";
      password.value = "";
    });
    makeButton("Sync now", "primary", () => { void runAction("sync"); });
  } else {
    makeButton("Create account", "ghost", () => { void runAction("signup"); });
    makeButton("Sign in", "primary", () => { void runAction("signin"); });
  }
  actions.append(close); content.append(actions);
  modalShell(content, { dismissable: true });
}

async function checkWindowsInstaller(statusLine, downloadLink) {
  statusLine.textContent = "Checking the latest Linka release…";
  downloadLink.hidden = true;
  try {
    const response = await fetch("https://api.github.com/repos/anarabbasov2010-eng/Linka/releases/latest", {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "Linka-Web" }
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}. Try again later.`);
    const release = await response.json();
    const tag = String(release.tag_name || "").replace(/^v/, "");
    const asset = (release.assets || []).find(item => item.name === "Linka-Windows-x64-setup.exe");
    if (!asset) {
      statusLine.textContent = "The Windows installer for this release is still being built. Check again shortly.";
      return;
    }
    downloadLink.href = asset.browser_download_url;
    downloadLink.hidden = false;
    downloadLink.textContent = desktopBuildVersion && compareVersions(tag, desktopBuildVersion) > 0
      ? `Download update ${tag}`
      : "Download Windows installer";
    if (desktopBuildVersion && compareVersions(tag, desktopBuildVersion) <= 0) {
      statusLine.textContent = `Windows app version ${desktopBuildVersion} is current. You can reinstall the latest installer over the existing copy.`;
    } else {
      statusLine.textContent = `Linka Windows ${tag} is available. Run the installer over your existing copy to update it.`;
    }
  } catch (error) {
    statusLine.textContent = error?.message || "Could not check Windows updates.";
  }
}

function showSettings() {
  const content=document.createElement("div");
  const head=document.createElement("div"); head.className="modal-head";
  const logo=document.createElement("img"); logo.className="modal-logo"; logo.src="/linka-mark.svg"; logo.alt="";
  const meta=document.createElement("div"); const title=document.createElement("h2"); title.textContent="Settings";
  const sub=document.createElement("p"); sub.textContent="Make Linka feel like yours"; meta.append(title,sub); head.append(logo,meta); content.append(head);
  const themeRow=document.createElement("div"); themeRow.className="setting-row";
  const themeMeta=document.createElement("div"); const themeTitle=document.createElement("strong"); themeTitle.textContent="Appearance";
  const themeDesc=document.createElement("p"); themeDesc.textContent="Choose a comfortable colour scheme"; themeMeta.append(themeTitle,themeDesc);
  const choices=document.createElement("div"); choices.className="theme-options"; choices.setAttribute("aria-label","Theme");
  [["dark","Dark"],["light","Light"],["system","System"]].forEach(([value,label])=>{
    const b=document.createElement("button"); b.type="button"; b.className="theme-option"+(themeMode===value?" active":""); b.textContent=label;
    b.addEventListener("click",()=>{applyTheme(value);choices.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===b));});
    choices.append(b);
  });
  themeRow.append(themeMeta,choices); content.append(themeRow);
  const motionRow=document.createElement("div"); motionRow.className="setting-row";
  const motionMeta=document.createElement("div"); const mt=document.createElement("strong"); mt.textContent="Reduced motion";
  const md=document.createElement("p"); md.textContent="Respect motion sensitivity and reduce transitions"; motionMeta.append(mt,md);
  const toggle=document.createElement("button"); toggle.type="button"; toggle.className="toggle"; toggle.setAttribute("aria-pressed",String(reduceMotion)); toggle.setAttribute("aria-label","Toggle reduced motion");
  const knob=document.createElement("span"); toggle.append(knob);
  toggle.addEventListener("click",()=>{reduceMotion=!reduceMotion;localStorage.setItem("linka.reduceMotion",String(reduceMotion));toggle.setAttribute("aria-pressed",String(reduceMotion));document.documentElement.classList.toggle("reduced-motion",reduceMotion);});
  motionRow.append(motionMeta,toggle);content.append(motionRow);
  if(reduceMotion)document.documentElement.classList.add("reduced-motion");
  const cloudRow=document.createElement("div"); cloudRow.className="setting-row";
  const cloudMeta=document.createElement("div");
  const cloudTitle=document.createElement("strong"); cloudTitle.textContent="Cloud sync";
  const cloudDesc=document.createElement("p"); const cloudSession=getCloudSession();
  cloudDesc.textContent=cloudSession ? `Connected as ${cloudSession.email || "your account"} · ${cloudSyncStatus || "sync across your devices"}` : "Sync links and notes across Android, Windows and the website";
  cloudMeta.append(cloudTitle,cloudDesc);
  const cloudButton=document.createElement("button"); cloudButton.type="button"; cloudButton.className="ghost"; cloudButton.textContent=cloudSession?"Manage":"Set up";
  cloudButton.addEventListener("click",()=>{modalRoot.replaceChildren();showCloudSyncSettings();});
  cloudRow.append(cloudMeta,cloudButton);content.append(cloudRow);

  const windowsRow=document.createElement("div"); windowsRow.className="setting-row";
  const windowsMeta=document.createElement("div");
  const windowsTitle=document.createElement("strong"); windowsTitle.textContent="Windows app";
  const windowsDesc=document.createElement("p"); windowsDesc.textContent=desktopBuildVersion ? `Installed version ${desktopBuildVersion}. Updates install over the existing app.` : "Check the latest Windows installer or update your existing desktop app.";
  windowsMeta.append(windowsTitle,windowsDesc);
  const windowsControls=document.createElement("div"); windowsControls.className="windows-update-controls";
  const windowsCheck=document.createElement("button"); windowsCheck.type="button"; windowsCheck.className="ghost"; windowsCheck.textContent="Check";
  const windowsDownload=document.createElement("a"); windowsDownload.className="primary"; windowsDownload.textContent="Download"; windowsDownload.target="_blank"; windowsDownload.rel="noopener noreferrer"; windowsDownload.hidden=true;
  windowsControls.append(windowsCheck,windowsDownload);
  windowsRow.append(windowsMeta,windowsControls);content.append(windowsRow);
  const windowsStatus=document.createElement("p"); windowsStatus.className="cloud-status"; windowsStatus.textContent="Check release status before downloading an installer.";
  content.append(windowsStatus);
  windowsCheck.addEventListener("click",()=>{void checkWindowsInstaller(windowsStatus,windowsDownload);});

  const agreementRow=document.createElement("div"); agreementRow.className="setting-row";
  const am=document.createElement("div"); const at=document.createElement("strong");at.textContent="User agreement";const ap=document.createElement("p");ap.textContent="Review the local-storage and privacy terms";am.append(at,ap);
  const view=document.createElement("button");view.type="button";view.className="ghost";view.textContent="Read terms";
  view.addEventListener("click",()=>{modalRoot.replaceChildren();showAgreement({mustAccept:false});});
  agreementRow.append(am,view);content.append(agreementRow);
  const actions=document.createElement("div");actions.className="modal-actions";const close=document.createElement("button");close.type="button";close.className="primary";close.textContent="Done";close.addEventListener("click",()=>modalRoot.replaceChildren());actions.append(close);content.append(actions);
  const layer=modalShell(content,{dismissable:true});
  const priorFocus=document.activeElement;
  layer.querySelector("button")?.focus();
}
draft.addEventListener("input",()=>{saveButton.disabled=!draft.value.trim();});
draft.addEventListener("keydown",event=>{if((event.ctrlKey||event.metaKey)&&event.key==="Enter"&&draft.value.trim()){event.preventDefault();form.requestSubmit();}});
form.addEventListener("submit",event=>{
  event.preventDefault();const text=draft.value.trim();if(!text)return;
  const existing=editingId?captures.find(item=>item.id===editingId):null;
  if(existing){captures=captures.map(item=>item.id===editingId?{...item,text:text.slice(0,100000),updatedAt:Date.now()}:item);say("Capture updated");}
  else{captures.unshift(makeCapture(text));say("Saved on this device");}
  persist();resetEditor();render();
});
search.addEventListener("input",render);
filters.forEach(button=>button.addEventListener("click",()=>{
  activeFilter=button.dataset.filter;filters.forEach(item=>item.classList.toggle("active",item===button));render();
}));
list.addEventListener("click",async event=>{
  const button=event.target.closest("button[data-action]");if(!button)return;
  const {action,id}=button.dataset;const item=captures.find(entry=>entry.id===id);if(!item)return;
  if(action==="pin"){captures=captures.map(entry=>entry.id===id?{...entry,pinned:!entry.pinned,updatedAt:Date.now()}:entry);persist();render();say(item.pinned?"Removed from pinned":"Pinned for later");}
  else if(action==="delete"){addDeletedId(id);captures=captures.filter(entry=>entry.id!==id);if(editingId===id)resetEditor();persist();render();say("Capture deleted");}
  else if(action==="edit"){editingId=id;draft.value=item.text;composeLabel.textContent="Edit capture";saveButton.textContent="Save changes ↗";saveButton.disabled=false;draft.focus();window.scrollTo({top:0,behavior:"smooth"});}
  else if(action==="copy"){try{await navigator.clipboard.writeText(item.text);say("Copied to clipboard");}catch{draft.value=item.text;draft.focus();draft.select();say("Text selected for manual copying");}}
});
$("#export-button").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(captures,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download="linka-inbox.json";anchor.click();URL.revokeObjectURL(url);say("Inbox export created");
});
$("#import-button").addEventListener("click",()=>$("#import-file").click());
$("#import-file").addEventListener("change",async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{const parsed=JSON.parse(await file.text());const imported=Array.isArray(parsed)?parsed:parsed.captures;if(!Array.isArray(imported))throw new Error("Invalid file");
    const normalized=imported.map(item=>makeCapture(item.text,item)).filter(Boolean);const restoredIds=new Set(normalized.map(item=>item.id));const deleted=readDeletedIds();restoredIds.forEach(id=>deleted.delete(id));try{localStorage.setItem("linka.deletedIds.v1",JSON.stringify(Array.from(deleted)));}catch{}const map=new Map(captures.map(item=>[item.id,item]));normalized.forEach(item=>map.set(item.id,item));
    captures=Array.from(map.values()).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,1000);persist();render();say("Imported "+normalized.length+" capture(s)");
  }catch{say("That file is not a valid Linka export");}finally{event.target.value="";}
});
$("#settings-button").addEventListener("click",showSettings);
document.documentElement.classList.toggle("reduced-motion",reduceMotion);
render();
if(getCloudSession()) setTimeout(() => { void syncNow({ silent: true }).catch(() => {}); }, 1200);
if(localStorage.getItem("linka.termsAccepted")!==TERMS_VERSION)showAgreement({mustAccept:true});