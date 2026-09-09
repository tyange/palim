# 에디터 셸 — 전체 화면·크롬 숨김·아웃라인·명령 팔레트·미리보기

> **⚠️ 2026-09-09 리셋**: 격자 편집 표면이 SVG 격자 + 가상 캐럿 → (잠깐) 순수 `<textarea>`
> → **CodeMirror 6**(`docs/grid-editor.md`)로 바뀌었다. 1세대 SVG 코드는
> `archive/svg-grid-editor/`. 이 문서의 SVG 격자·칸 클릭 배치·`virtualCell` 관련 서술은
> **갱신 대기**(현재 코드와 어긋남).

`EditorView.vue`는 폼처럼 생긴 가운데 정렬 카드가 아니라 **뷰포트를 꽉 채우는 몰입형
집필 화면**이다. 이 문서는 셸 레이아웃과 그에 딸린 조각(아웃라인 레일, 하단 명령 바,
명령 팔레트, 미리보기 오버레이)과 두 몰입 모드(포커스·타자기)를 정리한다.

디자인 근거는 `design-system` 저장소의 `mockups/palim/palim-directions.html` 시안
(방향 B "무한 여백" + 방향 C의 좌측 아웃라인 상주)이다.

## 레이아웃

```
main.fixed.inset-0.flex               ← 뷰포트 전체, 스크롤 없음
 ├─ OutlineRail                        좌측 상주 레일(크롬)
 ├─ div[ref=stageRef].flex-1.overflow-auto   집필 무대 — 유일한 스크롤러
 │   └─ div.py-[46vh].px-[clamp(24px,8vw,160px)]
 │        └─ GridEditor | FlowEditor
 ├─ CommandBar                         하단 중앙 플로팅 알약(크롬)
 ├─ CommandPalette                     ⌘K 모달
 └─ PreviewOverlay                     ⌘↵ 전체 화면 미리보기
```

- 무대(`stageRef`)만 스크롤한다. 위아래 `46vh` 패딩은 첫 줄·끝 줄도 화면 중앙까지
  올 수 있게 하는 **타자기 모드의 활주로**다.
- 격자 모드는 `w-max`(자연 크기, 넓은 시는 가로 스크롤 — 축소하지 않아 칸 클릭 정확),
  흐름 모드는 `flex justify-center`로 열을 가운데 둔다.

## 크롬 숨김 (`chromeVisible`)

집필 중에는 레일·명령 바가 물러난다. `main`의 `pointermove`가 `revealChrome()`를
호출해 `chromeVisible`을 켜고 2.6초 유휴 뒤 끈다(팔레트가 열려 있으면 유지).

- **OutlineRail**: `chromeVisible`이 꺼지면 `opacity:0` + 좌측으로 살짝 밀려나며
  `pointer-events:none`.
- **CommandBar**: 완전히 숨지 않는다. 평소 `opacity:.32`의 **희미한 힌트**로 남고,
  `chromeVisible`·hover·`focus-within`일 때 `opacity:1`.

> 셸 컴포넌트는 대부분 **Reka UI** headless 프리미티브로 만든다 — 채택 근거·컴포넌트
> 매핑·스코프 CSS 함정은 `ui-primitives.md`. 아래는 Palim 특화 동작만 정리한다.

## OutlineRail

`text`를 `\n`으로 쪼갠 **소스 줄 목록**(격자 모드는 소스 줄 = 격자 행이므로 그대로
대응). Reka `Listbox`로 렌더 — 줄 번호 + 첫 5자 미리보기를 `--muted`로 조용히 나열,
화살표로 이동, 선택 시 `jump` 이벤트로 줄 인덱스를 올려 보내고 `EditorView`가 그 줄을
무대 중앙으로 스크롤한다.

## CommandBar

하단 중앙 알약. Reka `Toolbar` — 격자/흐름 `ToolbarToggleGroup`(`type="single"`) +
`⌘K`(팔레트 열기) `ToolbarButton` + 테마 `ToolbarButton`(`Tooltip` 부착). 이전의
`ModeToggle.vue`·`PaneToggle.vue`·`ThemeToggle.vue`는 이 바로 흡수되어 삭제됐다(테마
로직은 `useTheme` 컴포저블로).

## CommandPalette (⌘K)

`paletteOpen`으로 여닫는 Reka `Dialog` + `Listbox`. `ListboxFilter`가 검색 입력,
필터링은 수동(`query` computed). 선택(`v-model`)을 watch해 해당 명령 실행 후 리셋.
포커스 트랩·`Esc`·스크롤 락은 Dialog가 처리. 명령: 모드 전환 / 미리보기(⌘↵) / 포커스
모드 / 타자기 모드 / 라이트·다크. 내보내기는 미리보기 오버레이 안에 있다.

## PreviewOverlay (⌘↵)

`previewOpen`으로 여닫는 Reka `Dialog`. 모드에 따라 기존 `GridPreview.vue` /
`FlowPreview.vue`(라벨·PNG/SVG 저장 버튼 포함)를 그대로 담는다. 좌우 분할·`PaneToggle`
대신 **명시적으로 불러 겹쳐 보는** 방식. 저장 성공 시 `AppToaster`(Reka `Toast`)로 알림.

## 두 몰입 모드

`useEditorUiStore`가 `useLocalStorage`로 유지한다(`palim-focus-mode`,
`palim-typewriter`, 둘 다 기본 켬).

### 포커스 모드 (`focusMode`)

현재 행만 또렷하고 나머지는 흐리다. **격자 모드 전용** — `GridEditor`의 `cells`
computed가 활성 셀의 행을 구해, 그 행이 아닌 셀에 `dim: true`를 실어 보내고
`Cell.vue`가 `opacity:.28`로 감광한다. 흐름 모드(단일 `<textarea>`)는 줄 단위 스타일이
불가능해 적용하지 않는다.

### 타자기 모드 (`typewriter`)

현재 행을 무대의 세로 중앙에 고정하고 글을 그 아래로 흘려보낸다.

- `GridEditor`는 활성 셀 인덱스(`currentCell()`)를 watch해 `caretmove`로 SVG 내부
  좌표 `{x, y}`를 emit한다(표시 전용 — 캐럿·입력 모델과 무관, `editor-input-model.md`).
- `FlowEditor`는 캐럿 앞의 `\n` 수로 현재 줄을 세어 `caretmove`로 줄 번호를 emit한다.
- `EditorView.centerOn()`이 무대 안 집필 표면(`svg`/`textarea`)의 오프셋을 재
  스크롤 목표를 계산한다(내부 좌표에 `46vh` 패딩·레일 오프셋이 더해지므로 raw 값으로
  스크롤하면 안 된다).

## editorUi 스토어 (`stores/editorUi.ts`)

셸의 UI 상태 전용(본문·모드는 `manuscript` 스토어). `focusMode`·`typewriter`
(localStorage 유지), `previewOpen`·`paletteOpen`·`chromeVisible`(휘발) + 토글 액션.
