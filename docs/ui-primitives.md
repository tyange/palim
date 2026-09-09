# UI 프리미티브 — Reka UI

Palim의 **셸(크롬) UI는 [Reka UI](https://reka-ui.com) headless 프리미티브**로 만든다.
편집면(격자/흐름)은 Reka와 무관한 자체 구현이다.

## 왜 Reka UI

- **Headless = CSS·테마 시스템 없음.** Reka는 동작·접근성(포커스 트랩, roving focus,
  ARIA, 스크롤 락, 포털)만 주고 스타일은 우리가 `src/style.css`의 시맨틱 토큰으로 전부
  칠한다. 이전에 daisyUI를 뺐던 이유(자체 `data-theme`/색상 유틸이 Tailwind v4 토큰과
  이중화·충돌)가 Reka엔 해당 안 된다.
- **생태계 일관성.** `tyange-labs/design-system`이 Vue 프리미티브로 Reka UI를 지정했고
  `tyange-cms`가 이미 `reka-ui@^2.10.x`를 쓴다. 같은 버전을 쓴다.
- Radix Vue 후신, Vue headless 사실상 표준.

## 무엇을 Reka로 만들었나

| 컴포넌트         | Reka 프리미티브                                                                 | 메모                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CommandBar`     | `Toolbar` + `ToolbarToggleGroup`/`ToolbarButton`/`ToolbarSeparator` + `Tooltip` | 하단 pill. 격자/흐름은 `type="single"` 토글그룹. `ToolbarToggleItem`의 button은 부모 스코프 id를 못 받아 스타일에 `:deep(button)`을 쓴다. 옛 `ModeToggle`·`PaneToggle`·`ThemeToggle` 흡수·삭제. |
| `CommandPalette` | `Dialog` + `Listbox`(`ListboxFilter`/`ListboxContent`/`ListboxItem`)            | ⌘K. 필터는 수동(`query` computed). 선택(`v-model`)을 watch해 해당 명령 실행 후 `picked`를 null로 리셋. `VisuallyHidden`으로 `DialogTitle`/`Description` 제공.                                   |
| `PreviewOverlay` | `Dialog`(`Portal`/`Overlay`/`Content`/`Title`/`Close`)                          | ⌘↵. 안에 기존 `GridPreview`/`FlowPreview`(export 버튼 포함)를 그대로 담음.                                                                                                                      |
| `OutlineRail`    | `Listbox`(`ListboxContent`/`ListboxItem`)                                       | 좌측 상주. `v-model`로 현재 줄, `@update:model-value` → `jump` emit.                                                                                                                            |
| `AppToaster`     | `Toast`(`Provider`/`Root`/`Description`/`Viewport`)                             | `App.vue`에 상주. 내보내기 성공 시 "SVG/PNG로 저장했어요".                                                                                                                                      |

## 컴포저블

- `composables/useTheme.ts` — `useColorMode` 래핑(`isDark`, `toggle`). `CommandBar`·
  `CommandPalette` 공용(옛 `ThemeToggle` 로직).
- `composables/useToast.ts` — **모듈 스코프** `toasts` ref + `addToast`/`dismiss`.
  모든 호출부가 같은 큐를 공유해야 하므로 ref는 컴포저블 밖에 둔다.

## 규칙

- **스타일은 토큰만.** Reka 컴포넌트에 클래스를 붙이고 `src/style.css` 시맨틱 토큰으로
  칠한다. Reka가 다는 `data-*`(`[data-state]`, `[data-highlighted]`, `[data-orientation]`)를
  hover/active/방향 스타일 훅으로 쓴다.
- **스코프 CSS 함정.** Reka가 내부에서 렌더하는 요소(예: `ToolbarToggleItem`의 button)는
  부모 컴포넌트의 `data-v-*` 스코프 id를 못 받는다. 그런 요소는 `:deep()`로 스타일한다.
  직접 자식으로 쓴 Reka 컴포넌트의 루트(예: `ToolbarButton`)는 id를 받으므로 그냥 클래스로 된다.
- **모달의 Esc·포커스는 Reka가 처리.** `EditorView`는 ⌘K/⌘↵로 열기만 하고 Esc 배관은 없다.
- 편집면(`GridEditor`/`FlowEditor`/`Cell`)엔 Reka를 쓰지 않는다 — 맞는 프리미티브가 없다.
