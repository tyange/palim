import { parseDocument, serializeDocument } from "../core/document";
import { useManuscriptStore } from "../stores/manuscript";
import { downloadBlob } from "./useExport";
import { useToast } from "./useToast";

export const DOCUMENT_EXTENSION = ".palim.json";

export function useDocumentFile() {
  const store = useManuscriptStore();
  const { addToast } = useToast();

  function saveDocument() {
    const raw = serializeDocument(store.fragments, store.text);
    downloadBlob(
      new Blob([raw], { type: "application/json" }),
      `palim${DOCUMENT_EXTENSION}`,
    );
    addToast("문서를 저장했어요");
  }

  function openDocument() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = `${DOCUMENT_EXTENSION},.json,application/json`;
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const result = parseDocument(await file.text(), () => store.fragId());
      if (!result.ok) {
        addToast(`불러오지 못했어요: ${result.error}`);
        return;
      }
      store.replaceDocument(result.fragments, result.text);
      addToast("문서를 불러왔어요");
    });
    input.click();
  }

  return { saveDocument, openDocument };
}
