describe('rectsOverlap', () => {
  it('returns true for completely overlapping rects', () => {
    const a = { x: 0, y: 0, w: 100, h: 100 };
    const b = { x: 0, y: 0, w: 100, h: 100 };
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it('returns true for one rect inside another', () => {
    const a = { x: 0, y: 0, w: 200, h: 200 };
    const b = { x: 50, y: 50, w: 50, h: 50 };
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it('returns true for partially overlapping rects', () => {
    const a = { x: 0, y: 0, w: 100, h: 100 };
    const b = { x: 50, y: 50, w: 100, h: 100 };
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it('returns true for adjacent rects within tolerance (8px)', () => {
    const a = { x: 0, y: 0, w: 100, h: 100 };
    const b = { x: 105, y: 0, w: 100, h: 100 };
    // gap is 5px, tolerance is 8, so should overlap
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it('returns false for rects outside tolerance', () => {
    const a = { x: 0, y: 0, w: 100, h: 100 };
    const b = { x: 200, y: 0, w: 100, h: 100 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it('returns false for vertically separated rects', () => {
    const a = { x: 0, y: 0, w: 100, h: 100 };
    const b = { x: 0, y: 200, w: 100, h: 100 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it('returns true for same rect', () => {
    const a = { x: 50, y: 50, w: 100, h: 100 };
    expect(rectsOverlap(a, a)).toBe(true);
  });
});

describe('subdivide', () => {
  it('returns right half when left is occupied (wide zone)', () => {
    const zone = { x: 0, y: 0, w: 200, h: 100 };
    const occupied = [{ zone: { x: 0, y: 0, w: 100, h: 100 } }];
    const result = subdivide(zone, occupied, 150, 50);
    expect(result).toEqual({ x: 100, y: 0, w: 100, h: 100 });
  });

  it('returns left half when right is occupied (wide zone)', () => {
    const zone = { x: 0, y: 0, w: 200, h: 100 };
    const occupied = [{ zone: { x: 150, y: 0, w: 50, h: 100 } }];
    const result = subdivide(zone, occupied, 50, 50);
    expect(result).toEqual({ x: 0, y: 0, w: 100, h: 100 });
  });

  it('returns cursor-side half when both sides occupied (wide zone, cursor left)', () => {
    const zone = { x: 0, y: 0, w: 200, h: 100 };
    const occupied = [
      { zone: { x: 25, y: 0, w: 50, h: 100 } },
      { zone: { x: 125, y: 0, w: 50, h: 100 } },
    ];
    const result = subdivide(zone, occupied, 40, 50);
    expect(result).toEqual({ x: 0, y: 0, w: 100, h: 100 });
  });

  it('returns cursor-side half when both sides occupied (wide zone, cursor right)', () => {
    const zone = { x: 0, y: 0, w: 200, h: 100 };
    const occupied = [
      { zone: { x: 25, y: 0, w: 50, h: 100 } },
      { zone: { x: 125, y: 0, w: 50, h: 100 } },
    ];
    const result = subdivide(zone, occupied, 160, 50);
    expect(result).toEqual({ x: 100, y: 0, w: 100, h: 100 });
  });

  it('returns bottom half when top is occupied (tall zone)', () => {
    const zone = { x: 0, y: 0, w: 100, h: 200 };
    const occupied = [{ zone: { x: 0, y: 25, w: 100, h: 50 } }];
    const result = subdivide(zone, occupied, 50, 150);
    expect(result).toEqual({ x: 0, y: 100, w: 100, h: 100 });
  });

  it('returns top half when bottom is occupied (tall zone)', () => {
    const zone = { x: 0, y: 0, w: 100, h: 200 };
    const occupied = [{ zone: { x: 0, y: 150, w: 100, h: 50 } }];
    const result = subdivide(zone, occupied, 50, 50);
    expect(result).toEqual({ x: 0, y: 0, w: 100, h: 100 });
  });

  it('handles square zone as tall (h >= w)', () => {
    const zone = { x: 0, y: 0, w: 100, h: 100 };
    const occupied = [{ zone: { x: 0, y: 25, w: 100, h: 25 } }];
    const result = subdivide(zone, occupied, 50, 75);
    expect(result).toEqual({ x: 0, y: 50, w: 100, h: 50 });
  });
});

describe('dockPanel / undockPanel', () => {
  it('docks a panel and undocks it', () => {
    const el = { id: 'test-dock-panel' };
    const zone = { x: 0, y: 0, w: 100, h: 100 };
    dockPanel(el, zone);
    expect(dockedPanels['test-dock-panel']).toEqual({ el, zone });

    undockPanel(el);
    expect(dockedPanels['test-dock-panel']).toBeUndefined();
  });
});

describe('findOccupyingPanels', () => {
  beforeEach(() => {
    // Clear docked panels
    Object.keys(dockedPanels).forEach((k) => delete dockedPanels[k]);
  });

  it('returns empty array when no panels docked', () => {
    const zone = { x: 0, y: 0, w: 100, h: 100 };
    expect(findOccupyingPanels(zone, null)).toEqual([]);
  });

  it('returns overlapping docked panels', () => {
    const el = { id: 'p1' };
    const docked = { el, zone: { x: 0, y: 0, w: 50, h: 50 } };
    dockedPanels['p1'] = docked;

    const zone = { x: 0, y: 0, w: 100, h: 100 };
    const result = findOccupyingPanels(zone, null);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(docked);
  });

  it('excludes the dragged element', () => {
    const el = { id: 'p1' };
    dockedPanels['p1'] = { el, zone: { x: 0, y: 0, w: 50, h: 50 } };

    const zone = { x: 0, y: 0, w: 100, h: 100 };
    const result = findOccupyingPanels(zone, el);
    expect(result).toHaveLength(0);
  });
});
