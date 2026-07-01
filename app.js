/* ═══════════════════════════════════════════
   Panel definitions
   ═══════════════════════════════════════════ */
var PANELS = [
  { id: 'panel-html',    title: 'HTML',    type: 'editor',  editorId: 'editor-html' },
  { id: 'panel-css',     title: 'CSS',     type: 'editor',  editorId: 'editor-css'  },
  { id: 'panel-js',      title: 'JS',      type: 'editor',  editorId: 'editor-js'   },
  { id: 'panel-preview', title: 'Preview', type: 'preview' },
  { id: 'panel-console', title: 'Console', type: 'console' }
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
  el.setAttribute('data-panel-id', def.id);

  var header = document.createElement('div');
  header.className = 'panel-header';

  var title = document.createElement('span');
  title.className = 'panel-title';
  title.textContent = def.title;
  header.appendChild(title);

  if (def.type === 'console') {
    var consoleBadge = document.createElement('span');
    consoleBadge.className = 'console-badge';
    consoleBadge.id = 'console-badge';
    consoleBadge.textContent = '0';
    header.appendChild(consoleBadge);
    var clearBtn = document.createElement('button');
    clearBtn.className = 'console-clear';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      clearConsole();
    });
    header.appendChild(clearBtn);
  }

  el.appendChild(header);

  var body = document.createElement('div');
  body.className = 'panel-body';
  body.setAttribute('data-owner', def.id);

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
  } else if (def.type === 'console') {
    var consoleLog = document.createElement('div');
    consoleLog.className = 'console-log';
    consoleLog.id = 'console-log';
    body.appendChild(consoleLog);
  }

  el.appendChild(body);

  var handles = ['rh-right', 'rh-bottom', 'rh-left', 'rh-top', 'rh-br', 'rh-bl', 'rh-tr', 'rh-tl'];
  handles.forEach(function(cls) {
    var handle = document.createElement('div');
    handle.className = 'resize-handle ' + cls;
    el.appendChild(handle);
  });

  workspace.appendChild(el);

  el.addEventListener('mousedown', function() {
    var hostId = getGroupHost(def.id);
    focusPanel(hostId);
  });
  initDrag(el, header);
  initResize(el);

  return el;
}

/* ═══════════════════════════════════════════
   Focus management (z-index stacking)
   ═══════════════════════════════════════════ */
function focusPanel(id) {
  Object.keys(panels).forEach(function(k) {
    var hostId = getGroupHost(k);
    panels[hostId].el.classList.remove('focused');
  });
  var hostId = getGroupHost(id);
  panels[hostId].el.classList.add('focused');
  panels[hostId].el.style.zIndex = ++zCounter;
}

/* ═══════════════════════════════════════════
   Panel grouping system

   Panels can be merged into tabbed groups.
   The "host" panel keeps its position/size
   and holds bodies of all grouped panels.
   Grouped "guest" panels are hidden.
   ═══════════════════════════════════════════ */
var groups = {};

function getGroupHost(panelId) {
  var keys = Object.keys(groups);
  for (var i = 0; i < keys.length; i++) {
    if (groups[keys[i]].indexOf(panelId) >= 0) return keys[i];
  }
  return panelId;
}

function getGroupMembers(hostId) {
  return groups[hostId] || [hostId];
}

function isGrouped(panelId) {
  return !!groups[getGroupHost(panelId)];
}

function getPanelTitle(panelId) {
  for (var i = 0; i < PANELS.length; i++) {
    if (PANELS[i].id === panelId) return PANELS[i].title;
  }
  return panelId;
}

function groupPanels(hostId, guestId) {
  if (hostId === guestId) return;

  var existingHostOfGuest = getGroupHost(guestId);
  if (existingHostOfGuest !== guestId) {
    ungroupPanel(guestId);
  }

  var existingHostOfHost = getGroupHost(hostId);
  if (existingHostOfHost !== hostId) {
    hostId = existingHostOfHost;
  }

  if (!groups[hostId]) {
    groups[hostId] = [hostId];
  }

  if (groups[guestId]) {
    var guestMembers = groups[guestId].slice();
    delete groups[guestId];
    guestMembers.forEach(function(m) {
      if (groups[hostId].indexOf(m) < 0) groups[hostId].push(m);
    });
  } else {
    if (groups[hostId].indexOf(guestId) < 0) {
      groups[hostId].push(guestId);
    }
  }

  var hostEl = panels[hostId].el;
  var members = groups[hostId];

  members.forEach(function(id) {
    if (id === hostId) return;
    var guestBody = panels[id].el.querySelector('.panel-body');
    hostEl.insertBefore(guestBody, hostEl.querySelector('.resize-handle'));
    panels[id].el.style.display = 'none';
  });

  renderGroupTabs(hostId);
  setGroupActiveTab(hostId, guestId);
}

function ungroupPanel(panelId) {
  var hostId = getGroupHost(panelId);
  if (!groups[hostId]) return;
  if (hostId === panelId && groups[hostId].length <= 1) {
    delete groups[hostId];
    removeGroupTabs(hostId);
    return;
  }

  if (panelId !== hostId) {
    var guestBody = panels[hostId].el.querySelector('.panel-body[data-owner="' + panelId + '"]');
    if (guestBody) {
      var guestEl = panels[panelId].el;
      guestEl.insertBefore(guestBody, guestEl.querySelector('.resize-handle'));
    }

    var idx = groups[hostId].indexOf(panelId);
    if (idx >= 0) groups[hostId].splice(idx, 1);

    var guestPanel = panels[panelId].el;
    guestPanel.style.display = '';
    var hostRect = panels[hostId].el;
    guestPanel.style.left   = (hostRect.offsetLeft + 30) + 'px';
    guestPanel.style.top    = (hostRect.offsetTop + 30) + 'px';
    guestPanel.style.width  = hostRect.offsetWidth + 'px';
    guestPanel.style.height = hostRect.offsetHeight + 'px';
  } else {
    var newHost = groups[hostId][1];
    var oldMembers = groups[hostId].slice();
    delete groups[hostId];

    var oldHostBody = panels[hostId].el.querySelector('.panel-body[data-owner="' + hostId + '"]');

    oldMembers.forEach(function(id) {
      if (id === hostId) return;
      var body = panels[hostId].el.querySelector('.panel-body[data-owner="' + id + '"]');
      if (body) {
        panels[id].el.insertBefore(body, panels[id].el.querySelector('.resize-handle'));
      }
      panels[id].el.style.display = '';
      panels[id].el.style.left   = panels[hostId].el.style.left;
      panels[id].el.style.top    = panels[hostId].el.style.top;
      panels[id].el.style.width  = panels[hostId].el.style.width;
      panels[id].el.style.height = panels[hostId].el.style.height;
    });

    if (oldMembers.length > 2) {
      var remaining = oldMembers.filter(function(id) { return id !== hostId; });
      var nh = remaining[0];
      groups[nh] = remaining;
      remaining.forEach(function(id) {
        if (id === nh) return;
        var body = panels[id].el.querySelector('.panel-body');
        panels[nh].el.insertBefore(body, panels[nh].el.querySelector('.resize-handle'));
        panels[id].el.style.display = 'none';
      });
      renderGroupTabs(nh);
      setGroupActiveTab(nh, nh);
    }

    removeGroupTabs(hostId);
    return;
  }

  if (groups[hostId].length <= 1) {
    delete groups[hostId];
    removeGroupTabs(hostId);
  } else {
    renderGroupTabs(hostId);
    setGroupActiveTab(hostId, groups[hostId][0]);
  }
}

function ungroupAll() {
  Object.keys(groups).forEach(function(hostId) {
    var members = groups[hostId].slice();
    members.forEach(function(id) {
      if (id !== hostId) {
        var body = panels[hostId].el.querySelector('.panel-body[data-owner="' + id + '"]');
        if (body) {
          panels[id].el.insertBefore(body, panels[id].el.querySelector('.resize-handle'));
        }
        panels[id].el.style.display = '';
      }
    });
    removeGroupTabs(hostId);
  });
  groups = {};
}

function renderGroupTabs(hostId) {
  var hostEl = panels[hostId].el;
  var existing = hostEl.querySelector('.group-tabs');
  if (existing) existing.remove();

  var members = groups[hostId];
  if (!members || members.length <= 1) return;

  hostEl.querySelector('.panel-header').style.display = 'none';

  var tabBar = document.createElement('div');
  tabBar.className = 'group-tabs';

  members.forEach(function(id) {
    var tab = document.createElement('div');
    tab.className = 'group-tab';
    tab.setAttribute('data-tab-id', id);

    var label = document.createElement('span');
    label.className = 'group-tab-label';
    label.textContent = getPanelTitle(id);
    tab.appendChild(label);

    var detachBtn = document.createElement('span');
    detachBtn.className = 'group-tab-detach';
    detachBtn.textContent = '\u00d7';
    detachBtn.title = 'Detach';
    detachBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      ungroupPanel(id);
    });
    tab.appendChild(detachBtn);

    tab.addEventListener('click', function() {
      setGroupActiveTab(hostId, id);
    });

    tabBar.appendChild(tab);
  });

  hostEl.insertBefore(tabBar, hostEl.querySelector('.panel-body'));
}

function removeGroupTabs(hostId) {
  var hostEl = panels[hostId].el;
  var existing = hostEl.querySelector('.group-tabs');
  if (existing) existing.remove();
  hostEl.querySelector('.panel-header').style.display = '';

  var bodies = hostEl.querySelectorAll('.panel-body');
  bodies.forEach(function(b) { b.style.display = ''; });
}

function setGroupActiveTab(hostId, activeId) {
  var hostEl = panels[hostId].el;
  var members = groups[hostId];
  if (!members) return;

  var tabs = hostEl.querySelectorAll('.group-tab');
  tabs.forEach(function(tab) {
    tab.classList.toggle('active', tab.getAttribute('data-tab-id') === activeId);
  });

  var bodies = hostEl.querySelectorAll('.panel-body');
  bodies.forEach(function(body) {
    body.style.display = body.getAttribute('data-owner') === activeId ? '' : 'none';
  });
}

/* ═══════════════════════════════════════════
   Merge detection during drag

   When hovering over another panel (not near
   workspace edges), show a merge indicator.
   On drop, group the panels together.
   ═══════════════════════════════════════════ */
var mergeTarget = null;

function findMergeTarget(clientX, clientY, draggedEl) {
  var wsRect = workspace.getBoundingClientRect();
  var x = clientX - wsRect.left;
  var y = clientY - wsRect.top;

  if (x < SNAP_THRESHOLD || x > wsRect.width - SNAP_THRESHOLD ||
      y < SNAP_THRESHOLD || y > wsRect.height - SNAP_THRESHOLD) {
    return null;
  }

  var best = null;
  var bestZ = -1;

  Object.keys(panels).forEach(function(id) {
    var el = panels[id].el;
    if (el === draggedEl) return;
    if (el.style.display === 'none') return;

    var r = el.getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
      var z = parseInt(el.style.zIndex) || 0;
      if (z > bestZ) {
        bestZ = z;
        best = id;
      }
    }
  });

  return best;
}

function showMergeIndicator(targetId) {
  if (mergeTarget === targetId) return;

  if (mergeTarget && panels[mergeTarget]) {
    panels[mergeTarget].el.classList.remove('merge-target');
  }

  mergeTarget = targetId;

  if (targetId && panels[targetId]) {
    panels[targetId].el.classList.add('merge-target');
  }
}

function clearMergeIndicator() {
  if (mergeTarget && panels[mergeTarget]) {
    panels[mergeTarget].el.classList.remove('merge-target');
  }
  mergeTarget = null;
}

/* ═══════════════════════════════════════════
   Snap zones: smart edge snapping
   ═══════════════════════════════════════════ */
var snapPreview    = document.getElementById('snap-preview');
var SNAP_THRESHOLD = 20;
var dockedPanels   = {};

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
    if (leftOccupied && !rightOccupied) return { x: midX, y: zone.y, w: zone.w / 2, h: zone.h };
    if (rightOccupied && !leftOccupied) return { x: zone.x, y: zone.y, w: zone.w / 2, h: zone.h };
    if (cursorX < midX) return { x: zone.x, y: zone.y, w: zone.w / 2, h: zone.h };
    return { x: midX, y: zone.y, w: zone.w / 2, h: zone.h };
  }

  var topOccupied = false, bottomOccupied = false;
  var midY = zone.y + zone.h / 2;
  occupied.forEach(function(d) {
    var center = d.zone.y + d.zone.h / 2;
    if (center < midY) topOccupied = true;
    else bottomOccupied = true;
  });
  if (topOccupied && !bottomOccupied) return { x: zone.x, y: midY, w: zone.w, h: zone.h / 2 };
  if (bottomOccupied && !topOccupied) return { x: zone.x, y: zone.y, w: zone.w, h: zone.h / 2 };
  if (cursorY < midY) return { x: zone.x, y: zone.y, w: zone.w, h: zone.h / 2 };
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
    if (e.target.closest('.console-clear')) return;
    if (e.target.closest('.group-tab-detach')) return;
    e.preventDefault();

    var panelId = el.id;
    var hostId = getGroupHost(panelId);
    var actualEl = panels[hostId].el;

    startX = e.clientX;
    startY = e.clientY;
    origX = actualEl.offsetLeft;
    origY = actualEl.offsetTop;

    undockPanel(actualEl);
    actualEl.classList.add('dragging');

    dragOverlay.style.display = 'block';
    dragOverlay.style.cursor = 'grabbing';

    function onMove(e) {
      actualEl.style.left = (origX + e.clientX - startX) + 'px';
      actualEl.style.top  = (origY + e.clientY - startY) + 'px';

      var snap = getSnapZone(e.clientX, e.clientY, actualEl);
      if (snap) {
        showSnapPreview(snap);
        clearMergeIndicator();
      } else {
        showSnapPreview(null);
        var target = findMergeTarget(e.clientX, e.clientY, actualEl);
        showMergeIndicator(target);
      }
    }

    function onUp(e) {
      actualEl.classList.remove('dragging');

      var snap = getSnapZone(e.clientX, e.clientY, actualEl);
      if (snap) {
        actualEl.style.left   = snap.x + 'px';
        actualEl.style.top    = snap.y + 'px';
        actualEl.style.width  = snap.w + 'px';
        actualEl.style.height = snap.h + 'px';
        dockPanel(actualEl, snap);
      } else {
        var target = findMergeTarget(e.clientX, e.clientY, actualEl);
        if (target) {
          groupPanels(target, hostId);
        }
      }

      clearMergeIndicator();
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
    var hostId = getGroupHost(id);
    var el = panels[hostId].el;
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
    if (el.style.display === 'none') return;
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
  var pvW = Math.floor(w * 0.6);
  var btmH = h - edH - 4;
  var conW = w - pvW - 4;

  return {
    'panel-html':    { x: 0,       y: 0,       w: edW,          h: edH },
    'panel-css':     { x: edW,     y: 0,       w: edW,          h: edH },
    'panel-js':      { x: edW * 2, y: 0,       w: w - edW * 2,  h: edH },
    'panel-preview': { x: 0,       y: edH + 4, w: pvW,          h: btmH },
    'panel-console': { x: pvW + 4, y: edH + 4, w: conW,         h: btmH }
  };
}

function layoutLeftRight() {
  var w = workspace.offsetWidth;
  var h = workspace.offsetHeight;
  var edW = Math.floor(w * 0.3);
  var edH = Math.floor(h / 3);
  var rightW = w - edW - 4;
  var pvH = Math.floor(h * 0.6);
  var conH = h - pvH - 4;

  return {
    'panel-html':    { x: 0,       y: 0,       w: edW,    h: edH },
    'panel-css':     { x: 0,       y: edH,     w: edW,    h: edH },
    'panel-js':      { x: 0,       y: edH * 2, w: edW,    h: h - edH * 2 },
    'panel-preview': { x: edW + 4, y: 0,       w: rightW, h: pvH },
    'panel-console': { x: edW + 4, y: pvH + 4, w: rightW, h: conH }
  };
}

function layoutTabs() {
  var w = workspace.offsetWidth;
  var h = workspace.offsetHeight;
  var tabH = 32;
  var edH = Math.floor((h - tabH) * 0.4);
  var btmH = h - tabH - edH - 4;

  return {
    'panel-html':    { x: 0, y: tabH,           w: w, h: edH },
    'panel-css':     { x: 0, y: tabH,           w: w, h: edH },
    'panel-js':      { x: 0, y: tabH,           w: w, h: edH },
    'panel-preview': { x: 0, y: tabH + edH + 4, w: w, h: btmH },
    'panel-console': { x: 0, y: tabH + edH + 4, w: w, h: btmH }
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
  ['panel-html', 'panel-css', 'panel-js', 'panel-preview', 'panel-console'].forEach(function(id) {
    if (!panels[id]) return;
    panels[id].el.style.display = '';
  });
}

function switchLayout(mode) {
  currentLayoutMode = mode;
  dockedPanels = {};

  ungroupAll();

  var layoutBtns = document.querySelectorAll('.layout-btn');
  layoutBtns.forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-layout') === mode);
  });

  restoreAllPanelsVisible();
  var preset = getPresetLayout(mode);
  applyLayout(preset);

  if (mode === 'tabs') {
    showTabBar(true);
    setActiveTab(activeTab);
    groupPanels('panel-preview', 'panel-console');
  } else {
    showTabBar(false);
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
  groupPanels('panel-preview', 'panel-console');
}

focusPanel('panel-preview');

/* ═══════════════════════════════════════════
   URL hash encoding/decoding
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
var consoleLog   = document.getElementById('console-log');
var consoleBadge = document.getElementById('console-badge');

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
function run() {
  var html = editorHTML.value;
  var css  = editorCSS.value;
  var js   = editorJS.value;

  consoleMessages = [];
  consoleLog.innerHTML = '';
  consoleBadge.style.display = 'none';

  var doc = [
    '<!DOCTYPE html>',
    '<html><head><meta charset="UTF-8">',
    '<style>' + css + '<\/style>',
    '<\/head><body>',
    html,
    '<script>',
    '(function() {',
    '  var methods = ["log", "warn", "error", "info"];',
    '  methods.forEach(function(m) {',
    '    var orig = console[m];',
    '    console[m] = function() {',
    '      var args = Array.prototype.slice.call(arguments);',
    '      var parts = args.map(function(a) {',
    '        if (typeof a === "object") { try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); } }',
    '        return String(a);',
    '      });',
    '      window.parent.postMessage({ type: "iframe-console", method: m, text: parts.join(" ") }, "*");',
    '      orig.apply(console, arguments);',
    '    };',
    '  });',
    '})();',
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
   Console output from iframe
   ═══════════════════════════════════════════ */
var consoleMessages = [];

function clearConsole() {
  consoleMessages = [];
  consoleLog.innerHTML = '';
  consoleBadge.style.display = 'none';
}

function addConsoleEntry(method, text) {
  consoleMessages.push({ method: method, text: text });

  var entry = document.createElement('div');
  entry.className = 'console-entry console-' + method;
  entry.textContent = text;
  consoleLog.appendChild(entry);
  consoleLog.scrollTop = consoleLog.scrollHeight;

  consoleBadge.textContent = consoleMessages.length;
  consoleBadge.style.display = 'inline';
}

/* ═══════════════════════════════════════════
   Message handler from iframe
   ═══════════════════════════════════════════ */
window.addEventListener('message', function(e) {
  if (!e.data) return;

  if (e.data.type === 'iframe-console') {
    addConsoleEntry(e.data.method, e.data.text);
    return;
  }

  if (e.data.type === 'iframe-error') {
    addConsoleEntry('error', e.data.message + (e.data.line ? ' (line ' + e.data.line + ')' : ''));
  }
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
