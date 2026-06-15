<script setup lang="ts">
import { CornerDownLeft } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue";
import { GRID, useManuscriptStore } from "../stores/manuscript";
import type { DisplayCell } from "../types/editor.types";
import Cell from "./Cell.vue";

const { rows, cols, cellSize, gutterCols } = GRID;
const MARK_SIZE = 16; // 줄바꿈·soft-wrap 아이콘 크기(px, SVG 단위)

const width = cols * cellSize; // 격자 폭
const totalWidth = (cols + gutterCols) * cellSize; // 여백 포함 전체 폭
const height = rows * cellSize;

// soft-wrap 커넥터: 가득 찬 행 r와 다음 행 r+1을 여백에서 둥근 곡선으로 이어
// "두 줄이 사실 한 줄로 이어짐"을 보인다. (자동 줄넘김 ≠ 진짜 줄바꿈)
// 두 행 사이 경계선 기준으로 짧게(±half) 뻗어, 연쇄 wrap 시 위·아래 brace가
// 서로 닿지 않게 간격을 둔다. 큐빅 베지어(제어점을 같은 x에)로 belly를 둥글게.
function softWrapPath(r: number): string {
  const boundary = (r + 1) * cellSize; // 두 행 사이 경계
  const half = cellSize * 0.45; // 경계 위/아래로 뻗는 길이 (두 행을 감싸되 인접 brace와 약간 간격)
  const x0 = width + 4; // 격자 오른쪽 끝 살짝 바깥
  const xBulge = width + cellSize * 0.75; // 둥근 belly 제어점 (gutter 안)
  const yTop = boundary - half;
  const yBot = boundary + half;
  return `M ${x0} ${yTop} C ${xBulge} ${yTop} ${xBulge} ${yBot} ${x0} ${yBot}`;
}

const inputRef = useTemplateRef<HTMLTextAreaElement>("inputEl");

// 원본(source of truth)과 레이아웃은 스토어에서 공유 — 프리뷰가 같은 문서를 본다.
const { text, layout } = storeToRefs(useManuscriptStore());

// IME 조합 상태: 아직 compositionend 되지 않은(미확정) 글자 추적
// caretIndex / composingText 길이는 모두 UTF-16 단위 (textarea selectionStart와 동일 좌표계)
const caretIndex = ref(0);
// 빈 칸에 캐럿이 놓이면 그 칸 인덱스를 담는다(가상 캐럿). null이면 텍스트 모드(캐럿=caretIndex).
// 가상 모드에선 공백을 만들지 않고 화면 캐럿만 그 칸에 그린다. 실제 입력 직전(materializeCaret)에만 실체화.
const virtualCell = ref<number | null>(null);
const isComposing = ref(false);
const composingText = ref("");

function syncFromInput() {
  const el = inputRef.value;
  if (!el) return;
  clearSelection();
  // 실제 입력이 들어온 시점 = 텍스트 모드 확정 (백스톱: beforeinput에서 못 비웠어도 정리)
  virtualCell.value = null;
  text.value = el.value;
  caretIndex.value = el.selectionStart ?? el.value.length;
}

function syncCaret() {
  const el = inputRef.value;
  if (!el) return;
  clearSelection();
  caretIndex.value = el.selectionStart ?? el.value.length;
}

function onCompositionUpdate(event: CompositionEvent) {
  composingText.value = event.data ?? "";
  const el = inputRef.value;
  if (el) caretIndex.value = el.selectionStart ?? el.value.length;
}

// 조합 시작은 입력의 가장 이른 시점 → 빈 칸이면 여기서 먼저 실체화해야
// IME가 실제 offset 위치에서 조합을 시작한다.
function onCompositionStart() {
  materializeCaret();
  isComposing.value = true;
}

function onCompositionEnd() {
  isComposing.value = false;
  composingText.value = "";
}

// 캐럿(UTF-16 offset)이 놓인 칸 인덱스를 구한다.
// - 글 끝이면 다음 입력 칸(endCellIndex)
// - 토큰 시작 offset이면 그 칸
// - 한 칸 2자소(숫자·소문자)의 중간 offset이면 그 칸의 span으로 판정
function caretCell(offset: number): number {
  const L = layout.value;
  if (offset >= text.value.length) return L.endCellIndex;
  const direct = L.offsetToCell.get(offset);
  if (direct !== undefined) return direct;
  for (let i = 0; i < L.cellSpan.length; i++) {
    const s = L.cellSpan[i];
    if (s && offset >= s[0] && offset < s[1]) return i;
  }
  return L.endCellIndex;
}

// 가상 칸을 실제 텍스트 위치로 실체화한다. target 칸이 입력 위치가 되도록, 직전의
// '내용 있는 칸' 뒤에 사이 빈 칸 수만큼 공백을 끼워넣는다(글 끝 뒤·중간 갭 모두 처리).
// 공백은 행두 금칙 대상이 아니라 항상 한 칸씩 점유하므로 칸 수만큼의 공백이 그 칸들을
// 정확히 메운다. 입력 직전(@beforeinput·compositionstart)에만 호출 — 탐색만 하다 떠나면
// 텍스트에 흔적이 남지 않는다(이게 사전 공백 채우기와의 차이).
function materializeCaret() {
  if (virtualCell.value === null) return;
  const target = virtualCell.value;
  const { cellSpan } = layout.value;
  let insertAt = 0; // 직전 내용 칸의 끝 offset (없으면 글 맨 앞)
  let prevCell = -1;
  for (let i = target - 1; i >= 0; i--) {
    const s = cellSpan[i];
    if (s) {
      insertAt = s[1];
      prevCell = i;
      break;
    }
  }
  const pad = " ".repeat(target - prevCell - 1); // 직전 내용 칸과 target 사이 빈 칸 수
  const next = text.value.slice(0, insertAt) + pad + text.value.slice(insertAt);
  const offset = insertAt + pad.length; // target 칸이 시작될 offset
  text.value = next;
  caretIndex.value = offset;
  virtualCell.value = null;
  const el = inputRef.value;
  if (el) {
    el.value = next;
    el.setSelectionRange(offset, offset);
  }
}

// 셀 클릭/방향키 이동의 공통 처리.
// - 글자·공백이 있는 칸: 그 칸 시작 offset으로 텍스트 모드(virtualCell=null)
// - 빈 칸: 가상 모드(virtualCell=cellIndex). 공백을 만들지 않고 화면 캐럿만 그 칸에 그린다.
//   textarea selection은 글 끝에 주차해 두고, 실제 입력 시 materializeCaret가 실체화한다.
function moveCaretToCellIndex(cellIndex: number) {
  const span = layout.value.cellSpan[cellIndex];
  const el = inputRef.value;
  if (span) {
    virtualCell.value = null;
    caretIndex.value = span[0];
    if (el) {
      el.focus();
      el.setSelectionRange(span[0], span[0]);
    }
  } else {
    virtualCell.value = cellIndex;
    const end = text.value.length;
    caretIndex.value = end;
    if (el) {
      el.focus();
      el.setSelectionRange(end, end);
    }
  }
}

// 드래그 선택: 셀 단위로 anchor~focus 범위를 추적한다.
const isDragging = ref(false);
const dragAnchorCell = ref<number | null>(null);
const dragFocusCell = ref<number | null>(null);

const selectionRange = computed(() => {
  if (dragAnchorCell.value === null || dragFocusCell.value === null)
    return null;
  return {
    min: Math.min(dragAnchorCell.value, dragFocusCell.value),
    max: Math.max(dragAnchorCell.value, dragFocusCell.value),
  };
});

// 두 칸 이상 걸쳐야 '선택'으로 간주 (한 칸 클릭은 캐럿 이동)
const hasSelection = computed(
  () =>
    selectionRange.value !== null &&
    selectionRange.value.min !== selectionRange.value.max,
);

function clearSelection() {
  dragAnchorCell.value = null;
  dragFocusCell.value = null;
}

function onCellMouseDown(cell: DisplayCell) {
  const idx = cell.row * cols + cell.col;
  isDragging.value = true;
  dragAnchorCell.value = idx;
  dragFocusCell.value = idx;
  // 셀은 SVG라 직접 포커스를 못 받음 → backspace/타이핑이 닿도록 숨은 textarea에 포커스
  inputRef.value?.focus();
}

function onCellMouseEnter(cell: DisplayCell) {
  if (!isDragging.value) return;
  dragFocusCell.value = cell.row * cols + cell.col;
}

// 드래그 종료(window mouseup). 드래그 없이 같은 칸에서 끝났으면 클릭 → 캐럿 이동.
function endDrag() {
  if (!isDragging.value) return;
  isDragging.value = false;
  if (!hasSelection.value && dragFocusCell.value !== null) {
    moveCaretToCellIndex(dragFocusCell.value);
    clearSelection();
  }
}

// 선택 밴드(min~max 셀)가 덮는 UTF-16 offset 구간을 구해 원본에서 통째로 잘라낸다.
// (사이에 낀 줄바꿈도 함께 제거되어 줄이 깔끔히 당겨짐)
function deleteSelection(): void {
  const range = selectionRange.value;
  if (!range || range.min === range.max) return;

  const { cellSpan } = layout.value;
  let firstStart = Infinity;
  let lastEnd = -1;
  for (let i = range.min; i <= range.max; i++) {
    const s = cellSpan[i];
    if (!s) continue;
    if (s[0] < firstStart) firstStart = s[0];
    if (s[1] > lastEnd) lastEnd = s[1];
  }

  clearSelection();
  if (lastEnd < 0) return; // 선택 밴드에 글자가 없음

  const next = text.value.slice(0, firstStart) + text.value.slice(lastEnd);
  text.value = next;
  caretIndex.value = firstStart;

  const el = inputRef.value;
  if (el) {
    el.value = next;
    el.focus();
    el.setSelectionRange(firstStart, firstStart);
  }
}

// 방향키 → 격자 한 칸 이동량 [dRow, dCol]
const arrowDelta: Record<string, readonly [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

// 현재 캐럿이 놓인 칸.
// - 가상 모드: 그 빈 칸
// - 캐럿이 글 끝(마지막 글자 바로 뒤)이면: 방금 친 마지막 글자가 놓인 칸을 기준으로.
//   글 끝 캐럿은 caretCell상 '다음 칸(endCellIndex)'으로 가는데, 그러면 입력 직후 ↑↓가
//   글자보다 한 칸 옆(col+1)에서 출발해 어긋난다. IME 확정 시의 캐럿 점프도 이걸로 흡수.
// - 그 외: 캐럿 offset이 놓인 칸
function currentCell(): number {
  if (virtualCell.value !== null) return virtualCell.value;
  if (caretIndex.value >= text.value.length && caretIndex.value > 0) {
    return caretCell(caretIndex.value - 1);
  }
  return caretCell(caretIndex.value);
}

// origin 칸에서 격자 한 칸 이동 (경계 밖이면 무시)
function navByDelta(delta: readonly [number, number], origin: number) {
  const r = Math.floor(origin / cols) + delta[0];
  const c = (origin % cols) + delta[1];
  if (r < 0 || r >= rows || c < 0 || c >= cols) return;
  moveCaretToCellIndex(r * cols + c);
}

// 이 키 입력이 '텍스트 입력의 시작'인가 — 가상 칸 실체화 타이밍 판정.
// IME 첫 자모 keydown은 compositionstart보다 먼저이고 keyCode 229("Process")로 식별된다.
// 이 시점(=조합 시작 전)에 실체화해야 IME가 올바른 offset에서 조합을 시작한다
// (compositionstart/beforeinput은 이미 옛 위치에 앵커가 잡힌 뒤라 글 끝에서 조합됨 — 버그2).
function startsTextInput(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  // keyCode 229 = IME가 처리 중인 키(조합 시작). deprecated지만 IME 감지의 표준 관용구.
  const imeKeyCode = (e as { keyCode?: number }).keyCode === 229;
  if (imeKeyCode || e.key === "Process") return true;
  if (e.key === "Enter") return true; // 줄바꿈도 입력
  return [...e.key].length === 1; // 단일 문자(printable)
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Backspace") {
    if (isComposing.value) return; // 조합 중 자모 삭제는 IME에 맡김
    if (hasSelection.value) {
      event.preventDefault();
      deleteSelection();
    } else if (virtualCell.value !== null) {
      // 빈 칸엔 지울 게 없음 → 네이티브 삭제(글 끝 글자 제거)를 막고 한 칸 왼쪽으로
      event.preventDefault();
      if (virtualCell.value > 0) moveCaretToCellIndex(virtualCell.value - 1);
    }
    return; // 텍스트 모드: 네이티브 백스페이스에 맡김
  }

  // 모든 방향키를 칸 단위 이동으로 통일 — 빈 칸도 캐럿이 앉을 수 있어 중간 갭을 넘나든다.
  const delta = arrowDelta[event.key];
  if (delta) {
    // 조합 중 keydown은 무시한다. caret을 건드리면 IME가 글자를 복제·깨뜨리므로, 네이티브가
    // 조합을 확정하게 두면 같은 키에 대해 isComposing=false인 두 번째 keydown이 곧바로 와서
    // (확정 후 캐럿을 흡수한 currentCell 기준으로) 이동을 수행한다.
    if (isComposing.value) return;
    event.preventDefault();
    navByDelta(delta, currentCell());
    return;
  }

  // 가상 칸에서 텍스트 입력이 시작되려 함 → 조합 시작 전(여기서) 실체화 (IME 안전)
  if (!isComposing.value && virtualCell.value !== null && startsTextInput(event)) {
    materializeCaret();
  }
}

const cells = computed<DisplayCell[]>(() => {
  const L = layout.value;

  // 활성 칸: 조합 중이면 조합 글자가 놓인 칸들, 아니면 캐럿(다음 입력) 칸
  const activeCells = new Set<number>();
  if (isComposing.value && composingText.value) {
    const start = caretIndex.value - composingText.value.length;
    for (let i = 0; i < L.cellSpan.length; i++) {
      const s = L.cellSpan[i];
      if (s && s[1] > start && s[0] < caretIndex.value) activeCells.add(i);
    }
    if (activeCells.size === 0) activeCells.add(caretCell(caretIndex.value));
  } else {
    // 캐럿이 놓인 칸(글 끝이면 마지막 글자 칸)을 강조 — 이동 기준점과 동일하게 맞춘다
    activeCells.add(currentCell());
  }

  const range = selectionRange.value;
  const selecting = range !== null && range.min !== range.max;

  return Array.from({ length: rows * cols }, (_, index) => ({
    row: Math.floor(index / cols),
    col: index % cols,
    value: L.cellText[index] ?? "",
    guides: {},
    // 선택 밴드 안에서 실제 글자가 있는 칸만 하이라이트
    selected: selecting
      ? index >= range.min && index <= range.max && L.cellText[index] !== ""
      : false,
    // 선택 중에는 캐럿 강조를 숨겨 혼동 방지
    active: !selecting && activeCells.has(index),
  }));
});

// 초기 로드 직후에도 타이핑 가능하도록 숨은 입력칸에 포커스
onMounted(() => {
  inputRef.value?.focus();
  // 드래그가 격자 밖에서 끝나도 종료되도록 전역에서 mouseup 수신
  window.addEventListener("mouseup", endDrag);
});

onUnmounted(() => {
  window.removeEventListener("mouseup", endDrag);
});
</script>

<template>
  <div class="flex max-w-full flex-col gap-2" :style="{ width: `${totalWidth}px` }">
    <!-- 격자 박스: SVG가 absolute로 이 박스를 채움 -->
    <div
      class="relative w-full overflow-visible"
      :style="{ aspectRatio: `${cols + gutterCols} / ${rows}` }"
    >
      <svg
        class="absolute inset-0 block h-full w-full"
        :viewBox="`0 0 ${totalWidth} ${height}`"
        role="grid"
        aria-label="원고지 에디터"
        :aria-rowcount="rows"
        :aria-colcount="cols"
        xmlns="http://www.w3.org/2000/svg"
      >
        <Cell
          v-for="cell in cells"
          :key="`${cell.row}:${cell.col}`"
          :cell="cell"
          :cell-size="cellSize"
          @cellmousedown="onCellMouseDown"
          @cellmouseenter="onCellMouseEnter"
        />

        <!-- 사용자가 친 줄바꿈(\n) 표식 — 칸을 안 차지하는 \n을 보이게 해 자동 줄넘김과 구분.
             Lucide 아이콘을 칸 중앙에 오도록 중첩 svg로 그린다(좌상단을 중심-반칸만큼 이동). -->
        <g
          v-for="nl in layout.newlines"
          :key="`nl:${nl.offset}`"
          class="newline-mark"
          :transform="`translate(${nl.col * cellSize + (cellSize - MARK_SIZE) / 2}, ${nl.row * cellSize + (cellSize - MARK_SIZE) / 2})`"
          aria-hidden="true"
        >
          <CornerDownLeft :size="MARK_SIZE" />
        </g>

        <!-- 자동 줄넘김(soft-wrap) 커넥터 — 가득 찬 행과 다음 행의 오른쪽 끝을 여백에서
             곡선으로 이어 두 줄이 한 줄로 이어짐을 보인다(진짜 줄바꿈 ↵과 구분). -->
        <path
          v-for="r in layout.softWraps"
          :key="`sw:${r}`"
          class="softwrap-mark"
          :d="softWrapPath(r)"
          fill="none"
          stroke-width="1.5"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
          aria-hidden="true"
        />

        <!-- ③ 행두 금칙으로 앞 줄 오른쪽 여백에 적힌 구두점 -->
        <text
          v-for="m in layout.margins"
          :key="`margin:${m.offset}`"
          class="margin-text"
          :x="width + cellSize / 2"
          :y="m.row * cellSize + cellSize / 2"
          dominant-baseline="central"
          text-anchor="middle"
          font-size="18"
        >
          {{ m.text }}
        </text>

        <!-- 편집 가능한 그리드 영역을 구분하는 외곽 프레임 -->
        <rect
          class="grid-frame"
          x="0"
          y="0"
          :width="width"
          :height="height"
          fill="none"
          stroke-width="1.5"
          vector-effect="non-scaling-stroke"
        />
      </svg>

      <!--
        화면에 안 보이지만 포커스 가능한 textarea가 키보드/IME 입력을 수집한다.
        SVG 격자는 직접 IME 조합을 받을 수 없으므로(편집 가능 요소만 가능) 이 숨은
        textarea가 입력을 받고, 셀 클릭 시 moveCaretToCellIndex가 focus +
        setSelectionRange로 캐럿을 옮긴다.

        v-model 대신 native input 이벤트를 직접 받음. v-model은 IME 조합 중 input
        이벤트를 무시하므로 조합 중인 글자가 반영되지 않음. @input은 조합 중에도
        발생하므로 buffer 상태가 실시간 표시됨. textarea라서 Enter로 줄바꿈('\n')
        입력 가능. display:none은 포커스 불가이므로 금지 — 1px 투명 + pointer-events:none.
      -->
      <textarea
        ref="inputEl"
        aria-label="원고지 입력"
        class="absolute left-0 top-0 h-px w-px resize-none overflow-hidden border-0 p-0 opacity-0"
        style="pointer-events: none"
        @beforeinput="materializeCaret"
        @input="syncFromInput"
        @keydown="onKeyDown"
        @keyup="syncCaret"
        @click="syncCaret"
        @select="syncCaret"
        @compositionstart="onCompositionStart"
        @compositionupdate="onCompositionUpdate"
        @compositionend="onCompositionEnd"
      />
    </div>
  </div>
</template>

<style scoped>
.grid-frame {
  stroke: var(--border);
}
.margin-text {
  fill: var(--muted);
  font-family: var(--font-manuscript);
}
/* Lucide 아이콘은 stroke="currentColor" 기반 → color로 색을 준다 */
.newline-mark {
  color: var(--muted);
  opacity: 0.55;
  pointer-events: none;
}
.softwrap-mark {
  stroke: var(--muted);
  opacity: 0.5;
  pointer-events: none;
}
</style>
