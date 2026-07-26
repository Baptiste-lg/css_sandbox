describe('Find and Replace', () => {
  let ta, origFindInput, origReplaceInput, origFindCount, origFindTarget;

  beforeEach(() => {
    ta = document.createElement('textarea');
    ta.value = 'Hello World hello HELLO';
    document.body.appendChild(ta);

    // Save and override globals
    origFindInput = window.findInput;
    origReplaceInput = window.replaceInput;
    origFindCount = window.findCount;
    origFindTarget = window.findTarget;

    window.findTarget = ta;
  });

  afterEach(() => {
    ta.remove();
    window.findInput = origFindInput;
    window.replaceInput = origReplaceInput;
    window.findCount = origFindCount;
    window.findTarget = origFindTarget;
    window.findMatches = [];
    window.findIndex = -1;
  });

  describe('doFind', () => {
    it('finds all case-insensitive matches', () => {
      findInput.value = 'hello';
      doFind();
      expect(findMatches.length).toBe(3);
    });

    it('returns no matches for absent query', () => {
      findInput.value = 'xyz';
      doFind();
      expect(findMatches.length).toBe(0);
    });

    it('handles empty query', () => {
      findInput.value = '';
      doFind();
      expect(findMatches.length).toBe(0);
    });

    it('sets findIndex to first match at or after cursor', () => {
      ta.selectionStart = 13; // after "Hello World h"
      findInput.value = 'hello';
      doFind();
      expect(findIndex).toBe(2); // third match "HELLO" at position 18
    });

    it('updates find count text', () => {
      findInput.value = 'hello';
      doFind();
      expect(findCount.textContent).toContain('3');
    });
  });

  describe('findNext / findPrev', () => {
    beforeEach(() => {
      findInput.value = 'hello';
      ta.selectionStart = 0;
      doFind();
    });

    it('advances to next match', () => {
      const initial = findIndex;
      findNext();
      expect(findIndex).toBe(initial + 1);
    });

    it('wraps around from last to first', () => {
      findIndex = findMatches.length - 1;
      findNext();
      expect(findIndex).toBe(0);
    });

    it('goes to previous match', () => {
      findIndex = 1;
      findPrev();
      expect(findIndex).toBe(0);
    });

    it('wraps around from first to last', () => {
      findIndex = 0;
      findPrev();
      expect(findIndex).toBe(findMatches.length - 1);
    });

    it('does nothing when no matches', () => {
      findMatches = [];
      findIndex = -1;
      findNext();
      expect(findIndex).toBe(-1);
    });
  });

  describe('doReplace', () => {
    it('replaces current match', () => {
      findInput.value = 'Hello';
      ta.selectionStart = 0;
      doFind();
      replaceInput.value = 'Hi';
      doReplace();
      expect(ta.value).toContain('Hi');
    });

    it('does nothing when findIndex < 0', () => {
      findIndex = -1;
      replaceInput.value = 'Hi';
      const origVal = ta.value;
      doReplace();
      expect(ta.value).toBe(origVal);
    });
  });

  describe('doReplaceAll', () => {
    it('replaces all occurrences case-insensitively', () => {
      findInput.value = 'hello';
      ta.selectionStart = 0;
      doFind();
      replaceInput.value = 'Hi';
      doReplaceAll();
      expect(ta.value).toBe('Hi World Hi Hi');
    });

    it('handles empty query gracefully', () => {
      findInput.value = '';
      const origVal = ta.value;
      doReplaceAll();
      expect(ta.value).toBe(origVal);
    });

    it('handles replacement with empty string (deletion)', () => {
      findInput.value = 'hello';
      ta.selectionStart = 0;
      doFind();
      replaceInput.value = '';
      doReplaceAll();
      expect(ta.value).toBe(' World  ');
    });

    it('does not infinite loop when replacement contains search term', () => {
      ta.value = 'aaa';
      findInput.value = 'a';
      ta.selectionStart = 0;
      doFind();
      replaceInput.value = 'ab';
      doReplaceAll();
      expect(ta.value).toBe('ababab');
    });
  });
});
