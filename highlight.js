/* ═══════════════════════════════════════════
   Lightweight syntax highlighter

   Uses the "transparent textarea over
   highlighted pre" technique. Each editor
   wrapper contains:
     .editor-wrap
       .line-numbers
       .highlight-layer  (pre > code, readonly display)
       textarea           (transparent, receives input)

   Supports HTML, CSS, and JS tokenization
   with regex-based rules.
   ═══════════════════════════════════════════ */

var Highlight = (function () {
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function wrap(cls, text) {
    return '<span class="hl-' + cls + '">' + text + '</span>';
  }

  /* ── HTML highlighting ── */
  function highlightHTML(src) {
    var safe = escapeHtml(src);
    safe = safe.replace(/(&lt;!--[\s\S]*?--&gt;)/g, function (m) {
      return wrap('comment', m);
    });
    safe = safe.replace(/(&lt;\/?)([\w-]+)/g, function (m, bracket, tag) {
      return wrap('tag', bracket + wrap('tagname', tag));
    });
    safe = safe.replace(
      /(\s)([\w-]+)(=)(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|[\w-]+)/g,
      function (m, sp, attr, eq, val) {
        return sp + wrap('attr', attr) + eq + wrap('string', val);
      }
    );
    safe = safe.replace(/(\s)([\w-]+)(?=\s|&gt;|\/&gt;)/g, function (m, sp, attr) {
      if (
        /^(disabled|checked|readonly|required|autofocus|autoplay|controls|loop|muted|hidden|novalidate|multiple|selected|defer|async|open)$/.test(
          attr
        )
      ) {
        return sp + wrap('attr', attr);
      }
      return m;
    });
    safe = safe.replace(/(&gt;)/g, wrap('tag', '$1'));
    return safe;
  }

  /* ── CSS highlighting ── */
  function highlightCSS(src) {
    var safe = escapeHtml(src);
    safe = safe.replace(/(\/\*[\s\S]*?\*\/)/g, function (m) {
      return wrap('comment', m);
    });
    safe = safe.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, function (m) {
      return wrap('string', m);
    });
    safe = safe.replace(/(#[0-9a-fA-F]{3,8})\b/g, function (m) {
      return wrap('color', m);
    });
    safe = safe.replace(
      /\b(\d+\.?\d*)(px|em|rem|%|vh|vw|s|ms|deg|fr|ch)?\b/g,
      function (m, num, unit) {
        return wrap('number', num) + (unit ? wrap('unit', unit) : '');
      }
    );
    safe = safe.replace(/([{};:])/g, function (m) {
      return wrap('punct', m);
    });
    safe = safe.replace(/([\w-]+)\s*(?=:)/g, function (m, prop) {
      return wrap('property', prop);
    });
    safe = safe.replace(/(@[\w-]+)/g, function (m) {
      return wrap('keyword', m);
    });
    safe = safe.replace(
      /((?:^|\n|[};])\s*)((?:[.#:\w*>+~,\s\-\[\]=&quot;'|^$])+?)(\s*\{)/gm,
      function (m, before, sel, brace) {
        return before + wrap('selector', sel) + brace;
      }
    );
    return safe;
  }

  /* ── JS highlighting ── */
  var JS_KEYWORDS =
    /\b(var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|new|this|typeof|instanceof|in|of|try|catch|finally|throw|class|extends|super|import|export|default|from|async|await|yield|null|undefined|true|false|void|delete)\b/g;

  function highlightJS(src) {
    var safe = escapeHtml(src);
    safe = safe.replace(/(\/\/.*$)/gm, function (m) {
      return wrap('comment', m);
    });
    safe = safe.replace(/(\/\*[\s\S]*?\*\/)/g, function (m) {
      return wrap('comment', m);
    });
    safe = safe.replace(/(`(?:[^`\\]|\\.|\$\{[^}]*\})*`)/g, function (m) {
      return wrap('string', m);
    });
    safe = safe.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, function (m) {
      return wrap('string', m);
    });
    safe = safe.replace(
      /((?:^|[=(:,;!&|?~^+\-*/%<>{}[\]\n])\s*)(\/(?:[^/\\*\n]|\\.)[^/\\\n]*\/[gimsuy]*)/gm,
      function (m, before, rx) {
        return before + wrap('regex', rx);
      }
    );
    safe = safe.replace(/\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, function (m) {
      return wrap('number', m);
    });
    safe = safe.replace(JS_KEYWORDS, function (m) {
      return wrap('keyword', m);
    });
    safe = safe.replace(
      /\b(document|window|console|Math|JSON|Array|Object|String|Number|Boolean|Promise|Set|Map)\b/g,
      function (m) {
        return wrap('builtin', m);
      }
    );
    safe = safe.replace(/(\.)([\w$]+)\s*(?=\()/g, function (m, dot, fn) {
      return dot + wrap('function', fn);
    });
    return safe;
  }

  /* ── Public API ── */
  var highlighters = {
    html: highlightHTML,
    css: highlightCSS,
    js: highlightJS,
  };

  function createEditor(textarea, lang) {
    var parent = textarea.parentElement;
    parent.classList.add('editor-wrap');

    var gutter = document.createElement('div');
    gutter.className = 'line-numbers';

    var pre = document.createElement('pre');
    pre.className = 'highlight-layer';
    var code = document.createElement('code');
    pre.appendChild(code);

    parent.insertBefore(gutter, textarea);
    parent.insertBefore(pre, textarea);

    var highlightFn = highlighters[lang] || escapeHtml;

    /* Minimap: scaled-down view of the code on the right edge */
    var minimap = document.createElement('canvas');
    minimap.className = 'editor-minimap';
    parent.appendChild(minimap);
    var mmCtx = minimap.getContext('2d');
    var MINIMAP_CHAR_W = 1.2;
    var MINIMAP_LINE_H = 3;
    var MINIMAP_W = 60;

    function renderMinimap() {
      var val = textarea.value;
      var lines = val.split('\n');
      var dpr = window.devicePixelRatio || 1;
      minimap.width = MINIMAP_W * dpr;
      minimap.height = Math.max(lines.length * MINIMAP_LINE_H, parent.offsetHeight) * dpr;
      minimap.style.width = MINIMAP_W + 'px';
      minimap.style.height = Math.max(lines.length * MINIMAP_LINE_H, parent.offsetHeight) + 'px';
      mmCtx.scale(dpr, dpr);
      mmCtx.clearRect(0, 0, MINIMAP_W, minimap.height / dpr);

      /* Draw viewport indicator */
      var lineH = parseFloat(getComputedStyle(textarea).lineHeight) || 19.5;
      var totalH = lines.length * lineH;
      var visibleRatio = textarea.clientHeight / (totalH || 1);
      var scrollRatio = textarea.scrollTop / (totalH || 1);
      var viewH = Math.min(minimap.height / dpr, visibleRatio * lines.length * MINIMAP_LINE_H);
      var viewY = scrollRatio * lines.length * MINIMAP_LINE_H;
      mmCtx.fillStyle = 'rgba(137, 180, 250, 0.1)';
      mmCtx.fillRect(0, viewY, MINIMAP_W, Math.max(viewH, 10));

      /* Draw code lines as colored blocks */
      mmCtx.globalAlpha = 0.5;
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var y = i * MINIMAP_LINE_H;
        for (var j = 0; j < Math.min(line.length, Math.floor(MINIMAP_W / MINIMAP_CHAR_W)); j++) {
          var ch = line.charAt(j);
          if (ch === ' ' || ch === '\t') continue;
          mmCtx.fillStyle = 'var(--text-dim)';
          mmCtx.fillStyle = '#6c7086';
          mmCtx.fillRect(j * MINIMAP_CHAR_W, y, MINIMAP_CHAR_W, MINIMAP_LINE_H - 1);
        }
      }
      mmCtx.globalAlpha = 1;
    }

    minimap.addEventListener('click', function (e) {
      var rect = minimap.getBoundingClientRect();
      var y = e.clientY - rect.top;
      var lineH = parseFloat(getComputedStyle(textarea).lineHeight) || 19.5;
      var targetLine = Math.floor(y / MINIMAP_LINE_H);
      textarea.scrollTop = targetLine * lineH - textarea.clientHeight / 2;
      pre.scrollTop = textarea.scrollTop;
      gutter.scrollTop = textarea.scrollTop;
    });

    var mmDragging = false;
    minimap.addEventListener('mousedown', function (e) {
      mmDragging = true;
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!mmDragging) return;
      var rect = minimap.getBoundingClientRect();
      var y = e.clientY - rect.top;
      var lineH = parseFloat(getComputedStyle(textarea).lineHeight) || 19.5;
      var targetLine = Math.floor(y / MINIMAP_LINE_H);
      textarea.scrollTop = targetLine * lineH - textarea.clientHeight / 2;
      pre.scrollTop = textarea.scrollTop;
      gutter.scrollTop = textarea.scrollTop;
    });
    document.addEventListener('mouseup', function () {
      mmDragging = false;
    });

    function update() {
      var val = textarea.value;
      code.innerHTML = highlightFn(val) + '\n';

      var lines = val.split('\n');
      var nums = '';
      for (var i = 1; i <= lines.length; i++) {
        nums += i + '\n';
      }
      gutter.textContent = nums;

      pre.scrollTop = textarea.scrollTop;
      pre.scrollLeft = textarea.scrollLeft;
      gutter.scrollTop = textarea.scrollTop;

      if (lines.length > 20) {
        minimap.style.display = '';
        renderMinimap();
      } else {
        minimap.style.display = 'none';
      }
    }

    textarea.addEventListener('input', update);
    textarea.addEventListener('scroll', function () {
      pre.scrollTop = textarea.scrollTop;
      pre.scrollLeft = textarea.scrollLeft;
      gutter.scrollTop = textarea.scrollTop;
      if (minimap.style.display !== 'none') renderMinimap();
    });

    update();
    return { update: update };
  }

  return { createEditor: createEditor };
})();
