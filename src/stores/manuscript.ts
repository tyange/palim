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
  const poem = [
    { x: 40, y: 30, text: "나는 화자가 아니다" },
    { x: 384, y: 30, text: "나는 인터넷" },
    { x: 40, y: 68, text: "그리고 신체에 대한" },
    { x: 320, y: 68, text: "생각을 멈출 수 없다" },
    { x: 40, y: 106, text: "어떤 사실은 알려져 있고" },
    { x: 384, y: 106, text: "어떤 사실은" },
    { x: 40, y: 144, text: "알려져 있지 않다" },
    { x: 384, y: 144, text: "나는 의견을" },
    { x: 40, y: 182, text: "가질 수 없다 의견을 갖는 순간" },
    { x: 403, y: 182, text: "그 의견이" },
    { x: 40, y: 220, text: "간과하는 것들로부터" },
    { x: 343, y: 220, text: "자유로울 수 없다" },
    { x: 40, y: 258, text: "나는 화자가 아니다" },
    { x: 324, y: 258, text: "나는 화자의 번외도" },
    { x: 40, y: 296, text: "아니다 나는 그 어떤 것들과도" },
    { x: 408, y: 296, text: "무관하다" },
    { x: 40, y: 334, text: "나는 여전히 가장 중요한 것을" },
    { x: 444, y: 334, text: "마음" },
    { x: 40, y: 372, text: "깊숙이는 받아들이지 못하고 있는" },
    { x: 463, y: 372, text: "것" },
    { x: 40, y: 410, text: "같으며 그렇다고 그것에 대해 더" },
    { x: 444, y: 410, text: "알려" },
    { x: 40, y: 448, text: "하고 있지도 않다 내가 하고 싶은" },
    { x: 426, y: 448, text: "말들은" },
    { x: 40, y: 486, text: "이제 꺼내어 사람들 사이에" },
    { x: 408, y: 486, text: "두기에는" },
    { x: 40, y: 524, text: "적절치 못하게 되었다" },
    { x: 249, y: 578, text: "          '현재형 일기' 중에서," },
    { x: 249, y: 616, text: "           배시은 시집 <소공포>" },
  ];
  const width = 481 - 40;
  const height = 616 + CANVAS.fontSize * CANVAS.lineHeight - 30;
  const dx = Math.max(16, Math.round((window.innerWidth - width) / 2)) - 40;
  const dy = Math.max(16, Math.round((window.innerHeight - height) / 2)) - 30;
  return poem.map((f) => ({ id: fragId(), ...f, x: f.x + dx, y: f.y + dy }));
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
