"use strict";
/* LUKE'S Design Studio — data-driven from data/finishes.json.
   Swatches show a real photo when the finish has an `img` (assets/finishes/<img>);
   otherwise they fall back to a clean color/gradient chip. */

var CHECK_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
var CHECK_SVG_SM = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
var CHEVRON_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

var DATA = null;          /* loaded catalog */
var STYLE_BY_ID = {};     /* id -> style object */
var state = { space: "kitchen", style: "transitional", area: 200, picks: {} };
var LS_KEY = "home-design-studio-v1";

var $ = function (id) { return document.getElementById(id); };

/* ---------- Lookups ---------- */
function spaceById(id) { var a = DATA.spaces, i; for (i = 0; i < a.length; i++) { if (a[i].id === id) return a[i]; } return a[0]; }
function catMeta(c) { return DATA.categories[c]; }
function finishes(c) { return DATA.finishes[c] || []; }
function optById(c, id) { var a = finishes(c), i; for (i = 0; i < a.length; i++) { if (a[i].id === id) return a[i]; } return a[0]; }
function swatchStyle(o) { return o.img ? "background-image:url(assets/finishes/" + o.img + ")" : "background:" + (o.color || "#ccc"); }
function roomImg(sp) { return sp.img ? "assets/rooms/" + sp.img : ""; }
function defaultAreaFor(kind) { return kind === "exterior" ? 2000 : 200; }

function applyStyleDefaults() {
  var d = STYLE_BY_ID[state.style].defaults, cats = spaceById(state.space).cats, i;
  state.picks = {};
  for (i = 0; i < cats.length; i++) { state.picks[cats[i]] = d[cats[i]]; }
}
function ensurePicks() {
  var d = STYLE_BY_ID[state.style].defaults, cats = spaceById(state.space).cats, i;
  for (i = 0; i < cats.length; i++) { if (!state.picks[cats[i]]) state.picks[cats[i]] = d[cats[i]]; }
}

/* ---------- Cost ---------- */
function scopeFactor() {
  var a = state.area, kind = spaceById(state.space).kind;
  if (kind === "exterior") return a < 1500 ? 0.7 : (a <= 3000 ? 1 : 1.6);
  return a < 150 ? 0.6 : (a <= 350 ? 1 : 1.7);
}
function computeCost() {
  var cats = spaceById(state.space).cats, sf = scopeFactor(), lo = 0, hi = 0, lines = [], i;
  for (i = 0; i < cats.length; i++) {
    var c = cats[i], meta = catMeta(c), o = optById(c, state.picks[c]), clo, chi;
    if (meta.per) {
      var area = state.area;
      if (c === "siding") area = Math.round(state.area * 1.2);
      if (c === "roof") area = Math.round(state.area * 1.15);
      clo = Math.round((o.lo || 0) * area); chi = Math.round((o.hi || 0) * area);
    } else {
      clo = Math.round(meta.base[0] * sf); chi = Math.round(meta.base[1] * sf);
    }
    lo += clo; hi += chi;
    lines.push({ cat: c, label: meta.label, opt: o.label, lo: clo, hi: chi });
  }
  return { lo: lo, hi: hi, lines: lines };
}
function money(n) { return "$" + n.toLocaleString("en-US"); }

/* ---------- Render ---------- */
function renderSpaces() {
  var el = $("spaceTabs"); el.innerHTML = "";
  DATA.spaces.forEach(function (sp) {
    var b = document.createElement("button");
    b.className = "space-card"; b.type = "button";
    b.setAttribute("aria-pressed", sp.id === state.space ? "true" : "false");
    b.setAttribute("aria-label", sp.label);
    var img = roomImg(sp);
    b.innerHTML = '<span class="thumb" style="' + (img ? "background-image:url(" + img + ")" : "") + '"></span>'
      + '<span class="cap">' + sp.label + '</span>'
      + '<span class="chk" aria-hidden="true">' + CHECK_SVG + '</span>';
    b.addEventListener("click", function () {
      if (state.space === sp.id) return;
      state.space = sp.id; state.area = defaultAreaFor(sp.kind);
      applyStyleDefaults(); save(); renderAll();
      announce(sp.label + " selected");
    });
    el.appendChild(b);
  });
  $("kindLabel").textContent = spaceById(state.space).kind === "exterior"
    ? "Exterior — body, trim, door, roof, garage, and landscaping."
    : "Interior — paint, surfaces, flooring, and fixtures for this room.";
}

function renderStyles() {
  var el = $("styleGrid"); el.innerHTML = "";
  DATA.styles.forEach(function (p) {
    var b = document.createElement("button");
    b.className = "style"; b.type = "button";
    b.setAttribute("aria-pressed", p.id === state.style ? "true" : "false");
    var chips = '<span class="chips" aria-hidden="true">', i;
    for (i = 0; i < p.colors.length; i++) { chips += '<span style="background:' + p.colors[i][1] + '"></span>'; }
    chips += '</span>';
    b.innerHTML = chips + '<span class="nm">' + p.name + '</span>';
    b.addEventListener("click", function () {
      if (state.style === p.id) return;
      state.style = p.id; applyStyleDefaults(); save(); renderAll();
      announce(p.name + " style applied");
    });
    el.appendChild(b);
  });
}

function renderCats() {
  var host = $("catList"); host.innerHTML = "";
  var cats = spaceById(state.space).cats;
  $("finishNote").textContent = "Each swatch is a real finish option with a cost range built in.";
  cats.forEach(function (c) {
    var wrap = document.createElement("div"); wrap.className = "cat";
    var cur = optById(c, state.picks[c]);
    var head = '<div class="cat-head"><h3>' + catMeta(c).label + '</h3><span class="pick">' + cur.label + '</span></div>';
    var opts = '<div class="opts">';
    finishes(c).forEach(function (o) {
      var on = o.id === state.picks[c];
      opts += '<span class="opt"><button type="button" data-cat="' + c + '" data-id="' + o.id + '" aria-pressed="' + (on ? "true" : "false") + '" aria-label="' + o.label + '">'
        + '<span class="sw" style="' + swatchStyle(o) + '"></span><span class="tick" aria-hidden="true">' + CHECK_SVG_SM + '</span>'
        + '<span class="lbl">' + o.label + '</span></button></span>';
    });
    opts += '</div>';
    wrap.innerHTML = head + opts;
    host.appendChild(wrap);
  });
  host.querySelectorAll("button[data-cat]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.picks[btn.getAttribute("data-cat")] = btn.getAttribute("data-id");
      save(); renderCats(); renderBoard();
    });
  });
}

function renderBoard() {
  var p = STYLE_BY_ID[state.style], sp = spaceById(state.space);
  $("boardTitle").textContent = p.name + " · " + sp.label;
  var strip = $("paletteStrip"); strip.innerHTML = "";
  p.colors.forEach(function (c) {
    var s = document.createElement("span"); s.style.background = c[1];
    s.innerHTML = '<span class="pc-name">' + c[0] + '</span>'; strip.appendChild(s);
  });
  $("tagline").textContent = "“" + p.tag + "”";

  var list = $("finishList"); list.innerHTML = "";
  sp.cats.forEach(function (c) {
    var o = optById(c, state.picks[c]), li = document.createElement("li");
    li.innerHTML = '<span class="fsw" style="' + swatchStyle(o) + '"></span>'
      + '<span><span class="ft">' + catMeta(c).label + '</span><br><span class="fn">' + o.label + '</span></span>';
    list.appendChild(li);
  });

  var kind = sp.kind, area = $("area");
  if (kind === "exterior") { area.min = 800; area.max = 5000; area.step = 50; $("areaLabel").textContent = "Home size"; }
  else { area.min = 40; area.max = 800; area.step = 10; $("areaLabel").textContent = "Room size"; }
  if (+area.value !== state.area) area.value = state.area;
  $("areaVal").textContent = state.area.toLocaleString("en-US") + " sq ft";

  var cost = computeCost();
  $("costAmt").textContent = money(cost.lo) + " – " + money(cost.hi);
  $("costNote").textContent = kind === "exterior"
    ? "Assumes siding ≈ 1.2× and roof ≈ 1.15× home size. Ballpark only."
    : "Flooring and paint scale with room size; cabinetry, counters, fixtures scale by scope.";
  renderSummary(cost);
}

function renderSummary(cost) {
  var p = STYLE_BY_ID[state.style], sp = spaceById(state.space), L = [];
  L.push("HOME DESIGN STUDIO — DECISION SUMMARY");
  L.push("Space: " + sp.label + "   Style: " + p.name);
  L.push("Size: " + state.area.toLocaleString("en-US") + " sq ft");
  L.push("");
  L.push("Palette: " + p.colors.map(function (c) { return c[0] + " (" + c[1] + ")"; }).join(", "));
  L.push("");
  L.push("FINISHES & SHOPPING LIST");
  cost.lines.forEach(function (ln) { L.push("- " + ln.label + ": " + ln.opt + "  (" + money(ln.lo) + "–" + money(ln.hi) + ")"); });
  L.push("");
  L.push("BALLPARK TOTAL: " + money(cost.lo) + " – " + money(cost.hi));
  L.push("(Arizona, 2026 planning range — materials + typical install. Not a quote; confirm with a local bid.)");
  $("summaryText").textContent = L.join("\n");
}

function renderAll() { renderSpaces(); renderStyles(); renderCats(); renderBoard(); }

/* ---------- Persistence ---------- */
function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {} }
function load() {
  try {
    var raw = localStorage.getItem(LS_KEY); if (!raw) return;
    var s = JSON.parse(raw);
    if (s && spaceExists(s.space) && STYLE_BY_ID[s.style]) {
      state.space = s.space; state.style = s.style;
      state.area = (typeof s.area === "number") ? s.area : defaultAreaFor(spaceById(s.space).kind);
      state.picks = (s.picks && typeof s.picks === "object") ? s.picks : {};
    }
  } catch (e) {}
}
function spaceExists(id) { var i; for (i = 0; i < DATA.spaces.length; i++) { if (DATA.spaces[i].id === id) return true; } return false; }

/* ---------- Theme ---------- */
function initTheme() {
  var saved; try { saved = localStorage.getItem("hds-theme"); } catch (e) {}
  // Default to light; dark only when the user previously chose it.
  document.documentElement.setAttribute("data-theme", saved === "dark" ? "dark" : "light");
  $("themeBtn").addEventListener("click", function () {
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("hds-theme", next); } catch (e) {}
  });
}

/* ---------- Misc ---------- */
function announce(msg) { $("liveRegion").textContent = msg; }
function copySummary() {
  var txt = $("summaryText").textContent, btn = $("copyBtn");
  function ok() { btn.textContent = "Copied"; btn.classList.add("ok"); setTimeout(function () { btn.textContent = "Copy decision summary"; btn.classList.remove("ok"); }, 1800); }
  function fallback() {
    try {
      $("summaryWrap").open = true; var r = document.createRange(); r.selectNodeContents($("summaryText"));
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); document.execCommand("copy"); sel.removeAllRanges(); ok();
    } catch (e) { $("summaryWrap").open = true; btn.textContent = "Select the text below to copy"; }
  }
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(ok).catch(fallback); }
  else { fallback(); }
}

/* ---------- Boot ---------- */
function boot(data) {
  DATA = data;
  STYLE_BY_ID = {};
  data.styles.forEach(function (s) { STYLE_BY_ID[s.id] = s; });
  $("app").hidden = false;
  var ld = $("loading"); if (ld) ld.remove();
  load(); ensurePicks(); initTheme(); renderAll();
  $("area").addEventListener("input", function () {
    state.area = +this.value; $("areaVal").textContent = state.area.toLocaleString("en-US") + " sq ft";
    var cost = computeCost(); $("costAmt").textContent = money(cost.lo) + " – " + money(cost.hi); renderSummary(cost); save();
  });
  $("copyBtn").addEventListener("click", copySummary);
  $("resetBtn").addEventListener("click", function () { applyStyleDefaults(); save(); renderCats(); renderBoard(); announce("Finishes reset to the " + STYLE_BY_ID[state.style].name + " style"); });
}

fetch("data/finishes.json")
  .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
  .then(boot)
  .catch(function (e) {
    var ld = $("loading");
    if (ld) ld.innerHTML = "Couldn't load the finish catalog (data/finishes.json). Run this from a local server, e.g. <code>npx serve</code>, not by opening the file directly.";
  });
