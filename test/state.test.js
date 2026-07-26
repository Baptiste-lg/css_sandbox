describe('encodeState / decodeState', () => {
  describe('round-trip', () => {
    it('encodes and decodes basic state', () => {
      const result = decodeState(encodeState('h', 'c', 'j'));
      expect(result).toEqual({ html: 'h', css: 'c', js: 'j' });
    });

    it('handles empty strings', () => {
      const result = decodeState(encodeState('', '', ''));
      expect(result).toEqual({ html: '', css: '', js: '' });
    });

    it('handles complex HTML/CSS/JS content', () => {
      const html = '<div class="test">Hello & "world"</div>';
      const css = 'body { color: red; font-size: 16px; }';
      const js = 'var x = function() { return 42; };';
      const result = decodeState(encodeState(html, css, js));
      expect(result.html).toBe(html);
      expect(result.css).toBe(css);
      expect(result.js).toBe(js);
    });

    it('includes extCss/extJs when globals are set', () => {
      const origCSS = window.extCSS;
      const origJS = window.extJS;
      window.extCSS = ['https://cdn.example.com/style.css'];
      window.extJS = ['https://cdn.example.com/script.js'];

      const encoded = encodeState('h', 'c', 'j');
      const result = decodeState(encoded);
      expect(result.extCss).toEqual(['https://cdn.example.com/style.css']);
      expect(result.extJs).toEqual(['https://cdn.example.com/script.js']);

      window.extCSS = origCSS;
      window.extJS = origJS;
    });
  });

  describe('decodeState edge cases', () => {
    it('returns null for empty string', () => {
      expect(decodeState('')).toBeNull();
    });

    it('strips leading # from hash', () => {
      const encoded = encodeState('a', 'b', 'c');
      expect(decodeState('#' + encoded)).toEqual({ html: 'a', css: 'b', js: 'c' });
    });

    it('returns null for corrupted data', () => {
      expect(decodeState('not-valid-data-!!!!')).toBeNull();
    });

    it('returns null for object missing required fields', () => {
      const bad = LZString.compressToEncodedURIComponent(JSON.stringify({ html: 'x' }));
      expect(decodeState(bad)).toBeNull();
    });

    it('handles legacy base64 format', () => {
      const state = { html: 'h', css: 'c', js: 'j' };
      const legacy = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
      expect(decodeState(legacy)).toEqual(state);
    });
  });
});

describe('parseLines', () => {
  it('parses valid HTTPS URLs', () => {
    const result = parseLines('https://cdn.example.com/foo.js\nhttps://cdn.example.com/bar.js');
    expect(result).toEqual(['https://cdn.example.com/foo.js', 'https://cdn.example.com/bar.js']);
  });

  it('accepts HTTP URLs', () => {
    const result = parseLines('http://example.com/style.css');
    expect(result).toEqual(['http://example.com/style.css']);
  });

  it('accepts protocol-relative URLs', () => {
    const result = parseLines('//cdn.example.com/foo.js');
    expect(result).toEqual(['//cdn.example.com/foo.js']);
  });

  it('filters out empty lines', () => {
    const result = parseLines('https://a.com/a.js\n\n\nhttps://b.com/b.js');
    expect(result).toEqual(['https://a.com/a.js', 'https://b.com/b.js']);
  });

  it('filters out whitespace-only lines', () => {
    const result = parseLines('  \nhttps://a.com/a.js\n   ');
    expect(result).toEqual(['https://a.com/a.js']);
  });

  it('trims whitespace from URLs', () => {
    const result = parseLines('  https://a.com/a.js  ');
    expect(result).toEqual(['https://a.com/a.js']);
  });

  it('rejects invalid URLs (no protocol)', () => {
    const result = parseLines('not-a-url');
    expect(result).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseLines('')).toEqual([]);
  });

  it('filters mixed valid and invalid', () => {
    const result = parseLines('https://a.com/a.js\ninvalid\nhttps://b.com/b.js');
    expect(result).toEqual(['https://a.com/a.js', 'https://b.com/b.js']);
  });
});
