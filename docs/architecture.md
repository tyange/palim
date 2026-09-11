# 아키텍처 — 모드별 독립 진실원천

> **⚠️ 2026-09-11 리셋**: 격자 편집 표면이 SVG 격자+가상 캐럿 → 순수 `<textarea>` →
> CodeMirror 6 → 좌표 맵 진실원천(이산 격자) → **연속 좌표 + 조각(fragment), 겹침
> 가능**(`docs/canvas-editor.md`)으로 계속 갈렸다. 이 문서 아래 있던 `offset`/
> `segmentGraphemes`/`flowGraphemes`/`GridLayout` 설명은 전부 **이산 격자 시절 것으로
> 이제 아카이브 코드**(`archive/discrete-grid-editor/`) 설명이다 — 활성 코드와
> 안 맞는다. 상세 재작성은 후속. 지금 진실은 아래 요약과 `docs/canvas-editor.md`.

Palim은 격자·흐름 두 모드에 **하나의 공유 진실원천을 두지 않는다.** 두 모드는 서로
독립된 문서다(`stores/manuscript.ts`):

```
mode: "grid" | "flow"
  ├─ grid:  fragments: Fragment[]   { id, x, y, text }[], 연속 좌표, 겹침 가능
  └─ flow:  text: string            <textarea>(uncontrolled), 비례폭
```

- 겹칠 수 있는 배치를 평문 한 줄로 표현할 방법이 없어 `fragments` ⇄ `text` 변환은
  **정의되지 않는다.** 모드 토글은 그냥 두 문서를 오갈 뿐 내용이 옮겨가지 않는다 —
  이전(이산 격자 시절)에는 `doc`(좌표 맵) 하나에서 `text`가 파생됐지만, 겹침을 표현
  못 해 모델 자체를 교체했다.
- 격자 모드의 편집(`CanvasEditor.vue`)·출력(`CanvasPreview.vue`)이 같은 `fragments`와
  같은 `CANVAS` 폰트 메트릭을 구독하므로 편집면과 출력면이 항상 일치한다. 흐름 모드의
  편집(`FlowEditor.vue`)·출력(`FlowPreview.vue`)은 같은 `text`를 구독한다.
- 두 모드가 갈리는 근거는 [`writing-modes.md`](./writing-modes.md), 격자 모드 데이터
  모델·편집 방식의 상세는 [`canvas-editor.md`](./canvas-editor.md)에 있다.

## 코어 로직

격자 모드에 남은 유일한 순수 로직은 `src/core/fragments.ts`(`bringToFront`/
`removeById`) — 조각 배열 조작만 다루는 작은 모듈이다. 자소 분할·격자 배치
(`segmentGraphemes`/`flowGraphemes`/`GridLayout`, offset 기반 칸↔캐럿 역산)는 이산
격자 시절 로직으로 전부 `archive/discrete-grid-editor/`에 있다 — 연속 좌표엔 "칸"이
없어 대응하는 개념이 없다.
