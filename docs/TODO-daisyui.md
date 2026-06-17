# TODO: daisyUI 도입 검토

## 배경
모바일/좁은 화면에서 에디터 ↔ 미리보기를 전환하는 토글을 구현하면서,
daisyUI(`toggle with icons inside`)를 쓸지 검토했다.

## 결정 (2026-06-17)
**이번 토글은 기존 Tailwind v4 시스템으로 구현했고, daisyUI는 도입하지 않았다.**

이유:
- 토글 스위치는 시맨틱 토큰(`bg-accent`, `border-border` 등)과 lucide 아이콘만으로
  충분히 간단하게 만들 수 있어, "기존 시스템으로 어려우면 daisyUI" 조건에 해당하지 않음.
- daisyUI는 자체 `data-theme` / 색상 유틸(`bg-base-100`, `text-primary` …) 시스템을
  들고 온다. 현재 프로젝트는 `src/style.css`에서
  - `@custom-variant dark (&:where(.dark, .dark *))` 커스텀 다크 변형
  - `:root` / `.dark` CSS 변수 기반 시맨틱 토큰
  - `@theme inline`으로 토큰을 Tailwind 유틸로 노출
  을 직접 구성해 둠. daisyUI 테마 시스템과 이중화/충돌 위험이 있어, 토글 하나를 위해
  도입하는 것은 비용 대비 이득이 낮다고 판단.

## 구현 결과 (이번 턴 완료)
- `src/components/PaneToggle.vue` 신규: knob 안에 현재 패널 아이콘(PencilLine/Eye),
  양옆에 '에디터'/'미리보기' 텍스트 라벨. `defineModel`로 `"editor" | "preview"` 양방향.
- `src/views/EditorView.vue`:
  - `useMediaQuery("(max-width: 1151px)")`로 컴팩트 모드 감지.
  - 컴팩트 모드에서만 `PaneToggle` 노출, `flex-col`로 세로 정렬.
  - `v-show`로 활성 패널만 표시(둘 다 마운트 유지 → 입력/조판 상태 보존).
  - 넓은 화면(>=1152px)에서는 기존처럼 가로 나란히, 토글 숨김.

## 다음 턴으로 넘긴 항목 (daisyUI 전면 도입을 원할 경우)
사용자가 daisyUI로의 광범위한 전환을 원한다면 별도 작업으로 진행:

1. 설치 (bun): `bun add -D daisyui@latest` 후 `src/style.css`에 `@plugin "daisyui";`
   (Tailwind v4 방식, 공식문서 최신 설치법 재확인 필요).
2. **테마 통합 전략 결정** — 가장 중요. 둘 중 택1:
   - (a) daisyUI 테마를 쓰고 기존 시맨틱 토큰을 daisyUI 변수에 매핑.
   - (b) daisyUI 컴포넌트는 쓰되 색은 기존 토큰 유지(daisyUI 테마 비활성/커스텀 테마).
3. 전환 후보 컴포넌트:
   - `ThemeToggle.vue` → daisyUI `swap` 또는 `toggle`
   - `PaneToggle.vue` → daisyUI `toggle`(icons inside)
   - `ManuscriptPreview.vue`의 PNG/SVG 저장 버튼 → daisyUI `btn`
4. 다크 모드 연동: 현재 `useColorMode`(.dark 클래스) ↔ daisyUI `data-theme` 정합.
5. 회귀 확인: 기존 시맨틱 토큰 색이 깨지지 않는지 라이트/다크 양쪽 점검.
