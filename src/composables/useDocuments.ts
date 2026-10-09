import { watch } from "vue";
import { parseDocument, serializeDocument } from "../core/document";
import {
  deriveTitle,
  docKey,
  hasDoc,
  isValidDocId,
  LAST_KEY,
  loadDocRaw,
  readIndex,
  removeDoc,
  saveDoc,
  sortRecent,
} from "../core/library";
import { useManuscriptStore } from "../stores/manuscript";
import { useToast } from "./useToast";

const HASH_PATTERN = /^#\/d\/([^/]+)$/;
const SAVE_DELAY = 500;

function parseHash(): string | null {
  const m = HASH_PATTERN.exec(location.hash);
  return m && isValidDocId(m[1]) ? m[1] : null;
}

function docUrl(id: string): string {
  return `${location.pathname}${location.search}#/d/${id}`;
}

export function newDocId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

let started = false;

function createDocuments() {
  const store = useManuscriptStore();
  const { addToast } = useToast();
  const kv = localStorage;

  const lastRaw = new Map<string, string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let conflicted = false;
  let quotaWarned = false;

  function currentRaw(): string {
    return serializeDocument(store.fragments, store.text);
  }

  function isBlank(): boolean {
    return store.fragments.length === 0 && !store.text.trim();
  }

  function flush() {
    clearTimeout(timer);
    timer = undefined;
    const id = store.docId;
    if (!id || conflicted) return;
    const raw = currentRaw();
    if (raw === lastRaw.get(id)) return;
    if (isBlank() && !hasDoc(kv, id)) return;
    try {
      saveDoc(
        kv,
        id,
        raw,
        deriveTitle(store.fragments, store.text),
        Date.now(),
      );
      kv.setItem(LAST_KEY, id);
      lastRaw.set(id, raw);
    } catch {
      if (!quotaWarned) {
        quotaWarned = true;
        addToast("저장하지 못했어요. 저장 공간을 확인해 주세요");
      }
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DELAY);
  }

  function load(id: string) {
    conflicted = false;
    const raw = loadDocRaw(kv, id);
    const parsed = raw ? parseDocument(raw, () => store.fragId()) : null;
    if (parsed?.ok) {
      store.loadDocument(id, parsed.fragments, parsed.text);
      lastRaw.set(id, currentRaw());
    } else {
      store.loadDocument(id, [], "");
      if (raw) addToast("문서를 읽지 못해 빈 문서로 열었어요");
    }
    kv.setItem(LAST_KEY, id);
  }

  function switchTo(id: string) {
    if (id === store.docId) return;
    flush();
    history.pushState(null, "", docUrl(id));
    load(id);
  }

  function bootstrap() {
    const fromHash = parseHash();
    if (fromHash) {
      load(fromHash);
      return;
    }
    const recent = sortRecent(readIndex(kv));
    const last = kv.getItem(LAST_KEY);
    const target = recent.find((m) => m.id === last)?.id ?? recent[0]?.id;
    if (target) {
      history.replaceState(null, "", docUrl(target));
      load(target);
      return;
    }
    const id = newDocId();
    history.replaceState(null, "", docUrl(id));
    store.docId = id;
    flush();
  }

  function start() {
    if (started) return;
    started = true;
    bootstrap();
    watch([() => store.fragments, () => store.text], schedule, { deep: true });
    window.addEventListener("pagehide", flush);
    window.addEventListener("hashchange", () => {
      const id = parseHash();
      if (id && id !== store.docId) {
        flush();
        load(id);
      }
    });
    window.addEventListener("storage", (e) => {
      if (e.storageArea !== kv || e.key !== docKey(store.docId)) return;
      if (e.newValue === lastRaw.get(store.docId)) return;
      if (conflicted) return;
      conflicted = true;
      addToast("다른 창에서 이 문서가 바뀌었어요. 새로고침하면 반영돼요");
    });
  }

  function newDocument() {
    switchTo(newDocId());
  }

  function newDocumentInNewWindow() {
    window.open(docUrl(newDocId()), "_blank");
  }

  function listDocuments() {
    return sortRecent(readIndex(kv));
  }

  function deleteCurrent() {
    const id = store.docId;
    const next = listDocuments().find((m) => m.id !== id)?.id ?? newDocId();
    clearTimeout(timer);
    timer = undefined;
    removeDoc(kv, id);
    lastRaw.delete(id);
    history.pushState(null, "", docUrl(next));
    load(next);
    addToast("문서를 삭제했어요");
  }

  return {
    start,
    switchTo,
    newDocument,
    newDocumentInNewWindow,
    listDocuments,
    deleteCurrent,
  };
}

let api: ReturnType<typeof createDocuments> | null = null;

export function useDocuments() {
  return (api ??= createDocuments());
}
