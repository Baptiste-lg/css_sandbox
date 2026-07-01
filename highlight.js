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

var Highlight = (function() {

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function wrap(cls, text) {
    return '<span class="hl-' + cls + '">' + text + '</span>';
  }

  /* ── HTML highlighting ── */
  function highlightHTML(src) {
    var safe = escapeHtml(src);
    safe = safe.replace(/(&lt;!--[\s\S]*?--&gt;)/g, function(m) { return wrap('comment', m); });
    safe = safe.replace(/(&lt;\/?)([\w-]+)/g, function(m, bracket, tag) {
      return wrap('tag', bracket + wrap('tagname', tag));
    });
    safe = safe.replace(/(\s)([\w-]+)(=)(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|[\w-]+)/g, function(m, sp, attr, eq, val) {
      return sp + wrap('attr', attr) + eq + wrap('string', val);
    });
    safe = safe.replace(/(\s)([\w-]+)(?=\s|&gt;|\/&gt;)/g, function(m, sp, attr) {
      if (/^(disabled|checked|readonly|required|autofocus|autoplay|controls|loop|muted|hidden|novalidate|multiple|selected|defer|async|open)$/.test(attr)) {
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
    safe = safe.replace(/(\/\*[\s\S]*?\*\/)/g, function(m) { return wrap('comment', m); });
    safe = safe.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, function(m) { return wrap('string', m); });
    safe = safe.replace(/(#[0-9a-fA-F]{3,8})\b/g, function(m) { return wrap('color', m); });
    safe = safe.replace(/\b(\d+\.?\d*)(px|em|rem|%|vh|vw|s|ms|deg|fr|ch)?\b/g, function(m, num, unit) {
      return wrap('number', num) + (unit ? wrap('unit', unit) : '');
    });
    safe = safe.replace(/([{};:])/g, function(m) { return wrap('punct', m); });
    safe = safe.replace(/([\w-]+)\s*(?=:)/g, function(m, prop) { return wrap('property', prop); });
    safe = safe.replace(/(@[\w-]+)/g, function(m) { return wrap('keyword', m); });
    safe = safe.replace(/((?:^|\n|[};])\s*)((?:[.#:\w*>+~,\s\-\[\]=&quot;'|^$])+?)(\s*\{)/gm, function(m, before, sel, brace) {
      return before + wrap('selector', sel) + brace;
    });
    return safe;
  }

  /* ── JS highlighting ── */
  var JS_KEYWORDS = /\b(var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|new|this|typeof|instanceof|in|of|try|catch|finally|throw|class|extends|super|import|export|default|from|async|await|yield|null|undefined|true|false|void|delete)\b/g;

  function highlightJS(src) {
    var safe = escapeHtml(src);
    safe = safe.replace(/(\/\/.*$)/gm, function(m) { return wrap('comment', m); });
    safe = safe.replace(/(\/\*[\s\S]*?\*\/)/g, function(m) { return wrap('comment', m); });
    safe = safe.replace(/(`(?:[^`\\]|\\.|\$\{[^}]*\})*`)/g, function(m) { return wrap('string', m); });
    safe = safe.replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, function(m) { return wrap('string', m); });
    safe = safe.replace(/((?:^|[=(:,;!&|?~^+\-*/%<>{}[\]\n])\s*)(\/(?:[^/\\*\n]|\\.)[^/\\\n]*\/[gimsuy]*)/gm, function(m, before, rx) { return before + wrap('regex', rx); });
    safe = safe.replace(/\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, function(m) { return wrap('number', m); });
    safe = safe.replace(JS_KEYWORDS, function(m) { return wrap('keyword', m); });
    safe = safe.replace(/\b(document|window|console|Math|JSON|Array|Object|String|Number|Boolean|Promise|Set|Map)\b/g, function(m) { return wrap('builtin', m); });
    safe = safe.replace(/(\.)([\w$]+)\s*(?=\()/g, function(m, dot, fn) { return dot + wrap('function', fn); });
    return safe;
  }

  /* ── Public API ── */
  var highlighters = {
    html: highlightHTML,
    css:  highlightCSS,
    js:   highlightJS
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
    }

    textarea.addEventListener('input', update);
    textarea.addEventListener('scroll', function() {
      pre.scrollTop = textarea.scrollTop;
      pre.scrollLeft = textarea.scrollLeft;
      gutter.scrollTop = textarea.scrollTop;
    });

    update();
    return { update: update };
  }

  return { createEditor: createEditor };
})();
