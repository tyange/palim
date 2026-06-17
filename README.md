<div align="center">

# 𝙋𝙖𝙡𝙞𝙢

**원고지(原稿紙) 그리드 텍스트 에디터**

격자에 한 칸씩 글자를 채워 쓰고, 깔끔한 이미지로 내보내는 웹 에디터.

<sub>Vue 3 · TypeScript · Vite · Tailwind v4 · Pinia · Bun</sub>

</div>

---

## ✨ 무엇인가요

Palim은 한국어 **원고지**를 웹으로 옮긴 텍스트 에디터입니다. 글을 입력하면
원고지 칸 점유 규칙에 맞춰 격자에 자동으로 흘러 들어가고, 그대로 **SVG/PNG 이미지**로
저장할 수 있습니다.

```
┌──┬──┬──┬──┬──┐
│안│녕│하│세│요│   ← 한 글자 = 한 칸
├──┼──┼──┼──┼──┤
│반│갑│습│니│다│
└──┴──┴──┴──┴──┘
```

## 🎯 주요 기능

- **Bun 기반** — 런타임/패키지 매니저로 [Bun](https://bun.sh)을 사용
- **원고지 칸 배치** — 한글은 한 칸, 숫자·소문자는 두 글자씩 한 칸, 문장부호+따옴표는
  한 칸에 합치는 등 원고지 점유 규칙을 그대로 구현 (`src/core/`)
- **행두 금칙 보정** — 줄 첫 칸에 올 수 없는 구두점(`. , ? !`, 닫는 따옴표)을
  앞 줄 오른쪽 여백으로 자동 배치
- **자동 줄넘김 / 줄바꿈 구분** — 자동으로 넘어간 줄은 둥근 커넥터(⟯)로, 사용자가 친
  줄바꿈은 ↵ 표식으로 구분 표시
- **한국어 IME 입력** — 조합 중인 글자도 실시간 반영. 빈 칸·행두 클릭 시 캐럿 삽입
  위치를 정확히 보정 (자세한 내용은 [docs/korean-ime-bug.md](docs/korean-ime-bug.md))
- **클릭·드래그·방향키 편집** — 임의의 칸으로 캐럿 이동, 드래그로 칸 단위 선택·삭제
- **이미지 내보내기** — 화면 그대로 **SVG** 저장, 웹폰트를 픽셀에 구워낸 고해상도 **PNG** 저장
- **반응형 토글 레이아웃** — 좁은 화면에서는 에디터 ↔ 미리보기를 토글로 전환
- **다크 모드** — 시스템 설정 자동 감지 + 수동 토글

## 🧱 구조

```
src/
├─ core/
│  ├─ tokenizer.ts        ① 글자 → 칸 점유 종류로 분류
│  └─ layout.ts           ②③ 칸 묶기 + 격자 배치 + 행두 금칙 보정
├─ stores/
│  └─ manuscript.ts       Pinia — 본문 텍스트·레이아웃 단일 진실원천
├─ components/
│  ├─ GridEditor.vue         격자 입력·캐럿·IME·선택 처리
│  ├─ ManuscriptPreview.vue  일반 글 조판 + SVG/PNG 내보내기
│  ├─ Cell.vue / CellInput.vue
│  ├─ PaneToggle.vue         에디터↔미리보기 전환 토글
│  └─ ThemeToggle.vue        다크 모드 토글
└─ views/
   └─ EditorView.vue      전체 레이아웃
```

레이아웃 엔진은 `텍스트 → tokenize(①) → packCells(②) → flowToGrid(②③)` 순서로
순수 함수 파이프라인을 이룹니다. 에디터와 미리보기는 같은 스토어를 구독해 항상 동일하게
렌더됩니다.

## 📚 설계 문서

- [원고지 편집 규칙](docs/manuscript-paper-editing.md) — 칸 점유·행두 금칙 등 핵심 규칙
- [한국어 IME 처리](docs/korean-ime-bug.md) — 조합 입력·캐럿 보정 노트
- [daisyUI 도입 검토](docs/TODO-daisyui.md) — 스타일링 시스템 결정 기록

## 🛠️ 기술 스택

| 영역 | 사용 |
| --- | --- |
| 프레임워크 | Vue 3 (`<script setup>`) + TypeScript |
| 빌드 | Vite |
| 스타일 | Tailwind CSS v4 (시맨틱 토큰 + 커스텀 다크 변형) |
| 상태 | Pinia |
| 아이콘 | lucide-vue-next |
| 유틸 | @vueuse/core |
| 런타임 | Bun |
| 린트·포맷 | oxlint · oxfmt |
