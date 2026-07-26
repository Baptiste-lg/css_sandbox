describe('formatHTML', () => {
  it('indents nested tags', () => {
    const result = formatHTML('<div><p>text</p></div>');
    const lines = result.split('\n');
    expect(lines[0]).toBe('<div>');
    expect(lines[1]).toMatch(/^\s+<p>text<\/p>/);
    expect(lines[2]).toBe('</div>');
  });

  it('does not indent after void tags', () => {
    const result = formatHTML('<div><br><span>text</span></div>');
    expect(result).toContain('<br>');
    // br should not increase indent
    const lines = result.split('\n');
    const brLine = lines.find((l) => l.trim() === '<br>');
    const spanLine = lines.find((l) => l.trim().startsWith('<span>'));
    // both br and span should be at same indent level
    expect(brLine.search(/\S/)).toBe(spanLine.search(/\S/));
  });

  it('handles self-closing tags', () => {
    const result = formatHTML('<div><img src="a.png" /><span>x</span></div>');
    expect(result).toContain('/>');
  });

  it('returns empty string for empty input', () => {
    expect(formatHTML('')).toBe('');
  });

  it('handles single line without change', () => {
    const result = formatHTML('<div>hello</div>');
    // single self-contained tag stays on one line
    expect(result.trim()).toBe('<div>hello</div>');
  });
});

describe('formatCSS', () => {
  it('formats a single rule', () => {
    const result = formatCSS('body{color:red;}');
    expect(result).toContain('body {');
    expect(result).toContain('color:red;');
    expect(result).toContain('}');
  });

  it('formats multiple rules', () => {
    const result = formatCSS('body{color:red;}.box{padding:10px;}');
    const lines = result.split('\n');
    expect(lines.filter((l) => l.trim() === '}').length).toBe(2);
  });

  it('handles empty input', () => {
    expect(formatCSS('')).toBe('');
  });

  it('indents properties inside rules', () => {
    const result = formatCSS('body{color:red;font-size:16px;}');
    const lines = result.split('\n');
    const propLines = lines.filter((l) => l.includes('color') || l.includes('font-size'));
    propLines.forEach((l) => {
      expect(l.startsWith('  ')).toBe(true);
    });
  });
});

describe('formatJS', () => {
  it('formats a function declaration', () => {
    const result = formatJS('function foo(){return 42;}');
    expect(result).toContain('function foo() {');
    expect(result).toContain('return 42;');
    expect(result).toContain('}');
  });

  it('indents nested blocks', () => {
    const result = formatJS('function foo(){if(true){return 1;}}');
    const lines = result.split('\n');
    const returnLine = lines.find((l) => l.includes('return'));
    expect(returnLine.startsWith('    ')).toBe(true); // double indent
  });

  it('handles empty input', () => {
    expect(formatJS('')).toBe('');
  });

  it('handles closing brackets/braces', () => {
    const result = formatJS('var x = [1,2,3];');
    expect(result).toContain('var');
  });
});
