# 다중 문서·자동저장 (`core/library.ts`, `composables/useDocuments.ts`)

palim은 원래 새로고침하면 전부 사라지는 메모리 전용 단일 문서였다. 이제 문서가 여러
개이고 브라우저 localStorage에 자동저장된다. 서버·계정은 없다.

## 모델

- **문서 id는 URL 해시에 둔다**: `/#/d/<id>`. 그래서 앱 안 전환은 URL 이동이고, 새
  탭·창은 같은 URL 형식을 `window.open`으로 여는 것뿐이다(라우터 라이브러리 없음).
  id는 `[A-Za-z0-9_-]{1,40}`만 허용(`isValidDocId`) — 해시에서 온 값이 localStorage
  키로 쓰이므로 검증한다.
- **저장 키**: `palim-doc:<id>` = `serializeDocument` 결과 그대로(`.palim.json` 파일과
  같은 포맷, `docs/canvas-editor.md`의 "문서 저장·불러오기"), `palim-docs` = 인덱스
  `[{id,title,updatedAt}]`, `palim-last-doc` = 마지막으로 연 문서 id.
- **제목은 따로 입력받지 않고 파생**한다(`deriveTitle`): 가장 위(그다음 왼쪽)에 있는
  조각의 첫 줄, 없으면 흐름 본문의 첫 줄, 없으면 "제목 없음". 30자에서 자른다.
  이름 바꾸기 UI는 아직 없다 — 몰입형 셸에 입력 UI를 새로 만들 만큼 급하지 않아서.
- `core/library.ts`는 `KeyValueStore`(getItem/setItem/removeItem)만 아는 순수 로직이라
  Map으로 단위 테스트한다. localStorage는 `useDocuments`가 주입한다.

## 시작·전환 (`useDocuments`, 모듈 싱글톤)

- 시작(`bootstrap`): 해시에 id가 있으면 그 문서를 연다(저장본이 없으면 **빈 문서** —
  새 창으로 연 새 문서가 이 경우다). 해시가 없으면 마지막 문서 → 가장 최근 문서 순으로
  열고, 저장된 문서가 하나도 없으면 데모 내용을 첫 문서로 저장한다.
- 전환(`switchTo`): 현재 문서를 즉시 flush → `pushState` → `load`. 뒤로가기/앞으로가기
  는 `hashchange`로 같은 `load`를 탄다. 문서가 바뀌면 `EditorView`가 `:key="docId"`로
  편집기를 다시 마운트해 `editingId`/`selectedIds` 같은 로컬 상태를 비운다.
  `store.loadDocument`는 undo 히스토리도 초기화한다(문서 간에 섞이면 안 됨).
- ⌘K 명령: 새 문서 / 새 창에서 새 문서 / 문서 열기…(최근 수정순 목록, 같은 팔레트에서
  뷰만 전환 — `keepOpen` 명령) / 현재 문서 삭제(`window.confirm`) / 문서 저장·불러오기(파일).

## 자동저장

- `fragments`·`text`를 깊게 watch해 **500ms 디바운스**로 저장하고, `pagehide`에서도
  flush한다. 드래그처럼 변경이 연속되는 동안은 쓰지 않는다.
- **직렬화 결과가 마지막 저장본과 같으면 쓰지 않는다**(`lastRaw`) — 문서를 막 불러온
  직후의 watch 발화가 `updatedAt`만 갱신하는 걸 막는다.
- **내용 없는 새 문서는 저장하지 않는다**(인덱스에 아직 없고 비어 있으면 skip) —
  "새 문서"만 눌러보고 닫아도 빈 문서가 목록에 쌓이지 않는다.
- 쓰기 실패(용량 초과 등)는 한 번만 토스트로 알린다. undo 히스토리는 저장하지 않는다.

## 같은 문서를 두 창에서 열었을 때

마지막 저장이 이기면 조용히 내용이 사라질 수 있다. `storage` 이벤트로 **다른 창이 이
문서 키를 바꿨음**을 감지하면 `conflicted`로 표시하고 토스트("새로고침하면 반영돼요")를
띄운 뒤, 이 창의 자동저장을 멈춘다(덮어쓰지 않도록). 새로고침/문서 전환(`load`)이
`conflicted`를 푼다. 실시간 병합은 하지 않는다.

## 한계·후속

- localStorage라 브라우저·기기에 묶이고 사이트 데이터를 지우면 사라진다 — `.palim.json`
  저장이 백업 경로. 문서가 수백 개를 넘거나 용량이 문제 되면 IndexedDB로 옮긴다.
- 문서 이름 바꾸기, 목록 UI(현재는 팔레트), 라벨 기반 검색은 아직 없다.
