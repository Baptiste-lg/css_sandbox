describe('Snippets', () => {
  beforeEach(() => {
    localStorage.removeItem('css-sandbox-snippets');
  });

  describe('getSnippets', () => {
    it('returns empty array when no stored data', () => {
      expect(getSnippets()).toEqual([]);
    });

    it('returns parsed array from localStorage', () => {
      const snippets = [{ name: 'test', html: 'h', css: 'c', js: 'j', timestamp: 123 }];
      localStorage.setItem('css-sandbox-snippets', JSON.stringify(snippets));
      expect(getSnippets()).toEqual(snippets);
    });

    it('returns empty array for corrupt JSON', () => {
      localStorage.setItem('css-sandbox-snippets', 'not-json{{{');
      expect(getSnippets()).toEqual([]);
    });
  });

  describe('saveSnippets', () => {
    it('saves array to localStorage', () => {
      const snippets = [{ name: 'x' }];
      saveSnippets(snippets);
      expect(JSON.parse(localStorage.getItem('css-sandbox-snippets'))).toEqual(snippets);
    });

    it('round-trips with getSnippets', () => {
      const snippets = [{ name: 'a' }, { name: 'b' }];
      saveSnippets(snippets);
      expect(getSnippets()).toEqual(snippets);
    });

    it('saves empty array', () => {
      saveSnippets([]);
      expect(getSnippets()).toEqual([]);
    });
  });
});
