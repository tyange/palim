import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { flowGraphemes } from "../core/layout";

export const GRID = {
  cellSize: 32,
  minCols: 20,
  minRows: 12,
} as const;

export const FLOW = {
  width: 500,
  fontSize: 18,
  lineHeight: 30,
  padX: 16,
  padY: 16,
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

export type WritingMode = "grid" | "flow";

export const useManuscriptStore = defineStore("manuscript", () => {
  const text = ref(DEAFAULT_VALUE);
  const mode = ref<WritingMode>("grid");

  const gridLayout = computed(() =>
    flowGraphemes(text.value, GRID.minCols, GRID.minRows),
  );

  return { text, mode, gridLayout };
});
