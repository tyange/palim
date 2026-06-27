# TODO: e2e 테스트 (보류)

현재 상태: **도입 보류.** 도메인 규칙은 `core/`의 Vitest 단위 테스트(`tokenizer.test.ts`,
`layout.test.ts`)로 잠갔고, 그 위 상호작용·IME 계층은 아직 자동화하지 않았다.

이 문서는 나중에 e2e를 도입할 때를 위한 결정 기록과 조사 결과다.

## 왜 지금은 보류인가

- 빠르게 깨지기 쉬운 **도메인 규칙(분류·칸 묶기·금칙·줄넘김)**은 이미 단위 테스트로
  덮였다 — 가장 높은 ROI 구간은 완료.
- 개인 단일 문서 앱에 Playwright + 브라우저 바이너리 + CI 러너는 운영 오버헤드가 크다.
- IME 회귀는 자동화로도 **완전히는** 못 잡는다(아래 참고) → e2e를 깔아도 일부는 계속 수동.

## 지금 자동 테스트가 못 덮는 것

| 영역 | 위험도 | 비고 |
|---|---|---|
| GridEditor 상호작용: 캐럿 이동·가상 칸 실체화·드래그 선택·삭제·방향키 | 높음 | 가장 복잡한 코드인데 미커버 |
| IME 조합(한글 자모 탈락·조합 offset) | 높음 | `korean-ime-bug.md` 참고. 회귀 이력 있음 |
| export(SVG/PNG 다운로드) | 낮음 | 버튼 동작 + 파일 생성 |

## 한글 IME를 재현할 수 있는 러너 조사

질문: "한글 IME 조합을 재현 가능한 테스트 러너가 있는가?"

**결론: 실제 OS IME를 그대로 돌리는 러너는 없다. 단, Playwright(Chromium) + CDP의
`Input.imeSetComposition`으로 브라우저 조합 파이프라인을 낮은 수준에서 구동할 수 있고,
이게 현재 가장 현실적인 방법이다.**

### 무엇이 되는가

- Playwright에서 `context.newCDPSession(page)`로 CDP 세션을 열고:
  - `Input.imeSetComposition` — 현재 조합(candidate) 텍스트를 설정. `ㄱ → 가 → 각`처럼
    **중간 조합 상태를 직접 스크립트**해 단계별로 보낸다.
  - `Input.insertText` (또는 `imeCommitComposition`) — 조합 확정.
  - 빈 문자열 `imeSetComposition` — 조합 취소.
- 이 경로는 JS `compositionstart/update/end` 이벤트를 합성 디스패치하는 것보다 한 단계
  낮아, 브라우저의 실제 조합 이벤트·캐럿 갱신을 거친다. 즉 **"조합이 특정 offset에서
  시작/진행될 때 우리 캐럿·offset 로직이 맞나"**(= `korean-ime-bug.md`의 버그2: 조합이
  옛 위치에서 시작되는 류)를 잡을 수 있다.

### 무엇이 안 되는가 (한계)

- **Chromium 전용.** WebKit/Firefox는 CDP가 없어 불가.
- OS IME의 **2벌식 자모 결합 알고리즘**(ㄱ+ㅏ→가)이나 **OS 레벨 keydown/keyCode 229
  타이밍**을 재현하지 못한다. 조합 문자열을 테스트가 손으로 넣어주는 것이라, "특정 키
  시퀀스를 빠르게 쳤을 때만 나는 타이밍 의존 버그"는 여전히 못 잡는다.
- 결국 **OS·IME 타이밍에 의존하는 회귀는 계속 수동 검증**(`bun run dev` + 직접 입력 +
  콘솔 코드포인트 덤프) 영역으로 남는다.

> 참고: Cypress·jsdom 기반은 실제 조합 파이프라인이 없어 IME 재현에 부적합하다.

## 도입한다면 — 권장 범위

1. **러너**: Playwright, Chromium 프로젝트만.
2. **결정적 플로우(우선)**: ASCII 타이핑 → 격자 반영, 방향키 칸 이동, 빈 칸 클릭 →
   실체화, 드래그 선택 → 백스페이스 삭제, export 버튼 → 파일 다운로드. 5~6개.
3. **IME(선택)**: CDP `Input.imeSetComposition`로 조합 중 캐럿/offset 로직만 소수
   케이스로 검증(자모 결합 자체가 아니라 "조합 시작 offset이 클릭한 칸인가" 류).
4. CI는 `bun run test:run`(Vitest)과 별도 잡으로 분리(브라우저 바이너리 캐시).

Sources:
- https://github.com/microsoft/playwright/issues/5777
- https://playwright.dev/docs/api/class-cdpsession
- https://chromedevtools.github.io/devtools-protocol/tot/Input/
