"use strict";
/* LUKE'S Design Studio — Free tier: upload photos/videos -> RFQ.
   Files upload client->Blob (authorized by /api/blob-upload); then the RFQ
   metadata is posted to /api/rfq. No framework, no build. */

var MAX_FILES = 10;
var MAX_BYTES = 75 * 1024 * 1024;
var SPACES_FALLBACK = [
  { id: "kitchen", label: "Kitchen" },
  { id: "living", label: "Living Room" },
  { id: "bath", label: "Bathroom" },
  { id: "bedroom", label: "Bedroom" },
  { id: "facade", label: "Exterior" },
];

function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function msg(text, kind) {
  var el = $("formMsg");
  if (!el) return;
  el.textContent = text || "";
  el.className = "disclaimer" + (kind ? " " + kind : "");
}

/* ---------- Theme (light default; dark only on explicit toggle) ---------- */
function initTheme() {
  var saved;
  try { saved = localStorage.getItem("hds-theme"); } catch (e) {}
  document.documentElement.setAttribute("data-theme", saved === "dark" ? "dark" : "light");
  var btn = $("themeBtn");
  if (btn) btn.addEventListener("click", function () {
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("hds-theme", next); } catch (e) {}
  });
}

/* ---------- Space options ---------- */
function fillSpaces(spaces) {
  var sel = $("space");
  if (!sel) return;
  sel.innerHTML = spaces.map(function (s) {
    return '<option value="' + esc(s.label) + '">' + esc(s.label) + "</option>";
  }).join("");
}
function loadSpaces() {
  fillSpaces(SPACES_FALLBACK);
  fetch("data/finishes.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.spaces) return;
    var list = d.spaces.map(function (s) { return { id: s.id, label: s.label || s.id }; });
    if (list.length) fillSpaces(list);
  }).catch(function () {});
}

/* ---------- Media chips + validation ---------- */
function currentFiles() {
  var input = $("media");
  return input && input.files ? [].slice.call(input.files) : [];
}
function renderChips() {
  var list = $("mediaList");
  var files = currentFiles();
  if (!list) return;
  var over = files.filter(function (f) { return f.size > MAX_BYTES; });
  list.innerHTML = files.slice(0, MAX_FILES).map(function (f) {
    var big = f.size > MAX_BYTES;
    return '<span class="chip' + (big ? " chip-bad" : "") + '">' + esc(f.name) +
      (big ? " · too big" : "") + "</span>";
  }).join("");
  if (files.length > MAX_FILES) msg("Only the first " + MAX_FILES + " files will be sent.", "warn-msg");
  else if (over.length) msg("Files over 75 MB will be skipped.", "warn-msg");
  else msg("");
}

/* ---------- Submit ---------- */
function setBusy(busy) {
  var b = $("submitBtn");
  if (b) { b.disabled = busy; b.textContent = busy ? "Uploading…" : "Send & get my 3 options"; }
}

async function uploadAll(files) {
  if (!window.LDSBlob || typeof window.LDSBlob.upload !== "function") {
    throw new Error("Uploads aren't available right now. Please try again shortly.");
  }
  var out = [];
  for (var i = 0; i < files.length && i < MAX_FILES; i++) {
    var file = files[i];
    if (file.size > MAX_BYTES) continue;
    var res = await window.LDSBlob.upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/blob-upload",
      contentType: file.type || undefined,
    });
    out.push({ url: res.url, contentType: file.type || res.contentType || "", name: file.name });
  }
  return out;
}

function onSubmit(e) {
  e.preventDefault();
  msg("");
  var declared = $("declaredReal");
  var contact = $("contact");
  var files = currentFiles().filter(function (f) { return f.size <= MAX_BYTES; });

  if (!declared || !declared.checked) { msg("Please confirm the photos/videos are real and yours.", "err-msg"); return; }
  if (!contact || !contact.value.trim()) { msg("Add a phone number or email so we can send your options.", "err-msg"); return; }
  if (files.length === 0) { msg("Add at least one photo or video (under 75 MB).", "err-msg"); return; }

  setBusy(true);
  uploadAll(files).then(function (media) {
    if (media.length === 0) throw new Error("No files uploaded.");
    return fetch("/api/rfq", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        space: $("space").value,
        style: $("style").value,
        name: $("name").value,
        contact: contact.value,
        notes: $("notes").value,
        declaredReal: true,
        media: media,
      }),
    });
  }).then(function (r) {
    return r.json().then(function (data) { return { ok: r.ok, status: r.status, data: data }; });
  }).then(function (resp) {
    if (!resp.ok) throw new Error((resp.data && resp.data.error) || "Something went wrong. Please try again.");
    $("doneId").textContent = resp.data.id || "";
    $("rfqForm").hidden = true;
    $("doneCard").hidden = false;
    window.scrollTo(0, 0);
  }).catch(function (err) {
    msg(err.message || "Upload failed. Please try again.", "err-msg");
  }).then(function () { setBusy(false); });
}

function boot() {
  initTheme();
  loadSpaces();
  var input = $("media");
  if (input) input.addEventListener("change", renderChips);
  var form = $("rfqForm");
  if (form) form.addEventListener("submit", onSubmit);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
