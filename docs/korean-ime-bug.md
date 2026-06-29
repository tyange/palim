# 한국어 IME 입력 버그 분석 — ㄴ 탈락 현상

## 현상

격자 에디터에서 `안녕`을 연속 입력할 때 `녕`의 초성 `ㄴ`이 사라진다.

- **입력**: ㅇ → ㅏ → ㄴ → ㄴ → ㅕ → ㅇ
- **기대 결과**: cell0=`안`, cell1=`녕`
- **실제 결과**: cell0=`안`, cell1=`ㅕ`, cell2=`ㅇ`

---

## 디버깅 방법

브라우저 콘솔에서 캡처 로거를 주입해 실제 이벤트 시퀀스를 관찰했다.

```js
(function () {
  window.__log = [];
  window.__t0 = Date.now();

  const EVENTS = [
    "keydown", "keyup", "keypress",
    "compositionstart", "compositionupdate", "compositionend",
    "input", "focus", "blur",
  ];

  function capture(e) {
    window.__log.push({
      t: Date.now() - window.__t0,
      type: e.type,
      tag: e.target?.tagName,
      key: e.key,
      code: e.code,
      data: e.data,
      isComposing: e.isComposing,
      inputValue: e.target?.value,
    });
  }

  EVENTS.forEach((name) => document.addEventListener(name, capture, { capture: true }));
  return "logger installed";
})();
```

입력 후 `JSON.stringify(window.__log, null, 2)` 로 확인.

---

## 실제 이벤트 시퀀스 (캡처 결과)

### cell0 — `안` 조합

| 이벤트 | data / key | inputValue |
|--------|-----------|------------|
| focus | — | `""` |
| keydown | `ㅇ` | `""` |
| compositionstart | `""` | `""` |
| compositionupdate | `ㅇ` | `""` |
| input (isComposing: true) | `ㅇ` | `ㅇ` |
| keydown | `ㅏ` | `ㅇ` |
| compositionupdate | `아` | `ㅇ` |
| input (isComposing: true) | `아` | `아` |
| keydown | `ㄴ` | `아` |
| compositionupdate | `안` | `아` |
| input (isComposing: true) | `안` | `안` |

### 두 번째 `ㄴ` keydown — 음절 경계 처리

| 이벤트 | data / key | inputValue |
|--------|-----------|------------|
| keydown | `ㄴ` | `안` |
| compositionupdate | `안` | `안` |
| input (isComposing: true) | `안` | `안` |
| **compositionend** | **`안`** | **`안`** |

> `compositionend("안")`이 두 번째 ㄴ의 keydown과 **같은 이벤트 배치**에서 발생한다.
> Vue의 `handleCompositionEnd`가 `emit("completed", "안")`을 호출하고, Vue 마이크로태스크로 셀 이동이 예약된다.

### cell0 → cell1 전환

| 이벤트 | 대상 | 비고 |
|--------|------|------|
| blur | OLD input | Vue 마이크로태스크 실행: OLD CellInput unmount, NEW CellInput mount + focus |
| focus | NEW input | |
| compositionstart | NEW input | keydown 없이 즉시 발생 ← **carry-over** |
| compositionupdate | NEW input | data: `ㄴ` |
| input (isComposing: true) | NEW input | inputValue: `ㄴ` |

### cell1 — ㄴ 탈락 발생

| 이벤트 | data / key | inputValue | 기대값 |
|--------|-----------|------------|--------|
| keydown | `ㅕ` | `ㄴ` | — |
| compositionupdate | **`ㅕ`** | `ㄴ` | ~~`녀`~~ |
| input (isComposing: true) | `ㅕ` | **`ㅕ`** | ~~`녀`~~ |
| keydown | `ㅇ` | `ㅕ` | — |
| compositionupdate | `ㅕ` | `ㅕ` | — |
| compositionend | **`ㅕ`** | `ㅕ` | — |

> ㄴ+ㅕ → `녀`가 되어야 하지만, `ㅕ`가 `ㄴ`을 **교체**한다. ㄴ은 어떤 셀에도 기록되지 않는다.

### keyup 위치

| 이벤트 | 대상 |
|--------|------|
| keydown(ㄴ) | **OLD** input |
| keyup(ㄴ) | **NEW** input |

같은 물리 키 입력인데 keydown과 keyup이 서로 다른 DOM 엘리먼트에서 발생한다.

---

## 근본 원인

### 1. `GridEditor.vue`의 `:key="selectedCellKey"`

```html
<CellInput
  v-if="selectedCellKey"
  :key="selectedCellKey"   <!-- 셀 이동마다 새 DOM 엘리먼트 생성 -->
  @completed="handleInputCompleted"
/>
```

셀이 바뀔 때마다 CellInput이 **unmount → remount** 되어 새 `<input>` DOM 엘리먼트가 만들어진다.

### 2. macOS 한국어 IME의 cross-element carry-over

macOS 한국어 IME는 음절 경계(`안` → `녕`)를 처리할 때:

1. `compositionend("안")` 발생 — 현재 음절 확정
2. **내부적으로 ㄴ을 "다음 음절의 초성" 상태로 보유**
3. 포커스가 새 input으로 이동하면, 그 input에 `compositionstart + compositionupdate("ㄴ")`를 주입

이 "주입된 ㄴ"은 사용자가 직접 입력한 ㄴ과 다르다:

| | 직접 입력한 ㄴ | carry-over된 ㄴ |
|--|---------------|----------------|
| keydown 선행 여부 | O (keydown → compositionstart) | X (compositionstart가 먼저) |
| 후속 ㅕ와의 결합 | ㄴ+ㅕ = `녀` ✓ | ㅕ가 ㄴ을 교체 ✗ |

carry-over된 ㄴ은 **초성으로서 결합 능력이 없는 display buffer 상태**다.

---

## 현재 한계

새 `<input>` 엘리먼트를 생성하는 방식으로는 이 버그를 해결할 수 없다.

### JS에서 시도 가능한 방법들이 모두 실패하는 이유

| 방법 | 왜 안 되는가 |
|------|------------|
| `dispatchEvent(new KeyboardEvent('keydown', { key: 'ㄴ' }))` | OS IME는 합성(synthetic) 키보드 이벤트를 처리하지 않는다 |
| `document.execCommand('insertText', false, 'ㄴ')` | 확정 텍스트로 삽입됨 — 후속 ㅕ와 결합 불가 |
| `input.value = 'ㄴ'` | DOM 값만 변경 — IME 조합 상태와 무관 |
| `InputEvent` with `isComposing: true` | IME 내부 상태에 영향 없음 |

IME 조합 상태는 **OS 레벨(macOS 입력기)**에서 관리된다. 브라우저 JS는 IME가 방출하는 이벤트를 수신할 수 있을 뿐, IME의 내부 상태를 **설정**하는 API가 없다.

---

## 해결 방향

`GridEditor.vue`에서 `:key="selectedCellKey"`를 제거하고, **단일 CellInput 인스턴스를 유지**한 채 위치(`style`)만 업데이트한다.

```html
<!-- Before -->
<CellInput
  v-if="selectedCellKey"
  :key="selectedCellKey"
  :style="inputStyle"
  @completed="handleInputCompleted"
/>

<!-- After -->
<CellInput
  v-if="selectedCellKey"
  :style="inputStyle"
  @completed="handleInputCompleted"
/>
```

같은 DOM 엘리먼트가 유지되면 OS IME는 cross-element carry-over를 수행하지 않아도 되므로 ㄴ+ㅕ 결합이 정상적으로 이루어진다.

단, 이 방식으로 변경하면 셀이 이동해도 CellInput이 remount되지 않으므로 `input.value`를 명시적으로 초기화하는 로직이 필요하다.
