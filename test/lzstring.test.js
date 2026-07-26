describe('LZString', () => {
  const compress = LZString.compressToEncodedURIComponent;
  const decompress = LZString.decompressFromEncodedURIComponent;

  describe('round-trip identity', () => {
    it('handles empty string', () => {
      expect(decompress(compress(''))).toBe('');
    });

    it('handles short ASCII string', () => {
      const str = 'hello world';
      expect(decompress(compress(str))).toBe(str);
    });

    it('handles long string (1000+ chars)', () => {
      const str = 'a'.repeat(2000);
      expect(decompress(compress(str))).toBe(str);
    });

    it('handles unicode content (emoji, CJK)', () => {
      const str = 'Hello \u4e16\u754c \ud83d\ude80\ud83c\udf1f';
      expect(decompress(compress(str))).toBe(str);
    });

    it('handles special URI characters', () => {
      const str = 'key=value&foo=bar?baz#hash%20encoded';
      expect(decompress(compress(str))).toBe(str);
    });

    it('handles JSON stringified object', () => {
      const obj = { html: '<div>', css: 'body { color: red; }', js: 'alert(1)' };
      const str = JSON.stringify(obj);
      expect(decompress(compress(str))).toBe(str);
    });

    it('handles multiline content', () => {
      const str = 'line1\nline2\ttabbed\nline3';
      expect(decompress(compress(str))).toBe(str);
    });

    it('handles large payload (50KB+)', () => {
      const str = 'x'.repeat(60000);
      expect(decompress(compress(str))).toBe(str);
    });
  });

  describe('edge cases', () => {
    it('compress(null) returns empty string', () => {
      expect(compress(null)).toBe('');
    });

    it('decompress("") returns null', () => {
      expect(decompress('')).toBe(null);
    });

    it('decompress(null) returns empty string', () => {
      expect(decompress(null)).toBe('');
    });
  });

  describe('URI safety', () => {
    it('compressed output contains only URI-safe characters', () => {
      const input = 'The quick brown fox jumps over the lazy dog 1234567890!@#$%^&*()';
      const compressed = compress(input);
      expect(compressed).toMatch(/^[A-Za-z0-9+\-$]*$/);
    });
  });

  describe('idempotence', () => {
    it('compressing the same input twice yields the same output', () => {
      const input = 'deterministic compression test';
      expect(compress(input)).toBe(compress(input));
    });
  });
});
