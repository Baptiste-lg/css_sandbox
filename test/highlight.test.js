describe('Highlight', () => {
  const { escapeHtml, wrap, highlightHTML, highlightCSS, highlightJS } = Highlight;

  describe('escapeHtml', () => {
    it('escapes ampersand', () => {
      expect(escapeHtml('a&b')).toBe('a&amp;b');
    });

    it('escapes less-than', () => {
      expect(escapeHtml('a<b')).toBe('a&lt;b');
    });

    it('escapes greater-than', () => {
      expect(escapeHtml('a>b')).toBe('a&gt;b');
    });

    it('escapes combined special chars', () => {
      expect(escapeHtml('<div class="a&b">')).toBe('&lt;div class="a&amp;b"&gt;');
    });

    it('returns empty string unchanged', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('returns string with no special chars unchanged', () => {
      expect(escapeHtml('hello world')).toBe('hello world');
    });

    it('double-escapes already-escaped input', () => {
      expect(escapeHtml('&amp;')).toBe('&amp;amp;');
    });
  });

  describe('wrap', () => {
    it('wraps text in span with hl- prefix', () => {
      expect(wrap('keyword', 'var')).toBe('<span class="hl-keyword">var</span>');
    });

    it('handles empty text', () => {
      expect(wrap('tag', '')).toBe('<span class="hl-tag"></span>');
    });

    it('handles text with HTML characters (not escaped by wrap)', () => {
      expect(wrap('string', '"hello"')).toBe('<span class="hl-string">"hello"</span>');
    });
  });

  describe('highlightHTML', () => {
    it('highlights a simple tag', () => {
      const result = highlightHTML('<div>');
      expect(result).toContain('hl-tag');
      expect(result).toContain('hl-tagname');
    });

    it('highlights tag with attributes', () => {
      const result = highlightHTML('<a href="url">');
      expect(result).toContain('hl-attr');
      expect(result).toContain('hl-string');
    });

    it('highlights HTML comments', () => {
      const result = highlightHTML('<!-- comment -->');
      expect(result).toContain('hl-comment');
    });

    it('highlights boolean attributes', () => {
      const result = highlightHTML('<input disabled>');
      expect(result).toContain('hl-attr');
    });

    it('handles empty input', () => {
      expect(highlightHTML('')).toBe('');
    });

    it('handles plain text (no tags)', () => {
      const result = highlightHTML('just text');
      expect(result).toBe('just text');
    });

    it('highlights closing tags', () => {
      const result = highlightHTML('</div>');
      expect(result).toContain('hl-tag');
      expect(result).toContain('hl-tagname');
    });

    it('highlights self-closing tags', () => {
      const result = highlightHTML('<br />');
      expect(result).toContain('hl-tagname');
    });
  });

  describe('highlightCSS', () => {
    it('highlights property names', () => {
      const result = highlightCSS('color: red;');
      expect(result).toContain('hl-property');
    });

    it('highlights hex colors', () => {
      const result = highlightCSS('#fff');
      expect(result).toContain('hl-color');
    });

    it('highlights numbers with units', () => {
      const result = highlightCSS('16px');
      expect(result).toContain('hl-number');
      expect(result).toContain('hl-unit');
    });

    it('highlights comments', () => {
      const result = highlightCSS('/* comment */');
      expect(result).toContain('hl-comment');
    });

    it('highlights strings', () => {
      const result = highlightCSS('"Helvetica"');
      expect(result).toContain('hl-string');
    });

    it('highlights at-rules', () => {
      const result = highlightCSS('@media');
      expect(result).toContain('hl-keyword');
    });

    it('highlights punctuation', () => {
      const result = highlightCSS('{ ; }');
      expect(result).toContain('hl-punct');
    });

    it('handles empty input', () => {
      expect(highlightCSS('')).toBe('');
    });

    it('highlights numbers without units', () => {
      const result = highlightCSS('opacity: 0.5;');
      expect(result).toContain('hl-number');
    });
  });

  describe('highlightJS', () => {
    it('highlights keywords', () => {
      const keywords = ['var', 'function', 'return', 'if', 'const', 'let', 'class', 'null', 'true', 'false'];
      keywords.forEach((kw) => {
        const result = highlightJS(kw);
        expect(result).toContain('hl-keyword');
      });
    });

    it('highlights single-line comments', () => {
      const result = highlightJS('// comment');
      expect(result).toContain('hl-comment');
    });

    it('highlights multi-line comments', () => {
      const result = highlightJS('/* comment */');
      expect(result).toContain('hl-comment');
    });

    it('highlights double-quoted strings', () => {
      const result = highlightJS('"hello"');
      expect(result).toContain('hl-string');
    });

    it('highlights single-quoted strings', () => {
      const result = highlightJS("'world'");
      expect(result).toContain('hl-string');
    });

    it('highlights template literals', () => {
      const result = highlightJS('`template`');
      expect(result).toContain('hl-string');
    });

    it('highlights numbers', () => {
      const result = highlightJS('42');
      expect(result).toContain('hl-number');
    });

    it('highlights floating point numbers', () => {
      const result = highlightJS('3.14');
      expect(result).toContain('hl-number');
    });

    it('highlights built-ins', () => {
      const builtins = ['document', 'window', 'console', 'Math', 'JSON'];
      builtins.forEach((b) => {
        const result = highlightJS(b);
        expect(result).toContain('hl-builtin');
      });
    });

    it('highlights method calls', () => {
      const result = highlightJS('.forEach(');
      expect(result).toContain('hl-function');
    });

    it('handles empty input', () => {
      expect(highlightJS('')).toBe('');
    });

    it('highlights regex literals', () => {
      const result = highlightJS('= /pattern/g');
      expect(result).toContain('hl-regex');
    });
  });
});
