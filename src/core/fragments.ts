export interface Fragment {
  id: string;
  x: number;
  y: number;
  text: string;
}

export function bringToFront(fragments: Fragment[], id: string): void {
  const idx = fragments.findIndex((f) => f.id === id);
  if (idx === -1) return;
  const [f] = fragments.splice(idx, 1);
  fragments.push(f);
}

export function removeById(fragments: Fragment[], id: string): void {
  const idx = fragments.findIndex((f) => f.id === id);
  if (idx !== -1) fragments.splice(idx, 1);
}

export function cloneFragments(fragments: Fragment[]): Fragment[] {
  return fragments.map((f) => ({ ...f }));
}

export function nudge(
  fragments: Fragment[],
  ids: Set<string>,
  dx: number,
  dy: number,
): void {
  for (let i = 0; i < fragments.length; i++) {
    const f = fragments[i];
    if (!ids.has(f.id)) continue;
    fragments[i] = { ...f, x: Math.max(0, f.x + dx), y: Math.max(0, f.y + dy) };
  }
}
