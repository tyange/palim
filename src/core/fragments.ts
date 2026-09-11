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
