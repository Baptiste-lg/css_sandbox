describe('getGroupHost', () => {
  beforeEach(() => {
    // Clear groups
    Object.keys(groups).forEach((k) => delete groups[k]);
  });

  it('returns panelId itself when not in any group', () => {
    expect(getGroupHost('panel-html')).toBe('panel-html');
  });

  it('returns the host ID when panel is a guest', () => {
    groups['panel-html'] = ['panel-html', 'panel-css'];
    expect(getGroupHost('panel-css')).toBe('panel-html');
  });

  it('returns own ID when panel is the host', () => {
    groups['panel-html'] = ['panel-html', 'panel-css'];
    expect(getGroupHost('panel-html')).toBe('panel-html');
  });

  it('finds correct host with multiple groups', () => {
    groups['panel-html'] = ['panel-html', 'panel-css'];
    groups['panel-preview'] = ['panel-preview', 'panel-console'];
    expect(getGroupHost('panel-console')).toBe('panel-preview');
    expect(getGroupHost('panel-css')).toBe('panel-html');
  });
});

describe('getPanelTitle', () => {
  it('returns "HTML" for panel-html', () => {
    expect(getPanelTitle('panel-html')).toBe('HTML');
  });

  it('returns "CSS" for panel-css', () => {
    expect(getPanelTitle('panel-css')).toBe('CSS');
  });

  it('returns "JS" for panel-js', () => {
    expect(getPanelTitle('panel-js')).toBe('JS');
  });

  it('returns "Preview" for panel-preview', () => {
    expect(getPanelTitle('panel-preview')).toBe('Preview');
  });

  it('returns "Console" for panel-console', () => {
    expect(getPanelTitle('panel-console')).toBe('Console');
  });

  it('returns the ID itself for unknown panel', () => {
    expect(getPanelTitle('panel-unknown')).toBe('panel-unknown');
  });
});
