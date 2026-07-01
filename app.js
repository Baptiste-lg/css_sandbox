/* ═══════════════════════════════════════════
   Panel definitions
   ═══════════════════════════════════════════ */
var PANELS = [
  { id: 'panel-html',    title: 'HTML',    type: 'editor', editorId: 'editor-html' },
  { id: 'panel-css',     title: 'CSS',     type: 'editor', editorId: 'editor-css'  },
  { id: 'panel-js',      title: 'JS',      type: 'editor', editorId: 'editor-js'   },
  { id: 'panel-preview', title: 'Preview', type: 'preview' },
  { id: 'panel-errors',  title: 'Errors',  type: 'errors'  }
];

var workspace   = document.getElementById('workspace');
var dragOverlay = document.getElementById('drag-overlay');
var autoRunCb   = document.getElementById('auto-run');
var zCounter    = 100;
var panels      = {};

/* ═══════════════════════════════════════════
   Default layout: delegates to current mode
   ═══════════════════════════════════════════ */
function defaultLayout() {
  return getPresetLayout(currentLayoutMode);
}

/* ═══════════════════════════════════════════
   Panel DOM creation
   ═══════════════════════════════════════════ */
function createPanel(def) {
  var el = document.createElement('div');
  el.className = 'panel';
  el.id = def.id;

  var header = document.createElement('div');
  header.className = 'panel-header';

  var title = document.createElement('span');
  title.className = 'panel-title';
  title.textContent = def.title;
  header.appendChild(title);

  if (def.type === 'errors') {
    var badge = document.createElement('span');
    badge.className = 'error-count';
    badge.id = 'error-count';
    badge.textContent = '0';
    header.appendChild(badge);
  }

  el.appendChild(header);

  var body = document.createElement('div');
  body.className = 'panel-body';

  if (def.type === 'editor') {
    var ta = document.createElement('textarea');
    ta.id = def.editorId;
    ta.spellcheck = false;
    ta.placeholder = def.title + ' here...';
    body.appendChild(ta);
  } else if (def.type === 'preview') {
    var iframe = document.createElement('iframe');
    iframe.id = 'preview';
    body.appendChild(iframe);
  } else if (def.type === 'errors') {
    var list = document.createElement('div');
    list.className = 'error-list';
    list.id = 'error-list';
    body.appendChild(list);
  }

  el.appendChild(body);

  var handles = ['rh-right', 'rh-bottom', 'rh-left', 'rh-top', 'rh-br', 'rh-bl', 'rh-tr', 'rh-tl'];
  handles.forEach(function(cls) {
    var handle = document.createElement('div');
    handle.className = 'resize-handle ' + cls;
    el.appendChild(handle);
  });

  workspace.appendChild(el);

  el.addEventListener('mousedown', function() { focusPanel(def.id); });
  initDrag(el, header);
  initResize(el);

  return el;
}

/* ═══════════════════════════════════════════
   Focus management (z-index stacking)
   ═══════════════════════════════════════════ */
function focusPanel(id) {
  Object.keys(panels).forEach(function(k) {
    panels[k].el.classList.remove('focused');
  });
  panels[id].el.classList.add('focused');
  panels[id].el.style.zIndex = ++zCounter;
}

/* ═══════════════════════════════════════════
   Snap zones: smart edge snapping

   Tracks which panels are docked to which
   regions. When a new panel snaps to an edge
   that's already occupied, it subdivides the
   space instead of overlapping.
   ═══════════════════════════════════════════ */
var snapPreview    = document.getElementById('snap-preview');
var SNAP_THRESHOLD = 20;
var dockedPanels   = {};

function getPanelRect(el) {
  return {
    x: el.offsetLeft,
    y: el.offsetTop,
    w: el.offsetWidth,
    h: el.offsetHeight
  };
}

function rectsOverlap(a, b) {
  var tolerance = 8;
  return !(a.x + a.w <= b.x + tolerance ||
           b.x + b.w <= a.x + tolerance ||
           a.y + a.h <= b.y + tolerance ||
           b.y + b.h <= a.y + tolerance);
}

function getSnapZone(clientX, clientY, draggedEl) {
  var rect = workspace.getBoundingClientRect();
  var x = clientX - rect.left;
  var y = clientY - rect.top;
  var W = rect.width;
  var H = rect.height;

  var nearL = x < SNAP_THRESHOLD;
  var nearR = x > W - SNAP_THRESHOLD;
  var nearT = y < SNAP_THRESHOLD;
  var nearB = y > H - SNAP_THRESHOLD;

  if (!nearL && !nearR && !nearT && !nearB) return null;

  var candidate = null;

  if (nearL && nearT) candidate = { x: 0,     y: 0,     w: W / 2, h: H / 2 };
  else if (nearR && nearT) candidate = { x: W / 2, y: 0,     w: W / 2, h: H / 2 };
  else if (nearL && nearB) candidate = { x: 0,     y: H / 2, w: W / 2, h: H / 2 };
  else if (nearR && nearB) candidate = { x: W / 2, y: H / 2, w: W / 2, h: H / 2 };
  else if (nearL) candidate = { x: 0,     y: 0,     w: W / 2, h: H     };
  else if (nearR) candidate = { x: W / 2, y: 0,     w: W / 2, h: H     };
  else if (nearT) candidate = { x: 0,     y: 0,     w: W,     h: H / 2 };
  else if (nearB) candidate = { x: 0,     y: H / 2, w: W,     h: H / 2 };

  if (!candidate) return null;

  var occupied = findOccupyingPanels(candidate, draggedEl);
  if (occupied.length === 0) return candidate;

  return subdivide(candidate, occupied, x, y);
}

function findOccupyingPanels(zone, draggedEl) {
  var result = [];
  Object.keys(dockedPanels).forEach(function(id) {
    var docked = dockedPanels[id];
    if (docked.el === draggedEl) return;
    if (rectsOverlap(zone, docked.zone)) {
      result.push(docked);
    }
  });
  return result;
}

function subdivide(zone, occupied, cursorX, cursorY) {
  var isWide = zone.w > zone.h;

  if (isWide) {
    var leftOccupied = false, rightOccupied = false;
    var midX = zone.x + zone.w / 2;
    occupied.forEach(function(d) {
      var center = d.zone.x + d.zone.w / 2;
      if (center < midX) leftOccupied = true;
      else rightOccupied = true;
    });

    if (leftOccupied && !rightOccupied) {
      return { x: midX, y: zone.y, w: zone.w / 2, h: zone.h };
    }
    if (rightOccupied && !leftOccupied) {
      return { x: zone.x, y: zone.y, w: zone.w / 2, h: zone.h };
    }
    if (cursorX < midX) {
      return { x: zone.x, y: zone.y, w: zone.w / 2, h: zone.h };
    }
    return { x: midX, y: zone.y, w: zone.w / 2, h: zone.h };
  }

  var topOccupied = false, bottomOccupied = false;
  var midY = zone.y + zone.h / 2;
  occupied.forEach(function(d) {
    var center = d.zone.y + d.zone.h / 2;
    if (center < midY) topOccupied = true;
    else bottomOccupied = true;
  });

  if (topOccupied && !bottomOccupied) {
    return { x: zone.x, y: midY, w: zone.w, h: zone.h / 2 };
  }
  if (bottomOccupied && !topOccupied) {
    return { x: zone.x, y: zone.y, w: zone.w, h: zone.h / 2 };
  }
  if (cursorY < midY) {
    return { x: zone.x, y: zone.y, w: zone.w, h: zone.h / 2 };
  }
  return { x: zone.x, y: midY, w: zone.w, h: zone.h / 2 };
}

function dockPanel(el, zone) {
  dockedPanels[el.id] = { el: el, zone: zone };
}

function undockPanel(el) {
  delete dockedPanels[el.id];
}

function showSnapPreview(zone) {
  if (!zone) {
    snapPreview.style.display = 'none';
    return;
  }
  snapPreview.style.display = 'block';
  snapPreview.style.left   = zone.x + 'px';
  snapPreview.style.top    = zone.y + 'px';
  snapPreview.style.width  = zone.w + 'px';
  snapPreview.style.height = zone.h + 'px';
}

/* ═══════════════════════════════════════════
   Drag: move panels by their header
   ═══════════════════════════════════════════ */
function initDrag(el, header) {
  var startX, startY, origX, origY;

  header.addEventListener('mousedown', function(e) {
    if (e.target.closest('.resize-handle')) return;
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    origX = el.offsetLeft;
    origY = el.offsetTop;

    undockPanel(el);
    el.classList.add('dragging');

    dragOverlay.style.display = 'block';
    dragOverlay.style.cursor = 'grabbing';

    function onMove(e) {
      el.style.left = (origX + e.clientX - startX) + 'px';
      el.style.top  = (origY + e.clientY - startY) + 'px';
      showSnapPreview(getSnapZone(e.clientX, e.clientY, el));
    }

    function onUp(e) {
      el.classList.remove('dragging');
      var zone = getSnapZone(e.clientX, e.clientY, el);
      if (zone) {
        el.style.left   = zone.x + 'px';
        el.style.top    = zone.y + 'px';
        el.style.width  = zone.w + 'px';
        el.style.height = zone.h + 'px';
        dockPanel(el, zone);
      }
      snapPreview.style.display = 'none';
      dragOverlay.style.display = 'none';
      dragOverlay.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      saveLayout();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

/* ═══════════════════════════════════════════
   Resize: 8-directional handles
   ═══════════════════════════════════════════ */
function initResize(el) {
  var handles = el.querySelectorAll('.resize-handle');
  var MIN_W = 160, MIN_H = 100;

  handles.forEach(function(handle) {
    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();

      undockPanel(el);
      el.classList.add('dragging');

      var cls = handle.className;
      var startX = e.clientX, startY = e.clientY;
      var origW = el.offsetWidth, origH = el.offsetHeight;
      var origL = el.offsetLeft, origT = el.offsetTop;

      var resizeR = cls.indexOf('rh-right') >= 0 || cls.indexOf('rh-br') >= 0 || cls.indexOf('rh-tr') >= 0;
      var resizeB = cls.indexOf('rh-bottom') >= 0 || cls.indexOf('rh-br') >= 0 || cls.indexOf('rh-bl') >= 0;
      var resizeL = cls.indexOf('rh-left') >= 0 || cls.indexOf('rh-bl') >= 0 || cls.indexOf('rh-tl') >= 0;
      var resizeT = cls.indexOf('rh-top') >= 0 || cls.indexOf('rh-tr') >= 0 || cls.indexOf('rh-tl') >= 0;

      dragOverlay.style.display = 'block';
      dragOverlay.style.cursor = getComputedStyle(handle).cursor;

      function onMove(e) {
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;

        if (resizeR) el.style.width  = Math.max(MIN_W, origW + dx) + 'px';
        if (resizeB) el.style.height = Math.max(MIN_H, origH + dy) + 'px';

        if (resizeL) {
          var newW = Math.max(MIN_W, origW - dx);
          el.style.width = newW + 'px';
          el.style.left  = (origL + origW - newW) + 'px';
        }

        if (resizeT) {
          var newH = Math.max(MIN_H, origH - dy);
          el.style.height = newH + 'px';
          el.style.top    = (origT + origH - newH) + 'px';
        }
      }

      function onUp() {
        el.classList.remove('dragging');
        dragOverlay.style.display = 'none';
        dragOverlay.style.cursor = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveLayout();
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

/* ═══════════════════════════════════════════
   Layout persistence (localStorage)
   ═══════════════════════════════════════════ */
function saveLayout() {
  var layout = {};
  Object.keys(panels).forEach(function(id) {
    var el = panels[id].el;
    layout[id] = {
      x: el.offsetLeft,
      y: el.offsetTop,
      w: el.offsetWidth,
      h: el.offsetHeight
    };
  });
  try { localStorage.setItem('css-sandbox-layout', JSON.stringify(layout)); } catch(e) {}
}

function loadLayout() {
  try {
    var saved = localStorage.getItem('css-sandbox-layout');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return null;
}

function applyLayout(layout) {
  Object.keys(layout).forEach(function(id) {
    if (!panels[id]) return;
    var el = panels[id].el;
    var r  = layout[id];
    el.style.left   = r.x + 'px';
    el.style.top    = r.y + 'px';
    el.style.width  = r.w + 'px';
    el.style.height = r.h + 'px';
  });
}

/* ═══════════════════════════════════════════
   Layout presets: top/bottom, left/right, tabs
   ═══════════════════════════════════════════ */
var currentLayoutMode = 'top-bottom';
var activeTab = 'panel-html';
var tabBar = document.getElementById('tab-bar');

function layoutTopBottom() {
  var w = workspace.offsetWidth;
  var h = workspace.offsetHeight;
  var edW = Math.floor(w / 3);
  var edH = Math.floor(h * 0.45);
  var pvW = Math.floor(w * 0.65);
  var pvH = h - edH - 4;
  var erW = w - pvW - 4;

  return {
    'panel-html':    { x: 0,       y: 0,       w: edW,          h: edH },
    'panel-css':     { x: edW,     y: 0,       w: edW,          h: edH },
    'panel-js':      { x: edW * 2, y: 0,       w: w - edW * 2,  h: edH },
    'panel-preview': { x: 0,       y: edH + 4, w: pvW,          h: pvH },
    'panel-errors':  { x: pvW + 4, y: edH + 4, w: erW,          h: pvH }
  };
}

function layoutLeftRight() {
  var w = workspace.offsetWidth;
  var h = workspace.offsetHeight;
  var edW = Math.floor(w * 0.35);
  var edH = Math.floor(h / 3);
  var pvW = w - edW - 4;
  var pvH = Math.floor(h * 0.7);
  var erH = h - pvH - 4;

  return {
    'panel-html':    { x: 0,       y: 0,           w: edW, h: edH },
    'panel-css':     { x: 0,       y: edH,         w: edW, h: edH },
    'panel-js':      { x: 0,       y: edH * 2,     w: edW, h: h - edH * 2 },
    'panel-preview': { x: edW + 4, y: 0,           w: pvW, h: pvH },
    'panel-errors':  { x: edW + 4, y: pvH + 4,     w: pvW, h: erH }
  };
}

function layoutTabs() {
  var w = workspace.offsetWidth;
  var h = workspace.offsetHeight;
  var tabH = 32;
  var edH = Math.floor((h - tabH) * 0.45);
  var pvW = Math.floor(w * 0.65);
  var pvH = h - tabH - edH - 4;
  var erW = w - pvW - 4;

  return {
    'panel-html':    { x: 0, y: tabH,          w: w,   h: edH },
    'panel-css':     { x: 0, y: tabH,          w: w,   h: edH },
    'panel-js':      { x: 0, y: tabH,          w: w,   h: edH },
    'panel-preview': { x: 0, y: tabH + edH + 4, w: pvW, h: pvH },
    'panel-errors':  { x: pvW + 4, y: tabH + edH + 4, w: erW, h: pvH }
  };
}

function getPresetLayout(mode) {
  if (mode === 'left-right') return layoutLeftRight();
  if (mode === 'tabs') return layoutTabs();
  return layoutTopBottom();
}

function showTabBar(visible) {
  tabBar.classList.toggle('visible', visible);
}

function setActiveTab(tabId) {
  activeTab = tabId;

  var tabBtns = tabBar.querySelectorAll('.tab-btn');
  tabBtns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  ['panel-html', 'panel-css', 'panel-js'].forEach(function(id) {
    if (!panels[id]) return;
    var el = panels[id].el;
    if (id === tabId) {
      el.style.display = '';
      el.style.zIndex = 10;
    } else {
      el.style.display = 'none';
    }
  });
}

function restoreAllPanelsVisible() {
  ['panel-html', 'panel-css', 'panel-js', 'panel-preview', 'panel-errors'].forEach(function(id) {
    if (!panels[id]) return;
    panels[id].el.style.display = '';
  });
}

function switchLayout(mode) {
  currentLayoutMode = mode;
  dockedPanels = {};

  var layoutBtns = document.querySelectorAll('.layout-btn');
  layoutBtns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-layout') === mode);
  });

  if (mode === 'tabs') {
    showTabBar(true);
    var preset = getPresetLayout(mode);
    restoreAllPanelsVisible();
    applyLayout(preset);
    setActiveTab(activeTab);
  } else {
    showTabBar(false);
    restoreAllPanelsVisible();
    var preset = getPresetLayout(mode);
    applyLayout(preset);
  }

  try { localStorage.setItem('css-sandbox-layout-mode', mode); } catch(e) {}
  saveLayout();
}

tabBar.addEventListener('click', function(e) {
  var btn = e.target.closest('.tab-btn');
  if (!btn) return;
  setActiveTab(btn.getAttribute('data-tab'));
});

document.querySelectorAll('.layout-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    switchLayout(btn.getAttribute('data-layout'));
  });
});

/* ═══════════════════════════════════════════
   Initialize panels
   ═══════════════════════════════════════════ */
PANELS.forEach(function(def) {
  panels[def.id] = { el: createPanel(def), def: def };
});

var savedMode = null;
try { savedMode = localStorage.getItem('css-sandbox-layout-mode'); } catch(e) {}
currentLayoutMode = savedMode || 'top-bottom';

var layoutBtns = document.querySelectorAll('.layout-btn');
layoutBtns.forEach(function(btn) {
  btn.classList.toggle('active', btn.getAttribute('data-layout') === currentLayoutMode);
});

var savedLayout = loadLayout();
if (savedLayout) {
  applyLayout(savedLayout);
} else {
  applyLayout(getPresetLayout(currentLayoutMode));
}

if (currentLayoutMode === 'tabs') {
  showTabBar(true);
  setActiveTab(activeTab);
}

focusPanel('panel-preview');

/* ═══════════════════════════════════════════
   URL hash encoding/decoding

   Uses LZString for ~60-80% shorter URLs.
   Backward compatible: detects old base64
   format (starts with "ey" after decode
   attempt) vs LZ format.
   ═══════════════════════════════════════════ */
function encodeState(html, css, js) {
  var json = JSON.stringify({ html: html, css: css, js: js });
  return LZString.compressToEncodedURIComponent(json);
}

function decodeState(hash) {
  var raw = hash.replace(/^#/, '');
  if (!raw) return null;

  try {
    var json = LZString.decompressFromEncodedURIComponent(raw);
    if (json) {
      var state = JSON.parse(json);
      if (typeof state.html === 'string' && typeof state.css === 'string' && typeof state.js === 'string') {
        return state;
      }
    }
  } catch(e) {}

  try {
    var legacy = decodeURIComponent(escape(atob(raw)));
    var state = JSON.parse(legacy);
    if (typeof state.html === 'string' && typeof state.css === 'string' && typeof state.js === 'string') {
      return state;
    }
  } catch(e) {}

  return null;
}

function updateHash() {
  var encoded = encodeState(editorHTML.value, editorCSS.value, editorJS.value);
  history.replaceState(null, '', '#' + encoded);
}

/* ═══════════════════════════════════════════
   Editor references and default content
   ═══════════════════════════════════════════ */
var editorHTML = document.getElementById('editor-html');
var editorCSS  = document.getElementById('editor-css');
var editorJS   = document.getElementById('editor-js');
var preview    = document.getElementById('preview');
var errorList  = document.getElementById('error-list');
var errorCount = document.getElementById('error-count');

var DEFAULT_HTML = '<div class="box">Hover me</div>';

var DEFAULT_CSS = [
  'body {',
  '  display: flex;',
  '  justify-content: center;',
  '  align-items: center;',
  '  height: 100vh;',
  '  margin: 0;',
  '  background: #1a1a2e;',
  '  font-family: sans-serif;',
  '}',
  '',
  '.box {',
  '  padding: 40px 60px;',
  '  background: #e94560;',
  '  color: #fff;',
  '  font-size: 24px;',
  '  border-radius: 12px;',
  '  cursor: pointer;',
  '  transition: transform 0.2s, box-shadow 0.2s;',
  '}',
  '',
  '.box:hover {',
  '  transform: scale(1.1) rotate(-2deg);',
  '  box-shadow: 0 8px 30px rgba(233, 69, 96, 0.4);',
  '}'
].join('\n');

var DEFAULT_JS = [
  'document.querySelector(".box").addEventListener("click", function() {',
  '  this.textContent = "Clicked!";',
  '  this.style.background = "#0f3460";',
  '});'
].join('\n');

var restored = decodeState(location.hash);
editorHTML.value = restored ? restored.html : DEFAULT_HTML;
editorCSS.value  = restored ? restored.css  : DEFAULT_CSS;
editorJS.value   = restored ? restored.js   : DEFAULT_JS;

/* ═══════════════════════════════════════════
   Initialize syntax highlighting
   ═══════════════════════════════════════════ */
var hlHTML = Highlight.createEditor(editorHTML, 'html');
var hlCSS  = Highlight.createEditor(editorCSS,  'css');
var hlJS   = Highlight.createEditor(editorJS,   'js');

/* ═══════════════════════════════════════════
   Run: build and inject preview
   ═══════════════════════════════════════════ */
var errorMessages = [];

function run() {
  var html = editorHTML.value;
  var css  = editorCSS.value;
  var js   = editorJS.value;

  errorMessages = [];
  errorList.innerHTML = '';
  errorCount.style.display = 'none';

  var doc = [
    '<!DOCTYPE html>',
    '<html><head><meta charset="UTF-8">',
    '<style>' + css + '<\/style>',
    '<\/head><body>',
    html,
    '<script>',
    'window.addEventListener("error", function(e) {',
    '  window.parent.postMessage({ type: "iframe-error", message: e.message, line: e.lineno }, "*");',
    '});',
    'try {',
    js,
    '} catch(e) {',
    '  window.parent.postMessage({ type: "iframe-error", message: e.message }, "*");',
    '}',
    '<\/script>',
    '<\/body><\/html>'
  ].join('\n');

  preview.srcdoc = doc;
  updateHash();
}

/* ═══════════════════════════════════════════
   Share: copy URL to clipboard
   ═══════════════════════════════════════════ */
var btnShare = document.getElementById('btn-share');

btnShare.addEventListener('click', function() {
  updateHash();
  var url = location.href;
  navigator.clipboard.writeText(url).then(function() {
    var tip = document.createElement('span');
    tip.className = 'tooltip visible';
    tip.textContent = 'Copied! (' + url.length + ' chars)';
    btnShare.appendChild(tip);
    setTimeout(function() {
      tip.classList.remove('visible');
      setTimeout(function() { tip.remove(); }, 200);
    }, 1500);
  });
});

/* ═══════════════════════════════════════════
   Error handling from iframe
   ═══════════════════════════════════════════ */
window.addEventListener('message', function(e) {
  if (!e.data || e.data.type !== 'iframe-error') return;

  var msg = e.data.message;
  if (e.data.line) msg += ' (line ' + e.data.line + ')';
  errorMessages.push(msg);

  var entry = document.createElement('div');
  entry.className = 'error-entry';
  entry.textContent = msg;
  errorList.appendChild(entry);

  errorCount.textContent = errorMessages.length;
  errorCount.style.display = 'inline';
});

/* ═══════════════════════════════════════════
   Debounced auto-run
   ═══════════════════════════════════════════ */
var debounceTimer = null;

function scheduleRun() {
  if (!autoRunCb.checked) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(run, 300);
}

editorHTML.addEventListener('input', scheduleRun);
editorCSS.addEventListener('input', scheduleRun);
editorJS.addEventListener('input', scheduleRun);

document.getElementById('btn-run').addEventListener('click', run);

/* ═══════════════════════════════════════════
   Tab key: insert spaces
   ═══════════════════════════════════════════ */
function handleTab(e) {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  var ta = e.target;
  var start = ta.selectionStart;
  var end = ta.selectionEnd;
  ta.value = ta.value.substring(0, start) + '  ' + ta.value.substring(end);
  ta.selectionStart = ta.selectionEnd = start + 2;
}

editorHTML.addEventListener('keydown', handleTab);
editorCSS.addEventListener('keydown', handleTab);
editorJS.addEventListener('keydown', handleTab);

/* ═══════════════════════════════════════════
   Reset layout button
   ═══════════════════════════════════════════ */
document.getElementById('btn-reset').addEventListener('click', function() {
  try { localStorage.removeItem('css-sandbox-layout'); } catch(e) {}
  dockedPanels = {};
  switchLayout(currentLayoutMode);
});

/* ═══════════════════════════════════════════
   Recalculate default layout on resize
   ═══════════════════════════════════════════ */
window.addEventListener('resize', function() {
  if (!loadLayout()) applyLayout(defaultLayout());
});

run();
