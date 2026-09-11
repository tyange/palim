import { defineStore } from "pinia";
import { ref } from "vue";
import { cloneFragments, type Fragment } from "../core/fragments";
import { History } from "../core/history";

export type { Fragment } from "../core/fragments";

export const FLOW = {
  width: 500,
  fontSize: 18,
  lineHeight: 30,
  padX: 16,
  padY: 16,
} as const;

export const CANVAS = {
  fontSize: 19,
  lineHeight: 1.5,
  fontFamily: "var(--font-manuscript)",
} as const;

const DEAFAULT_VALUE = `
나는 화자가 아니다       나는 인터넷
그리고 신체에 대한 생각을  멈출 수 없다
어떤 사실은 알려져 있고    어떤 사실은
알려져 있지 않다        나의 의견을
가질 수 없다 의견을 갖는 순간 그 의견이
간과하는 것들로부터    자유로울 수 없다
나는 화자가 아니다   나는 화자의 번외도
아니다 나는 그 어떤 것들과도   무관하다
나는 여전히 가장 중요한 것을     마음
깊숙이는 받아들이지 못하고 있는     것
같으며 그렇다고 그것에 대해 더    알려
하고 있지도 않다 내가 하고 싶은  말들은
이제 꺼내어 사람들 사이에     두기에는
적절치 못하게 되었다

          '현재형 일기' 중에서,
           배시은 시집 <소공포>
`;

let seq = 0;
function fragId(): string {
  seq += 1;
  return `f${seq}`;
}

function defaultFragments(): Fragment[] {
  return [
    { x: 40, y: 30, text: "나는 화자가 아니다" },
    { x: 60, y: 90, text: "나는 인터넷" },
    { x: 150, y: 100, text: "그리고 신체" },
    { x: 430, y: 60, text: "간과하는 것들로부터" },
    { x: 470, y: 150, text: "자유로울 수 없다" },
    { x: 460, y: 145, text: "간과하는" },
    { x: 120, y: 260, text: "여전히\n가장\n중요한 것을" },
    { x: 620, y: 320, text: "마음 깊숙이는" },
    { x: 640, y: 340, text: "받아들이지 못하고" },
    { x: 90, y: 420, text: "'현재형 일기' 중에서, 배시은" },
  ].map((f) => ({ id: fragId(), ...f }));
}

export type WritingMode = "grid" | "flow";

export const useManuscriptStore = defineStore("manuscript", () => {
  const text = ref(DEAFAULT_VALUE);
  const fragments = ref<Fragment[]>(defaultFragments());
  const mode = ref<WritingMode>("grid");

  const fragmentsHistory = new History<Fragment[]>();
  const canUndo = ref(false);
  const canRedo = ref(false);
  function syncHistoryFlags() {
    canUndo.value = fragmentsHistory.canUndo;
    canRedo.value = fragmentsHistory.canRedo;
  }
  function snapshot() {
    fragmentsHistory.push(cloneFragments(fragments.value));
    syncHistoryFlags();
  }
  function undo() {
    const prev = fragmentsHistory.undo(cloneFragments(fragments.value));
    if (prev) fragments.value = prev;
    syncHistoryFlags();
  }
  function redo() {
    const next = fragmentsHistory.redo(cloneFragments(fragments.value));
    if (next) fragments.value = next;
    syncHistoryFlags();
  }

  return {
    text,
    fragments,
    mode,
    defaultFragments,
    fragId,
    snapshot,
    undo,
    redo,
    canUndo,
    canRedo,
  };
});
