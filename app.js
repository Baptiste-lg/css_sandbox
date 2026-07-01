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
var extCSS      = [];
var extJS       = [];

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
    iframe.title = 'Preview';
    iframe.setAttribute('sandbox', 'allow-scripts');
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

  if (zCounter > 10000) {
    var sorted = Object.keys(panels)
      .map(function(k) { return panels[k].el; })
      .filter(function(el) { return el.style.display !== 'none'; })
      .sort(function(a, b) { return (parseInt(a.style.zIndex) || 0) - (parseInt(b.style.zIndex) || 0); });
    sorted.forEach(function(el, i) { el.style.zIndex = 100 + i; });
    zCounter = 100 + sorted.length;
  }
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
    var oldMembers = groups[hostId].slice();
    delete groups[hostId];

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

  function beginDrag(cx, cy) {
    var panelId = el.id;
    var hostId = getGroupHost(panelId);
    var actualEl = panels[hostId].el;

    startX = cx;
    startY = cy;
    origX = actualEl.offsetLeft;
    origY = actualEl.offsetTop;

    undockPanel(actualEl);
    actualEl.classList.add('dragging');
    dragOverlay.style.display = 'block';
    dragOverlay.style.cursor = 'grabbing';

    return { hostId: hostId, actualEl: actualEl };
  }

  function duringDrag(cx, cy, actualEl) {
    actualEl.style.left = (origX + cx - startX) + 'px';
    actualEl.style.top  = (origY + cy - startY) + 'px';

    var snap = getSnapZone(cx, cy, actualEl);
    if (snap) {
      showSnapPreview(snap);
      clearMergeIndicator();
    } else {
      showSnapPreview(null);
      var target = findMergeTarget(cx, cy, actualEl);
      showMergeIndicator(target);
    }
  }

  function endDrag(cx, cy, actualEl, hostId) {
    actualEl.classList.remove('dragging');

    var snap = getSnapZone(cx, cy, actualEl);
    if (snap) {
      actualEl.style.left   = snap.x + 'px';
      actualEl.style.top    = snap.y + 'px';
      actualEl.style.width  = snap.w + 'px';
      actualEl.style.height = snap.h + 'px';
      dockPanel(actualEl, snap);
    } else {
      var target = findMergeTarget(cx, cy, actualEl);
      if (target) {
        groupPanels(target, hostId);
      }
    }

    clearMergeIndicator();
    snapPreview.style.display = 'none';
    dragOverlay.style.display = 'none';
    dragOverlay.style.cursor = '';
    saveLayout();
  }

  header.addEventListener('mousedown', function(e) {
    if (e.target.closest('.resize-handle')) return;
    if (e.target.closest('.console-clear')) return;
    if (e.target.closest('.group-tab-detach')) return;
    e.preventDefault();

    var ctx = beginDrag(e.clientX, e.clientY);

    function onMove(e) { duringDrag(e.clientX, e.clientY, ctx.actualEl); }
    function onUp(e) {
      endDrag(e.clientX, e.clientY, ctx.actualEl, ctx.hostId);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  header.addEventListener('touchstart', function(e) {
    if (e.target.closest('.resize-handle')) return;
    if (e.target.closest('.console-clear')) return;
    if (e.target.closest('.group-tab-detach')) return;

    var t = e.touches[0];
    var ctx = beginDrag(t.clientX, t.clientY);

    function onMove(e) {
      e.preventDefault();
      var t = e.touches[0];
      duringDrag(t.clientX, t.clientY, ctx.actualEl);
    }
    function onEnd(e) {
      var t = e.changedTouches[0];
      endDrag(t.clientX, t.clientY, ctx.actualEl, ctx.hostId);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    }

    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }, { passive: true });
}

/* ═══════════════════════════════════════════
   Resize: 8-directional handles
   ═══════════════════════════════════════════ */
function initResize(el) {
  var handles = el.querySelectorAll('.resize-handle');
  var MIN_W = 160, MIN_H = 100;

  handles.forEach(function(handle) {
    function beginResize(cx, cy) {
      undockPanel(el);
      el.classList.add('dragging');
      var cls = handle.className;
      dragOverlay.style.display = 'block';
      dragOverlay.style.cursor = getComputedStyle(handle).cursor;
      return {
        startX: cx, startY: cy,
        origW: el.offsetWidth, origH: el.offsetHeight,
        origL: el.offsetLeft, origT: el.offsetTop,
        resizeR: cls.indexOf('rh-right') >= 0 || cls.indexOf('rh-br') >= 0 || cls.indexOf('rh-tr') >= 0,
        resizeB: cls.indexOf('rh-bottom') >= 0 || cls.indexOf('rh-br') >= 0 || cls.indexOf('rh-bl') >= 0,
        resizeL: cls.indexOf('rh-left') >= 0 || cls.indexOf('rh-bl') >= 0 || cls.indexOf('rh-tl') >= 0,
        resizeT: cls.indexOf('rh-top') >= 0 || cls.indexOf('rh-tr') >= 0 || cls.indexOf('rh-tl') >= 0
      };
    }

    function duringResize(cx, cy, s) {
      var dx = cx - s.startX;
      var dy = cy - s.startY;
      if (s.resizeR) el.style.width  = Math.max(MIN_W, s.origW + dx) + 'px';
      if (s.resizeB) el.style.height = Math.max(MIN_H, s.origH + dy) + 'px';
      if (s.resizeL) {
        var newW = Math.max(MIN_W, s.origW - dx);
        el.style.width = newW + 'px';
        el.style.left  = (s.origL + s.origW - newW) + 'px';
      }
      if (s.resizeT) {
        var newH = Math.max(MIN_H, s.origH - dy);
        el.style.height = newH + 'px';
        el.style.top    = (s.origT + s.origH - newH) + 'px';
      }
    }

    function endResize() {
      el.classList.remove('dragging');
      dragOverlay.style.display = 'none';
      dragOverlay.style.cursor = '';
      saveLayout();
    }

    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var s = beginResize(e.clientX, e.clientY);

      function onMove(e) { duringResize(e.clientX, e.clientY, s); }
      function onUp() {
        endResize();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    handle.addEventListener('touchstart', function(e) {
      e.stopPropagation();
      var t = e.touches[0];
      var s = beginResize(t.clientX, t.clientY);

      function onMove(e) {
        e.preventDefault();
        var t = e.touches[0];
        duringResize(t.clientX, t.clientY, s);
      }
      function onEnd() {
        endResize();
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
      }
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
    }, { passive: true });
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
  var data = {
    panels: layout,
    workspaceW: workspace.offsetWidth,
    workspaceH: workspace.offsetHeight
  };
  try {
    localStorage.setItem('css-sandbox-layout', JSON.stringify(data));
    localStorage.setItem('css-sandbox-groups', JSON.stringify(groups));
  } catch(e) {}
}

function loadLayout() {
  try {
    var saved = localStorage.getItem('css-sandbox-layout');
    if (!saved) return null;
    var data = JSON.parse(saved);
    if (data.panels) return data;
    /* backwards compat: old format was just the panels object */
    return { panels: data, workspaceW: 0, workspaceH: 0 };
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
  applyLayout(savedLayout.panels);
} else {
  applyLayout(getPresetLayout(currentLayoutMode));
}

try {
  var savedGroups = localStorage.getItem('css-sandbox-groups');
  if (savedGroups) {
    var restoredGroups = JSON.parse(savedGroups);
    Object.keys(restoredGroups).forEach(function(hostId) {
      var members = restoredGroups[hostId];
      for (var i = 1; i < members.length; i++) {
        groupPanels(hostId, members[i]);
      }
    });
  }
} catch(e) {}

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
  var state = { html: html, css: css, js: js };
  if (extCSS.length) state.extCss = extCSS;
  if (extJS.length) state.extJs = extJS;
  return LZString.compressToEncodedURIComponent(JSON.stringify(state));
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

if (restored && restored.extCss) extCSS = restored.extCss;
if (restored && restored.extJs)  extJS  = restored.extJs;

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

  var extCssLinks = extCSS.map(function(url) {
    return '<link rel="stylesheet" href="' + url.replace(/"/g, '&quot;') + '">';
  }).join('\n');
  var extJsTags = extJS.map(function(url) {
    return '<script src="' + url.replace(/"/g, '&quot;') + '"><\/script>';
  }).join('\n');

  var doc = [
    '<!DOCTYPE html>',
    '<html><head><meta charset="UTF-8">',
    extCssLinks,
    '<style>' + css + '<\/style>',
    '<\/head><body>',
    html,
    extJsTags,
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

  function showShareTooltip(text) {
    var existing = btnShare.querySelector('.tooltip');
    if (existing) existing.remove();

    var tip = document.createElement('span');
    tip.className = 'tooltip visible';
    tip.textContent = text;
    btnShare.appendChild(tip);
    setTimeout(function() {
      tip.classList.remove('visible');
      setTimeout(function() { tip.remove(); }, 200);
    }, 1500);
  }

  function fallbackCopy() {
    var tmp = document.createElement('textarea');
    tmp.value = url;
    tmp.style.position = 'fixed';
    tmp.style.opacity = '0';
    document.body.appendChild(tmp);
    tmp.select();
    try {
      document.execCommand('copy');
      showShareTooltip('Copied! (' + url.length + ' chars)');
    } catch(e) {
      showShareTooltip('Copy failed');
    }
    document.body.removeChild(tmp);
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function() {
      showShareTooltip('Copied! (' + url.length + ' chars)');
    }).catch(fallbackCopy);
  } else {
    fallbackCopy();
  }
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
  entry.className = 'console-entry console-level-' + method;
  entry.textContent = text;
  consoleLog.appendChild(entry);
  consoleLog.scrollTop = consoleLog.scrollHeight;

  consoleBadge.textContent = consoleMessages.length;
  consoleBadge.style.display = 'inline';
}

/* Message handler is set up later with structured console args support */

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
  var val = ta.value;

  if (start === end && !e.shiftKey) {
    ta.value = val.substring(0, start) + '  ' + val.substring(end);
    ta.selectionStart = ta.selectionEnd = start + 2;
  } else {
    var lineStart = val.lastIndexOf('\n', start - 1) + 1;
    var lineEnd = val.indexOf('\n', end);
    if (lineEnd < 0) lineEnd = val.length;
    var block = val.substring(lineStart, lineEnd);
    var lines = block.split('\n');
    var newLines;
    var delta = 0;
    var firstDelta = 0;

    if (e.shiftKey) {
      newLines = lines.map(function(line, i) {
        if (line.substring(0, 2) === '  ') {
          if (i === 0) firstDelta = -2;
          delta -= 2;
          return line.substring(2);
        } else if (line.charAt(0) === ' ') {
          if (i === 0) firstDelta = -1;
          delta -= 1;
          return line.substring(1);
        }
        return line;
      });
    } else {
      newLines = lines.map(function(line) {
        delta += 2;
        return '  ' + line;
      });
      firstDelta = 2;
    }

    var replaced = newLines.join('\n');
    ta.value = val.substring(0, lineStart) + replaced + val.substring(lineEnd);
    ta.selectionStart = Math.max(lineStart, start + firstDelta);
    ta.selectionEnd = end + delta;
  }

  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ═══════════════════════════════════════════
   Auto-closing brackets and quotes
   ═══════════════════════════════════════════ */
var PAIRS = { '{': '}', '(': ')', '[': ']', '"': '"', "'": "'", '`': '`' };
var CLOSERS = { '}': true, ')': true, ']': true, '"': true, "'": true, '`': true };

function handleAutoPair(e) {
  var ta = e.target;
  var start = ta.selectionStart;
  var end = ta.selectionEnd;
  var val = ta.value;
  var ch = e.key;

  if (PAIRS[ch]) {
    e.preventDefault();
    var close = PAIRS[ch];
    if (start !== end) {
      var sel = val.substring(start, end);
      ta.value = val.substring(0, start) + ch + sel + close + val.substring(end);
      ta.selectionStart = start + 1;
      ta.selectionEnd = end + 1;
    } else {
      ta.value = val.substring(0, start) + ch + close + val.substring(end);
      ta.selectionStart = ta.selectionEnd = start + 1;
    }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  if (CLOSERS[ch] && val.charAt(start) === ch && start === end) {
    e.preventDefault();
    ta.selectionStart = ta.selectionEnd = start + 1;
    return;
  }

  if (ch === 'Backspace' && start === end && start > 0) {
    var before = val.charAt(start - 1);
    var after = val.charAt(start);
    if (PAIRS[before] && PAIRS[before] === after) {
      e.preventDefault();
      ta.value = val.substring(0, start - 1) + val.substring(start + 1);
      ta.selectionStart = ta.selectionEnd = start - 1;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

function handleEditorKeys(e) {
  handleTab(e);
  if (!e.defaultPrevented) handleAutoPair(e);
}

editorHTML.addEventListener('keydown', handleEditorKeys);
editorCSS.addEventListener('keydown', handleEditorKeys);
editorJS.addEventListener('keydown', handleEditorKeys);

/* ═══════════════════════════════════════════
   New button: reset editors to defaults
   ═══════════════════════════════════════════ */
document.getElementById('btn-new').addEventListener('click', function() {
  editorHTML.value = DEFAULT_HTML;
  editorCSS.value  = DEFAULT_CSS;
  editorJS.value   = DEFAULT_JS;
  extCSS = [];
  extJS  = [];
  hlHTML.update();
  hlCSS.update();
  hlJS.update();
  history.replaceState(null, '', location.pathname);
  run();
});

/* ═══════════════════════════════════════════
   Reset layout button
   ═══════════════════════════════════════════ */
document.getElementById('btn-reset').addEventListener('click', function() {
  try { localStorage.removeItem('css-sandbox-layout'); } catch(e) {}
  dockedPanels = {};
  switchLayout(currentLayoutMode);
});

/* ═══════════════════════════════════════════
   Settings modal: external resources
   ═══════════════════════════════════════════ */
var settingsModal = document.getElementById('settings-modal');
var extCssInput   = document.getElementById('ext-css');
var extJsInput    = document.getElementById('ext-js');

function parseLines(str) {
  return str.split('\n').map(function(s) { return s.trim(); }).filter(function(s) {
    if (s.length === 0) return false;
    if (/^(https?:)?\/\//.test(s)) return true;
    addConsoleEntry('warn', 'Ignored invalid resource URL: ' + s);
    return false;
  });
}

function openSettings() {
  extCssInput.value = extCSS.join('\n');
  extJsInput.value  = extJS.join('\n');
  updatePresetButtons();
  settingsModal.classList.remove('hidden');
}

function closeSettings() {
  settingsModal.classList.add('hidden');
}

function updatePresetButtons() {
  var allUrls = extCSS.concat(extJS);
  document.querySelectorAll('.preset-btn').forEach(function(btn) {
    var urls = [btn.getAttribute('data-css'), btn.getAttribute('data-js')].filter(Boolean);
    var active = urls.every(function(u) { return allUrls.indexOf(u) >= 0; });
    btn.classList.toggle('active', active);
  });
}

document.getElementById('btn-settings').addEventListener('click', openSettings);
document.getElementById('settings-close').addEventListener('click', closeSettings);
document.getElementById('settings-apply').addEventListener('click', function() {
  extCSS = parseLines(extCssInput.value);
  extJS  = parseLines(extJsInput.value);
  closeSettings();
  run();
});

settingsModal.addEventListener('click', function(e) {
  if (e.target === settingsModal) closeSettings();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (!settingsModal.classList.contains('hidden')) { closeSettings(); return; }
    var snippMod = document.getElementById('snippets-modal');
    if (snippMod && !snippMod.classList.contains('hidden')) { snippMod.classList.add('hidden'); return; }
    if (!document.getElementById('find-bar').classList.contains('hidden')) { closeFindBar(); return; }
  }
});

document.querySelectorAll('.preset-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var cssUrl = btn.getAttribute('data-css');
    var jsUrl  = btn.getAttribute('data-js');

    var currentCss = parseLines(extCssInput.value);
    var currentJs  = parseLines(extJsInput.value);

    var allActive = true;
    if (cssUrl && currentCss.indexOf(cssUrl) < 0) allActive = false;
    if (jsUrl && currentJs.indexOf(jsUrl) < 0) allActive = false;

    if (allActive) {
      if (cssUrl) currentCss = currentCss.filter(function(u) { return u !== cssUrl; });
      if (jsUrl)  currentJs  = currentJs.filter(function(u) { return u !== jsUrl; });
    } else {
      if (cssUrl && currentCss.indexOf(cssUrl) < 0) currentCss.push(cssUrl);
      if (jsUrl && currentJs.indexOf(jsUrl) < 0)    currentJs.push(jsUrl);
    }

    extCssInput.value = currentCss.join('\n');
    extJsInput.value  = currentJs.join('\n');

    extCSS = currentCss;
    extJS  = currentJs;
    updatePresetButtons();
  });
});

/* ═══════════════════════════════════════════
   Keyboard shortcuts
   ═══════════════════════════════════════════ */
document.addEventListener('keydown', function(e) {
  var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  var mod = isMac ? e.metaKey : e.ctrlKey;

  if (mod && e.key === 's') {
    e.preventDefault();
    run();
    return;
  }

  if (mod && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
    e.preventDefault();
    btnShare.click();
    return;
  }

  if (mod && (e.key === '1' || e.key === '2' || e.key === '3')) {
    e.preventDefault();
    var editors = [editorHTML, editorCSS, editorJS];
    editors[parseInt(e.key) - 1].focus();
    return;
  }
});

/* ═══════════════════════════════════════════
   Download: export as standalone HTML file
   ═══════════════════════════════════════════ */
document.getElementById('btn-download').addEventListener('click', function() {
  var html = editorHTML.value;
  var css  = editorCSS.value;
  var js   = editorJS.value;

  var extCssLinks = extCSS.map(function(url) {
    return '  <link rel="stylesheet" href="' + url.replace(/"/g, '&quot;') + '">';
  }).join('\n');
  var extJsTags = extJS.map(function(url) {
    return '  <script src="' + url.replace(/"/g, '&quot;') + '"><\/script>';
  }).join('\n');

  var parts = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>CSS Sandbox Export</title>'
  ];
  if (extCssLinks) parts.push(extCssLinks);
  parts.push('  <style>', css, '  </style>', '</head>', '<body>', html);
  if (extJsTags) parts.push(extJsTags);
  parts.push('  <script>', js, '  <\/script>', '</body>', '</html>');
  var file = parts.join('\n');

  var blob = new Blob([file], { type: 'text/html' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sandbox-export.html';
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ═══════════════════════════════════════════
   Recalculate default layout on resize
   ═══════════════════════════════════════════ */
var resizeTimer = null;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    var saved = loadLayout();
    if (saved && saved.workspaceW && saved.workspaceH) {
      var scaleX = workspace.offsetWidth / saved.workspaceW;
      var scaleY = workspace.offsetHeight / saved.workspaceH;
      var scaled = {};
      Object.keys(saved.panels).forEach(function(id) {
        var r = saved.panels[id];
        scaled[id] = {
          x: Math.round(r.x * scaleX),
          y: Math.round(r.y * scaleY),
          w: Math.round(r.w * scaleX),
          h: Math.round(r.h * scaleY)
        };
      });
      applyLayout(scaled);
    } else {
      applyLayout(defaultLayout());
    }
    saveLayout();
  }, 200);
});

/* ═══════════════════════════════════════════
   Update footer shortcut hints for Mac
   ═══════════════════════════════════════════ */
if (/Mac|iPhone|iPad|iPod/.test(navigator.userAgent)) {
  var kbds = document.querySelectorAll('#footer kbd');
  kbds.forEach(function(kbd) {
    kbd.textContent = kbd.textContent.replace('Ctrl', 'Cmd');
  });
}

/* ═══════════════════════════════════════════
   Theme toggle (dark/light)
   ═══════════════════════════════════════════ */
var btnTheme = document.getElementById('btn-theme');
var currentTheme = 'dark';
try { currentTheme = localStorage.getItem('css-sandbox-theme') || 'dark'; } catch(e) {}

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  btnTheme.textContent = theme === 'dark' ? 'Light' : 'Dark';
  try { localStorage.setItem('css-sandbox-theme', theme); } catch(e) {}
}

applyTheme(currentTheme);
btnTheme.addEventListener('click', function() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

/* ═══════════════════════════════════════════
   Saved snippets (local gallery)
   ═══════════════════════════════════════════ */
var snippetsModal = document.getElementById('snippets-modal');
var snippetsList = document.getElementById('snippets-list');
var snippetNameInput = document.getElementById('snippet-name');

function getSnippets() {
  try {
    var s = localStorage.getItem('css-sandbox-snippets');
    return s ? JSON.parse(s) : [];
  } catch(e) { return []; }
}

function saveSnippets(arr) {
  try { localStorage.setItem('css-sandbox-snippets', JSON.stringify(arr)); } catch(e) {}
}

function renderSnippets() {
  var snippets = getSnippets();
  snippetsList.innerHTML = '';
  if (snippets.length === 0) {
    snippetsList.innerHTML = '<div style="color:var(--text-dim);font-style:italic;padding:8px 0">No saved snippets</div>';
    return;
  }
  snippets.forEach(function(s, idx) {
    var row = document.createElement('div');
    row.className = 'snippet-row';

    var name = document.createElement('span');
    name.className = 'snippet-name';
    name.textContent = s.name;
    name.title = new Date(s.timestamp).toLocaleString();
    row.appendChild(name);

    var loadBtn = document.createElement('button');
    loadBtn.className = 'snippet-action';
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', function() {
      editorHTML.value = s.html;
      editorCSS.value = s.css;
      editorJS.value = s.js;
      extCSS = s.extCss || [];
      extJS = s.extJs || [];
      hlHTML.update(); hlCSS.update(); hlJS.update();
      snippetsModal.classList.add('hidden');
      run();
    });
    row.appendChild(loadBtn);

    var delBtn = document.createElement('button');
    delBtn.className = 'snippet-action snippet-delete';
    delBtn.textContent = 'Del';
    delBtn.addEventListener('click', function() {
      var arr = getSnippets();
      arr.splice(idx, 1);
      saveSnippets(arr);
      renderSnippets();
    });
    row.appendChild(delBtn);

    snippetsList.appendChild(row);
  });
}

document.getElementById('btn-snippets').addEventListener('click', function() {
  renderSnippets();
  snippetsModal.classList.remove('hidden');
});

document.getElementById('snippets-close').addEventListener('click', function() {
  snippetsModal.classList.add('hidden');
});

snippetsModal.addEventListener('click', function(e) {
  if (e.target === snippetsModal) snippetsModal.classList.add('hidden');
});

document.getElementById('snippet-save').addEventListener('click', function() {
  var name = snippetNameInput.value.trim();
  if (!name) { snippetNameInput.focus(); return; }
  var snippets = getSnippets();
  snippets.unshift({
    name: name,
    html: editorHTML.value,
    css: editorCSS.value,
    js: editorJS.value,
    extCss: extCSS,
    extJs: extJS,
    timestamp: Date.now()
  });
  saveSnippets(snippets);
  snippetNameInput.value = '';
  renderSnippets();
});

/* ═══════════════════════════════════════════
   Find and replace (Ctrl+F / Ctrl+H)
   ═══════════════════════════════════════════ */
var findBar = document.getElementById('find-bar');
var findInput = document.getElementById('find-input');
var replaceInput = document.getElementById('replace-input');
var findCount = document.getElementById('find-count');
var findTarget = null;
var findMatches = [];
var findIndex = -1;

function openFindBar(withReplace) {
  var active = document.activeElement;
  if (active === editorHTML || active === editorCSS || active === editorJS) {
    findTarget = active;
  } else if (!findTarget) {
    findTarget = editorHTML;
  }
  findBar.classList.remove('hidden');
  replaceInput.style.display = withReplace ? '' : 'none';
  document.getElementById('find-replace-btn').style.display = withReplace ? '' : 'none';
  document.getElementById('find-replace-all').style.display = withReplace ? '' : 'none';
  findInput.focus();
  findInput.select();
  doFind();
}

function closeFindBar() {
  findBar.classList.add('hidden');
  findMatches = [];
  findIndex = -1;
  findCount.textContent = '';
  if (findTarget) findTarget.focus();
}

function doFind() {
  findMatches = [];
  findIndex = -1;
  var query = findInput.value;
  if (!query || !findTarget) {
    findCount.textContent = '';
    return;
  }
  var text = findTarget.value;
  var pos = 0;
  var lq = query.toLowerCase();
  var lt = text.toLowerCase();
  while (true) {
    var idx = lt.indexOf(lq, pos);
    if (idx < 0) break;
    findMatches.push(idx);
    pos = idx + 1;
  }
  findCount.textContent = findMatches.length + ' found';
  if (findMatches.length > 0) {
    var cursor = findTarget.selectionStart;
    findIndex = 0;
    for (var i = 0; i < findMatches.length; i++) {
      if (findMatches[i] >= cursor) { findIndex = i; break; }
    }
    selectMatch();
  }
}

function selectMatch() {
  if (findIndex < 0 || findIndex >= findMatches.length) return;
  var start = findMatches[findIndex];
  findTarget.focus();
  findTarget.selectionStart = start;
  findTarget.selectionEnd = start + findInput.value.length;
  findCount.textContent = (findIndex + 1) + '/' + findMatches.length;
}

function findNext() {
  if (findMatches.length === 0) return;
  findIndex = (findIndex + 1) % findMatches.length;
  selectMatch();
}

function findPrev() {
  if (findMatches.length === 0) return;
  findIndex = (findIndex - 1 + findMatches.length) % findMatches.length;
  selectMatch();
}

function doReplace() {
  if (findIndex < 0 || !findTarget) return;
  var start = findMatches[findIndex];
  var len = findInput.value.length;
  var val = findTarget.value;
  findTarget.value = val.substring(0, start) + replaceInput.value + val.substring(start + len);
  findTarget.dispatchEvent(new Event('input', { bubbles: true }));
  doFind();
}

function doReplaceAll() {
  if (!findTarget || !findInput.value) return;
  var val = findTarget.value;
  var query = findInput.value;
  var result = '';
  var pos = 0;
  var lq = query.toLowerCase();
  var lv = val.toLowerCase();
  while (true) {
    var idx = lv.indexOf(lq, pos);
    if (idx < 0) { result += val.substring(pos); break; }
    result += val.substring(pos, idx) + replaceInput.value;
    pos = idx + query.length;
  }
  findTarget.value = result;
  findTarget.dispatchEvent(new Event('input', { bubbles: true }));
  doFind();
}

findInput.addEventListener('input', doFind);
document.getElementById('find-next').addEventListener('click', findNext);
document.getElementById('find-prev').addEventListener('click', findPrev);
document.getElementById('find-replace-btn').addEventListener('click', doReplace);
document.getElementById('find-replace-all').addEventListener('click', doReplaceAll);
document.getElementById('find-close').addEventListener('click', closeFindBar);

findInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.shiftKey ? findPrev() : findNext(); e.preventDefault(); }
  if (e.key === 'Escape') closeFindBar();
});
replaceInput.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeFindBar();
});

/* ═══════════════════════════════════════════
   Error line highlighting in JS editor
   ═══════════════════════════════════════════ */
var errorLineEl = null;

function clearErrorLine() {
  if (errorLineEl) { errorLineEl.remove(); errorLineEl = null; }
}

function highlightErrorLine(lineNum) {
  clearErrorLine();
  if (!lineNum || lineNum < 1) return;
  var wrap = editorJS.parentElement;
  if (!wrap) return;
  var lineH = parseFloat(getComputedStyle(editorJS).lineHeight) || 19.5;
  var top = (lineNum - 1) * lineH + 10;
  errorLineEl = document.createElement('div');
  errorLineEl.className = 'error-line-highlight';
  errorLineEl.style.top = top + 'px';
  errorLineEl.style.height = lineH + 'px';
  wrap.appendChild(errorLineEl);
}

/* ═══════════════════════════════════════════
   Console object expansion (collapsible tree)
   ═══════════════════════════════════════════ */
function renderValue(val, depth) {
  depth = depth || 0;
  if (depth > 6) return document.createTextNode('...');

  if (val === null) {
    var s = document.createElement('span');
    s.className = 'console-null';
    s.textContent = 'null';
    return s;
  }
  if (val === undefined) {
    var s = document.createElement('span');
    s.className = 'console-null';
    s.textContent = 'undefined';
    return s;
  }
  if (typeof val === 'string') {
    var s = document.createElement('span');
    s.className = 'console-string';
    s.textContent = '"' + val + '"';
    return s;
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    var s = document.createElement('span');
    s.className = 'console-primitive';
    s.textContent = String(val);
    return s;
  }
  if (Array.isArray(val)) {
    var container = document.createElement('span');
    if (val.length === 0) {
      container.textContent = '[]';
      return container;
    }
    var toggle = document.createElement('span');
    toggle.className = 'console-toggle';
    toggle.textContent = '\u25B6 ';
    var arrLabel = document.createElement('span');
    arrLabel.textContent = 'Array(' + val.length + ')';
    var detail = document.createElement('div');
    detail.className = 'console-tree hidden';
    val.forEach(function(item, i) {
      var row = document.createElement('div');
      row.className = 'console-tree-row';
      var key = document.createElement('span');
      key.className = 'console-key';
      key.textContent = i + ': ';
      row.appendChild(key);
      row.appendChild(renderValue(item, depth + 1));
      detail.appendChild(row);
    });
    toggle.addEventListener('click', function() {
      var open = !detail.classList.contains('hidden');
      detail.classList.toggle('hidden');
      toggle.textContent = open ? '\u25B6 ' : '\u25BC ';
    });
    container.appendChild(toggle);
    container.appendChild(arrLabel);
    container.appendChild(detail);
    return container;
  }
  if (typeof val === 'object') {
    var container = document.createElement('span');
    var keys = Object.keys(val);
    if (keys.length === 0) {
      container.textContent = '{}';
      return container;
    }
    var toggle = document.createElement('span');
    toggle.className = 'console-toggle';
    toggle.textContent = '\u25B6 ';
    var objLabel = document.createElement('span');
    objLabel.textContent = '{...}';
    var detail = document.createElement('div');
    detail.className = 'console-tree hidden';
    keys.forEach(function(k) {
      var row = document.createElement('div');
      row.className = 'console-tree-row';
      var key = document.createElement('span');
      key.className = 'console-key';
      key.textContent = k + ': ';
      row.appendChild(key);
      row.appendChild(renderValue(val[k], depth + 1));
      detail.appendChild(row);
    });
    toggle.addEventListener('click', function() {
      var open = !detail.classList.contains('hidden');
      detail.classList.toggle('hidden');
      toggle.textContent = open ? '\u25B6 ' : '\u25BC ';
    });
    container.appendChild(toggle);
    container.appendChild(objLabel);
    container.appendChild(detail);
    return container;
  }
  return document.createTextNode(String(val));
}

/* ═══════════════════════════════════════════
   Responsive preview viewports
   ═══════════════════════════════════════════ */
var viewportSelect = document.getElementById('viewport-select');
viewportSelect.addEventListener('change', function() {
  var val = viewportSelect.value;
  var iframe = document.getElementById('preview');
  var body = iframe.parentElement;
  if (val === 'responsive') {
    iframe.style.width = '';
    iframe.style.height = '';
    iframe.style.margin = '';
    body.style.overflow = '';
  } else {
    var dims = val.split('x');
    iframe.style.width = dims[0] + 'px';
    iframe.style.height = dims[1] + 'px';
    iframe.style.margin = '0 auto';
    body.style.overflow = 'auto';
  }
});

/* ═══════════════════════════════════════════
   Code formatting (lightweight)
   ═══════════════════════════════════════════ */
function formatHTML(src) {
  var indent = 0;
  var lines = src.replace(/>\s*</g, '>\n<').split('\n');
  var voidTags = /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)/i;
  return lines.map(function(line) {
    line = line.trim();
    if (!line) return '';
    if (/^<\//.test(line)) indent = Math.max(0, indent - 1);
    var result = '  '.repeat(indent) + line;
    if (/^<[a-z][\w-]*/i.test(line) && !voidTags.test(line) && !/<\/[^>]+>\s*$/.test(line) && !/\/>\s*$/.test(line)) {
      indent++;
    }
    return result;
  }).join('\n');
}

function formatCSS(src) {
  var result = src
    .replace(/\s*{\s*/g, ' {\n')
    .replace(/\s*}\s*/g, '\n}\n')
    .replace(/;\s*/g, ';\n')
    .replace(/\n\s*\n/g, '\n');
  var indent = 0;
  return result.split('\n').map(function(line) {
    line = line.trim();
    if (!line) return '';
    if (line === '}') indent = Math.max(0, indent - 1);
    var out = '  '.repeat(indent) + line;
    if (line.indexOf('{') >= 0 && line.indexOf('}') < 0) indent++;
    return out;
  }).filter(function(l) { return l.trim() !== ''; }).join('\n');
}

function formatJS(src) {
  var result = src
    .replace(/\s*{\s*/g, ' {\n')
    .replace(/\s*}\s*/g, '\n}\n')
    .replace(/;\s*(?!\s*[}\]])(?!\s*$)/g, ';\n');
  var indent = 0;
  return result.split('\n').map(function(line) {
    line = line.trim();
    if (!line) return '';
    if (/^[}\]]/.test(line)) indent = Math.max(0, indent - 1);
    var out = '  '.repeat(indent) + line;
    if (/[{(\[]\s*$/.test(line)) indent++;
    return out;
  }).filter(function(l) { return l.trim() !== ''; }).join('\n');
}

document.getElementById('btn-format').addEventListener('click', function() {
  var active = document.activeElement;
  if (active === editorHTML) {
    editorHTML.value = formatHTML(editorHTML.value);
    hlHTML.update();
  } else if (active === editorCSS) {
    editorCSS.value = formatCSS(editorCSS.value);
    hlCSS.update();
  } else if (active === editorJS) {
    editorJS.value = formatJS(editorJS.value);
    hlJS.update();
  }
  scheduleRun();
});

/* ═══════════════════════════════════════════
   Import from URL
   ═══════════════════════════════════════════ */
document.getElementById('btn-import').addEventListener('click', function() {
  var url = prompt('Enter URL to import (raw file, Gist, etc.):');
  if (!url) return;
  fetch(url).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.text();
  }).then(function(text) {
    var ext = url.split('?')[0].split('.').pop().toLowerCase();
    if (ext === 'css') {
      editorCSS.value = text;
      hlCSS.update();
    } else if (ext === 'js') {
      editorJS.value = text;
      hlJS.update();
    } else {
      editorHTML.value = text;
      hlHTML.update();
    }
    scheduleRun();
  }).catch(function(e) {
    addConsoleEntry('error', 'Import failed: ' + e.message);
  });
});

/* ═══════════════════════════════════════════
   Persistent console with run separators
   ═══════════════════════════════════════════ */
var clearOnRunCb = document.getElementById('clear-on-run');
var runCount = 0;

/* ═══════════════════════════════════════════
   Performance mode for large code
   ═══════════════════════════════════════════ */
var PERF_THRESHOLD = 5000;
var perfIndicator = document.getElementById('perf-indicator');
var hlTimers = {};

function checkPerfMode() {
  var total = editorHTML.value.length + editorCSS.value.length + editorJS.value.length;
  if (total > PERF_THRESHOLD) {
    perfIndicator.style.display = '';
    if (autoRunCb.checked) {
      autoRunCb.checked = false;
      addConsoleEntry('warn', 'Auto-run disabled: code exceeds ' + PERF_THRESHOLD + ' chars');
    }
  } else {
    perfIndicator.style.display = 'none';
  }
}

/* ═══════════════════════════════════════════
   Keyboard-navigable panels (Ctrl+Tab)
   ═══════════════════════════════════════════ */
var panelOrder = ['panel-html', 'panel-css', 'panel-js', 'panel-preview', 'panel-console'];
var focusedPanelIdx = 0;

/* ═══════════════════════════════════════════
   Snippet templates
   ═══════════════════════════════════════════ */
var TEMPLATES = {
  'Blank': { html: '', css: '', js: '' },
  'Flexbox': {
    html: '<div class="container">\n  <div class="item">1</div>\n  <div class="item">2</div>\n  <div class="item">3</div>\n  <div class="item">4</div>\n</div>',
    css: '.container {\n  display: flex;\n  gap: 16px;\n  padding: 20px;\n  min-height: 100vh;\n  background: #1a1a2e;\n  flex-wrap: wrap;\n  align-items: center;\n  justify-content: center;\n}\n\n.item {\n  width: 100px;\n  height: 100px;\n  background: #e94560;\n  color: #fff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 24px;\n  font-family: sans-serif;\n  border-radius: 8px;\n  transition: transform 0.2s;\n}\n\n.item:hover {\n  transform: scale(1.1);\n}',
    js: ''
  },
  'CSS Grid': {
    html: '<div class="grid">\n  <div class="cell header">Header</div>\n  <div class="cell sidebar">Sidebar</div>\n  <div class="cell main">Main</div>\n  <div class="cell footer">Footer</div>\n</div>',
    css: '.grid {\n  display: grid;\n  grid-template-columns: 200px 1fr;\n  grid-template-rows: auto 1fr auto;\n  grid-template-areas:\n    "header header"\n    "sidebar main"\n    "footer footer";\n  gap: 4px;\n  height: 100vh;\n  background: #1a1a2e;\n  font-family: sans-serif;\n}\n\n.cell {\n  padding: 20px;\n  color: #fff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.header  { grid-area: header; background: #e94560; }\n.sidebar { grid-area: sidebar; background: #0f3460; }\n.main    { grid-area: main; background: #16213e; }\n.footer  { grid-area: footer; background: #533483; }',
    js: ''
  },
  'Animation': {
    html: '<div class="scene">\n  <div class="ball"></div>\n</div>',
    css: '.scene {\n  height: 100vh;\n  display: flex;\n  align-items: flex-end;\n  justify-content: center;\n  background: linear-gradient(135deg, #0f3460, #1a1a2e);\n}\n\n.ball {\n  width: 60px;\n  height: 60px;\n  background: #e94560;\n  border-radius: 50%;\n  animation: bounce 0.6s ease-in-out infinite alternate;\n}\n\n@keyframes bounce {\n  from { transform: translateY(0); }\n  to   { transform: translateY(-300px); }\n}',
    js: ''
  },
  'Form': {
    html: '<form class="form">\n  <h2>Sign Up</h2>\n  <input type="text" placeholder="Username" required>\n  <input type="email" placeholder="Email" required>\n  <input type="password" placeholder="Password" required>\n  <button type="submit">Submit</button>\n</form>',
    css: 'body {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n  margin: 0;\n  background: #1a1a2e;\n  font-family: sans-serif;\n}\n\n.form {\n  background: #16213e;\n  padding: 32px;\n  border-radius: 12px;\n  width: 300px;\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n\n.form h2 {\n  color: #e94560;\n  margin-bottom: 8px;\n}\n\n.form input {\n  padding: 10px 14px;\n  border: 1px solid #45475a;\n  border-radius: 6px;\n  background: #1a1a2e;\n  color: #cdd6f4;\n  font-size: 14px;\n  outline: none;\n}\n\n.form input:focus {\n  border-color: #89b4fa;\n}\n\n.form button {\n  padding: 10px;\n  background: #e94560;\n  color: #fff;\n  border: none;\n  border-radius: 6px;\n  font-size: 14px;\n  cursor: pointer;\n}\n\n.form button:hover {\n  opacity: 0.9;\n}',
    js: 'document.querySelector(".form").addEventListener("submit", function(e) {\n  e.preventDefault();\n  console.log("Form submitted!");\n});'
  },
  'Canvas': {
    html: '<canvas id="c" width="600" height="400"></canvas>',
    css: 'body {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  margin: 0;\n  background: #1a1a2e;\n}\n\ncanvas {\n  border: 1px solid #45475a;\n  border-radius: 8px;\n}',
    js: 'var c = document.getElementById("c");\nvar ctx = c.getContext("2d");\nvar particles = [];\n\nfor (var i = 0; i < 50; i++) {\n  particles.push({\n    x: Math.random() * c.width,\n    y: Math.random() * c.height,\n    r: Math.random() * 4 + 1,\n    dx: (Math.random() - 0.5) * 2,\n    dy: (Math.random() - 0.5) * 2\n  });\n}\n\nfunction draw() {\n  ctx.fillStyle = "rgba(26, 26, 46, 0.2)";\n  ctx.fillRect(0, 0, c.width, c.height);\n  particles.forEach(function(p) {\n    p.x += p.dx;\n    p.y += p.dy;\n    if (p.x < 0 || p.x > c.width) p.dx *= -1;\n    if (p.y < 0 || p.y > c.height) p.dy *= -1;\n    ctx.beginPath();\n    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);\n    ctx.fillStyle = "#e94560";\n    ctx.fill();\n  });\n  requestAnimationFrame(draw);\n}\ndraw();'
  }
};

var templateSelect = document.getElementById('template-select');
templateSelect.addEventListener('change', function() {
  var name = templateSelect.value;
  if (!name) return;
  var t = TEMPLATES[name];
  if (!t) return;
  editorHTML.value = t.html;
  editorCSS.value = t.css;
  editorJS.value = t.js;
  extCSS = []; extJS = [];
  hlHTML.update(); hlCSS.update(); hlJS.update();
  history.replaceState(null, '', location.pathname);
  run();
  templateSelect.value = '';
});

/* ═══════════════════════════════════════════
   Override run() to support persistent console
   and error line highlighting
   ═══════════════════════════════════════════ */
run = function() {
  clearErrorLine();
  checkPerfMode();

  if (clearOnRunCb && clearOnRunCb.checked && consoleMessages.length > 0) {
    runCount++;
    var sep = document.createElement('div');
    sep.className = 'console-separator';
    sep.textContent = '--- Run #' + runCount + ' ---';
    consoleLog.appendChild(sep);
  } else {
    runCount++;
    consoleMessages = [];
    consoleLog.innerHTML = '';
    consoleBadge.style.display = 'none';
  }

  var html = editorHTML.value;
  var css  = editorCSS.value;
  var js   = editorJS.value;

  var extCssLinks = extCSS.map(function(url) {
    return '<link rel="stylesheet" href="' + url.replace(/"/g, '&quot;') + '">';
  }).join('\n');
  var extJsTags = extJS.map(function(url) {
    return '<script src="' + url.replace(/"/g, '&quot;') + '"><\/script>';
  }).join('\n');

  var doc = [
    '<!DOCTYPE html>',
    '<html><head><meta charset="UTF-8">',
    extCssLinks,
    '<style>' + css + '<\/style>',
    '<\/head><body>',
    html,
    extJsTags,
    '<script>',
    '(function() {',
    '  var methods = ["log", "warn", "error", "info"];',
    '  methods.forEach(function(m) {',
    '    var orig = console[m];',
    '    console[m] = function() {',
    '      var args = Array.prototype.slice.call(arguments);',
    '      var processed = args.map(function(a) {',
    '        if (typeof a === "object" && a !== null) {',
    '          try { return { __type: "object", __val: JSON.parse(JSON.stringify(a)) }; }',
    '          catch(e) { return { __type: "string", __val: String(a) }; }',
    '        }',
    '        return { __type: typeof a, __val: a };',
    '      });',
    '      window.parent.postMessage({ type: "iframe-console", method: m, args: processed }, "*");',
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
};

/* Message handler with structured console args */
window.addEventListener('message', function(e) {
  if (!e.data) return;
  if (e.source !== preview.contentWindow) return;

  if (e.data.type === 'iframe-console') {
    consoleMessages.push({ method: e.data.method, args: e.data.args });

    var entry = document.createElement('div');
    entry.className = 'console-entry console-level-' + e.data.method;

    if (e.data.args) {
      e.data.args.forEach(function(a, i) {
        if (i > 0) entry.appendChild(document.createTextNode(' '));
        if (a.__type === 'object') {
          entry.appendChild(renderValue(a.__val));
        } else {
          entry.appendChild(document.createTextNode(String(a.__val)));
        }
      });
    } else if (e.data.text) {
      entry.textContent = e.data.text;
    }

    consoleLog.appendChild(entry);
    consoleLog.scrollTop = consoleLog.scrollHeight;
    consoleBadge.textContent = consoleMessages.length;
    consoleBadge.style.display = 'inline';
    return;
  }

  if (e.data.type === 'iframe-error') {
    var msg = e.data.message + (e.data.line ? ' (line ' + e.data.line + ')' : '');
    addConsoleEntry('error', msg);
    if (e.data.line) highlightErrorLine(e.data.line);
  }
});

/* ═══════════════════════════════════════════
   Extended keyboard shortcuts
   ═══════════════════════════════════════════ */
document.addEventListener('keydown', function(e) {
  var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  var mod = isMac ? e.metaKey : e.ctrlKey;

  /* Find: Ctrl+F */
  if (mod && !e.shiftKey && e.key === 'f') {
    e.preventDefault();
    openFindBar(false);
    return;
  }
  /* Replace: Ctrl+H */
  if (mod && e.key === 'h') {
    e.preventDefault();
    openFindBar(true);
    return;
  }
  /* Panel cycling: Ctrl+Tab / Ctrl+Shift+Tab */
  if (e.ctrlKey && e.key === 'Tab') {
    e.preventDefault();
    var visible = panelOrder.filter(function(id) {
      return panels[id] && panels[id].el.style.display !== 'none';
    });
    if (visible.length === 0) return;
    var curIdx = visible.indexOf(panelOrder[focusedPanelIdx]);
    if (curIdx < 0) curIdx = 0;
    if (e.shiftKey) {
      curIdx = (curIdx - 1 + visible.length) % visible.length;
    } else {
      curIdx = (curIdx + 1) % visible.length;
    }
    var nextId = visible[curIdx];
    focusedPanelIdx = panelOrder.indexOf(nextId);
    focusPanel(nextId);
    var ed = panels[nextId].el.querySelector('textarea');
    if (ed) ed.focus();
    return;
  }
});

run();
