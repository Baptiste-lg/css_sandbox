describe('Layout presets', () => {
  const W = 1200;
  const H = 800;

  beforeEach(() => {
    Object.defineProperty(workspace, 'offsetWidth', { value: W, configurable: true });
    Object.defineProperty(workspace, 'offsetHeight', { value: H, configurable: true });
  });

  describe('layoutTopBottom', () => {
    it('returns all 5 panels', () => {
      const layout = layoutTopBottom();
      expect(Object.keys(layout)).toHaveLength(5);
      expect(layout['panel-html']).toBeDefined();
      expect(layout['panel-css']).toBeDefined();
      expect(layout['panel-js']).toBeDefined();
      expect(layout['panel-preview']).toBeDefined();
      expect(layout['panel-console']).toBeDefined();
    });

    it('editors occupy top row with equal width', () => {
      const layout = layoutTopBottom();
      const edW = Math.floor(W / 3);
      expect(layout['panel-html'].w).toBe(edW);
      expect(layout['panel-css'].w).toBe(edW);
      expect(layout['panel-html'].y).toBe(0);
      expect(layout['panel-css'].y).toBe(0);
      expect(layout['panel-js'].y).toBe(0);
    });

    it('editors and preview/console have no gaps', () => {
      const layout = layoutTopBottom();
      // JS panel extends to full width
      const edW = Math.floor(W / 3);
      expect(layout['panel-js'].x).toBe(edW * 2);
      expect(layout['panel-js'].w).toBe(W - edW * 2);
    });

    it('preview and console in bottom row', () => {
      const layout = layoutTopBottom();
      const edH = Math.floor(H * 0.45);
      expect(layout['panel-preview'].y).toBe(edH + 4);
      expect(layout['panel-console'].y).toBe(edH + 4);
    });

    it('preview gets 60% width, console gets the rest', () => {
      const layout = layoutTopBottom();
      const pvW = Math.floor(W * 0.6);
      expect(layout['panel-preview'].w).toBe(pvW);
      expect(layout['panel-console'].w).toBe(W - pvW - 4);
    });
  });

  describe('layoutLeftRight', () => {
    it('editors stacked vertically on left at 30% width', () => {
      const layout = layoutLeftRight();
      const edW = Math.floor(W * 0.3);
      expect(layout['panel-html'].w).toBe(edW);
      expect(layout['panel-css'].w).toBe(edW);
      expect(layout['panel-js'].w).toBe(edW);
      expect(layout['panel-html'].x).toBe(0);
    });

    it('editors have equal height (third of workspace)', () => {
      const layout = layoutLeftRight();
      const edH = Math.floor(H / 3);
      expect(layout['panel-html'].h).toBe(edH);
      expect(layout['panel-css'].h).toBe(edH);
      // JS panel fills remaining height
      expect(layout['panel-js'].h).toBe(H - edH * 2);
    });

    it('preview and console on right side', () => {
      const layout = layoutLeftRight();
      const edW = Math.floor(W * 0.3);
      expect(layout['panel-preview'].x).toBe(edW + 4);
      expect(layout['panel-console'].x).toBe(edW + 4);
    });
  });

  describe('layoutTabs', () => {
    it('all editors share the same position (stacked)', () => {
      const layout = layoutTabs();
      expect(layout['panel-html'].x).toBe(layout['panel-css'].x);
      expect(layout['panel-html'].y).toBe(layout['panel-css'].y);
      expect(layout['panel-html'].w).toBe(layout['panel-css'].w);
      expect(layout['panel-html'].h).toBe(layout['panel-css'].h);
      expect(layout['panel-css'].x).toBe(layout['panel-js'].x);
    });

    it('accounts for 32px tab bar height', () => {
      const layout = layoutTabs();
      expect(layout['panel-html'].y).toBe(32);
    });

    it('editors take full width', () => {
      const layout = layoutTabs();
      expect(layout['panel-html'].w).toBe(W);
    });

    it('preview and console share same position below editors', () => {
      const layout = layoutTabs();
      expect(layout['panel-preview'].x).toBe(layout['panel-console'].x);
      expect(layout['panel-preview'].y).toBe(layout['panel-console'].y);
    });
  });

  describe('getPresetLayout', () => {
    it('returns layoutLeftRight for "left-right"', () => {
      expect(getPresetLayout('left-right')).toEqual(layoutLeftRight());
    });

    it('returns layoutTabs for "tabs"', () => {
      expect(getPresetLayout('tabs')).toEqual(layoutTabs());
    });

    it('returns layoutTopBottom for "top-bottom"', () => {
      expect(getPresetLayout('top-bottom')).toEqual(layoutTopBottom());
    });

    it('returns layoutTopBottom for unknown mode', () => {
      expect(getPresetLayout('unknown')).toEqual(layoutTopBottom());
    });
  });
});
