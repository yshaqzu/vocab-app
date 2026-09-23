# 단어장 목록 "둘러보기"/"관리" 분리 설계

생디와 Cowork 세션에서 같이 정한 설계입니다. 로컬 Claude Code에게 이 파일을 보여주고
"이 설계대로 구현해줘"라고 하면 됩니다.

카드 쪽에서 이미 쓰고 있는 패턴(학습 화면 `/decks/[deckId]` ↔ 관리 화면
`/decks/[deckId]/manage`)을, 단어장 목록에도 그대로 적용합니다. API는 이미
`/api/decks`, `/api/decks/[deckId]`에 다 구현되어 있으니 이번 작업에서는 건드리지
않고, 프론트엔드 화면만 나눕니다.

## 1. `/decks/page.tsx` (둘러보기, 수정)

지금 있는 것 중 아래만 남긴다.

- 단어장 목록 (이름, 카드 개수) — 각 항목은 `Link`로 `/decks/{id}`(학습 화면)로 이동
- 위쪽이나 아래쪽에 "단어장 관리" 링크 하나 추가 → `/decks/manage`로 이동

아래는 이 페이지에서 뺀다(로직은 삭제하지 말고 `/decks/manage/page.tsx`로 그대로
옮긴다).

- 각 단어장 옆 "수정"/"삭제" 버튼과 인라인 수정 폼 관련 상태/함수
  (`editingDeckId`, `editDeckName`, `handleStartEditDeck`, `handleCancelEditDeck`,
  `handleSaveEditDeck`, `handleDeleteDeck`)
- "새 단어장 만들기" 입력폼과 관련 상태/함수 (`newDeckName`, `handleCreateDeck`)

## 2. `/decks/manage/page.tsx` (신규, 관리 화면)

- 위에서 옮긴 로직을 그대로 가져와서, 단어장 목록 + 각 항목 수정/삭제 버튼(인라인 수정
  폼 포함) + 새 단어장 만들기 폼을 보여준다.
- 위쪽에 "← 둘러보기" 링크를 달아서 `/decks`로 돌아갈 수 있게 한다
  (카드 관리 화면 위쪽 "← 단어장 목록" / "학습하기" 링크와 같은 패턴).
- 여기서는 단어장 이름을 클릭해도 학습 화면으로 안 가도 된다 (관리 전용 화면이므로
  `Link`로 감쌀 필요 없음 — `preventDefault`/`stopPropagation` 처리도 필요 없어짐).

## 3. 확인할 점

- `/api/decks`, `/api/decks/[deckId]`는 이미 구현되어 있으므로 API는 건드리지 않는다.
- 기존에 있던 기능(수정/삭제/만들기)이 화면 위치만 바뀌는 것이지, 동작 자체는
  똑같이 유지되어야 한다.
- tsc/eslint/next build 통과 확인.
