import { type Fragment } from "./fragments";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DocMeta {
  id: string;
  title: string;
  updatedAt: number;
}

export const INDEX_KEY = "palim-docs";
export const LAST_KEY = "palim-last-doc";
export const DOC_PREFIX = "palim-doc:";
export const UNTITLED = "제목 없음";

const TITLE_MAX = 30;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

export function isValidDocId(id: string): boolean {
  return ID_PATTERN.test(id);
}

export function docKey(id: string): string {
  return `${DOC_PREFIX}${id}`;
}

export function deriveTitle(
  fragments: readonly Pick<Fragment, "x" | "y" | "text">[],
  text: string,
): string {
  const first = (s: string) =>
    s
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean);
  const top = fragments
    .filter((f) => f.text.trim())
    .sort((a, b) => a.y - b.y || a.x - b.x)[0];
  const line = (top && first(top.text)) || first(text);
  if (!line) return UNTITLED;
  return line.length > TITLE_MAX ? `${line.slice(0, TITLE_MAX)}…` : line;
}

export function readIndex(kv: KeyValueStore): DocMeta[] {
  let data: unknown;
  try {
    data = JSON.parse(kv.getItem(INDEX_KEY) ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.filter(
    (m): m is DocMeta =>
      typeof m === "object" &&
      m !== null &&
      typeof m.id === "string" &&
      isValidDocId(m.id) &&
      typeof m.title === "string" &&
      typeof m.updatedAt === "number",
  );
}

export function sortRecent(index: readonly DocMeta[]): DocMeta[] {
  return [...index].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadDocRaw(kv: KeyValueStore, id: string): string | null {
  return kv.getItem(docKey(id));
}

export function saveDoc(
  kv: KeyValueStore,
  id: string,
  raw: string,
  title: string,
  now: number,
): void {
  kv.setItem(docKey(id), raw);
  const index = readIndex(kv).filter((m) => m.id !== id);
  index.push({ id, title, updatedAt: now });
  kv.setItem(INDEX_KEY, JSON.stringify(index));
}

export function removeDoc(kv: KeyValueStore, id: string): void {
  kv.removeItem(docKey(id));
  const index = readIndex(kv).filter((m) => m.id !== id);
  kv.setItem(INDEX_KEY, JSON.stringify(index));
  if (kv.getItem(LAST_KEY) === id) kv.removeItem(LAST_KEY);
}

export function hasDoc(kv: KeyValueStore, id: string): boolean {
  return readIndex(kv).some((m) => m.id === id);
}
