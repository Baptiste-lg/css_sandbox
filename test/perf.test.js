describe('checkPerfMode', () => {
  let origHTML, origCSS, origJS;

  beforeEach(() => {
    origHTML = editorHTML.value;
    origCSS = editorCSS.value;
    origJS = editorJS.value;
    // Reset autorun checkbox
    autoRunCb.checked = true;
  });

  afterEach(() => {
    editorHTML.value = origHTML;
    editorCSS.value = origCSS;
    editorJS.value = origJS;
  });

  it('hides perf indicator when total chars < 5000', () => {
    editorHTML.value = 'hi';
    editorCSS.value = 'x';
    editorJS.value = 'y';
    checkPerfMode();
    expect(perfIndicator.style.display).toBe('none');
  });

  it('shows perf indicator when total chars > 5000', () => {
    editorHTML.value = 'a'.repeat(5001);
    editorCSS.value = '';
    editorJS.value = '';
    checkPerfMode();
    expect(perfIndicator.style.display).toBe('');
  });

  it('unchecks autorun when threshold exceeded', () => {
    autoRunCb.checked = true;
    editorHTML.value = 'a'.repeat(5001);
    editorCSS.value = '';
    editorJS.value = '';
    checkPerfMode();
    expect(autoRunCb.checked).toBe(false);
  });

  it('does not trigger at exactly 5000 chars (uses >)', () => {
    editorHTML.value = 'a'.repeat(5000);
    editorCSS.value = '';
    editorJS.value = '';
    checkPerfMode();
    expect(perfIndicator.style.display).toBe('none');
  });

  it('considers total across all three editors', () => {
    editorHTML.value = 'a'.repeat(2000);
    editorCSS.value = 'b'.repeat(2000);
    editorJS.value = 'c'.repeat(2000);
    checkPerfMode();
    expect(perfIndicator.style.display).toBe('');
  });
});
