describe('handleTab', () => {
  let ta;

  beforeEach(() => {
    ta = document.createElement('textarea');
    ta.value = 'line1\nline2\nline3';
    document.body.appendChild(ta);
  });

  afterEach(() => {
    ta.remove();
  });

  function makeEvent(opts = {}) {
    const e = new KeyboardEvent('keydown', {
      key: opts.key || 'Tab',
      shiftKey: opts.shiftKey || false,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(e, 'target', { value: ta, writable: false });
    return e;
  }

  it('does nothing for non-Tab key', () => {
    const e = makeEvent({ key: 'Enter' });
    const origVal = ta.value;
    handleTab(e);
    expect(ta.value).toBe(origVal);
  });

  it('inserts 2 spaces at cursor with no selection', () => {
    ta.selectionStart = 5;
    ta.selectionEnd = 5;
    const e = makeEvent();
    handleTab(e);
    expect(ta.value).toBe('line1  \nline2\nline3');
    expect(ta.selectionStart).toBe(7);
    expect(ta.selectionEnd).toBe(7);
  });

  it('indents selected lines with Tab', () => {
    // Select line2
    ta.selectionStart = 6; // start of line2
    ta.selectionEnd = 11; // end of line2
    const e = makeEvent();
    handleTab(e);
    expect(ta.value).toBe('line1\n  line2\nline3');
  });

  it('dedents lines with Shift+Tab', () => {
    ta.value = 'line1\n  line2\nline3';
    ta.selectionStart = 6;
    ta.selectionEnd = 13;
    const e = makeEvent({ shiftKey: true });
    handleTab(e);
    expect(ta.value).toBe('line1\nline2\nline3');
  });

  it('handles Shift+Tab with only 1 leading space', () => {
    ta.value = 'line1\n line2\nline3';
    ta.selectionStart = 6;
    ta.selectionEnd = 12;
    const e = makeEvent({ shiftKey: true });
    handleTab(e);
    expect(ta.value).toBe('line1\nline2\nline3');
  });

  it('inserts 2 spaces at start of empty textarea', () => {
    ta.value = '';
    ta.selectionStart = 0;
    ta.selectionEnd = 0;
    const e = makeEvent();
    handleTab(e);
    expect(ta.value).toBe('  ');
    expect(ta.selectionStart).toBe(2);
  });

  it('indents multiple selected lines', () => {
    ta.selectionStart = 0;
    ta.selectionEnd = 17; // select all
    const e = makeEvent();
    handleTab(e);
    expect(ta.value).toBe('  line1\n  line2\n  line3');
  });
});

describe('handleAutoPair', () => {
  let ta;

  beforeEach(() => {
    ta = document.createElement('textarea');
    ta.value = '';
    document.body.appendChild(ta);
  });

  afterEach(() => {
    ta.remove();
  });

  function makeEvent(key) {
    const e = new KeyboardEvent('keydown', {
      key: key,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(e, 'target', { value: ta, writable: false });
    return e;
  }

  it('auto-closes curly brace', () => {
    ta.value = '';
    ta.selectionStart = 0;
    ta.selectionEnd = 0;
    handleAutoPair(makeEvent('{'));
    expect(ta.value).toBe('{}');
    expect(ta.selectionStart).toBe(1);
    expect(ta.selectionEnd).toBe(1);
  });

  it('auto-closes parenthesis', () => {
    ta.value = '';
    ta.selectionStart = 0;
    ta.selectionEnd = 0;
    handleAutoPair(makeEvent('('));
    expect(ta.value).toBe('()');
    expect(ta.selectionStart).toBe(1);
  });

  it('auto-closes square bracket', () => {
    ta.value = '';
    ta.selectionStart = 0;
    ta.selectionEnd = 0;
    handleAutoPair(makeEvent('['));
    expect(ta.value).toBe('[]');
  });

  it('auto-closes double quote', () => {
    ta.value = '';
    ta.selectionStart = 0;
    ta.selectionEnd = 0;
    handleAutoPair(makeEvent('"'));
    expect(ta.value).toBe('""');
  });

  it('auto-closes single quote', () => {
    ta.value = '';
    ta.selectionStart = 0;
    ta.selectionEnd = 0;
    handleAutoPair(makeEvent("'"));
    expect(ta.value).toBe("''");
  });

  it('auto-closes backtick', () => {
    ta.value = '';
    ta.selectionStart = 0;
    ta.selectionEnd = 0;
    handleAutoPair(makeEvent('`'));
    expect(ta.value).toBe('``');
  });

  it('wraps selection in brackets', () => {
    ta.value = 'hello';
    ta.selectionStart = 0;
    ta.selectionEnd = 5;
    handleAutoPair(makeEvent('{'));
    expect(ta.value).toBe('{hello}');
    expect(ta.selectionStart).toBe(1);
    expect(ta.selectionEnd).toBe(6);
  });

  it('skips over existing closing character', () => {
    ta.value = '{}';
    ta.selectionStart = 1;
    ta.selectionEnd = 1;
    handleAutoPair(makeEvent('}'));
    expect(ta.value).toBe('{}');
    expect(ta.selectionStart).toBe(2);
  });

  it('deletes both chars on backspace between empty pair', () => {
    ta.value = '{}';
    ta.selectionStart = 1;
    ta.selectionEnd = 1;
    handleAutoPair(makeEvent('Backspace'));
    expect(ta.value).toBe('');
    expect(ta.selectionStart).toBe(0);
  });

  it('does nothing for non-pair character', () => {
    ta.value = 'abc';
    ta.selectionStart = 1;
    ta.selectionEnd = 1;
    const origVal = ta.value;
    handleAutoPair(makeEvent('x'));
    expect(ta.value).toBe(origVal);
  });
});
