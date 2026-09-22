# 단어장/카드 수정·삭제 기능 설계

생디와 Cowork 세션에서 같이 정한 설계입니다. 로컬 Claude Code에게 이 파일을 보여주고
"이 설계대로 구현해줘"라고 하면 됩니다.

## 1. 확정된 UX 결정

- **카드 수정/삭제**: 기존 덱 상세 페이지(`/decks/[deckId]`)는 학습(한 장씩 넘기는) 모드만
  유지하고, **새로운 "카드 관리" 화면**(`/decks/[deckId]/manage`)을 만들어서 그 안에서
  전체 카드를 목록으로 보여주고 수정/삭제한다.
- **덱 이름 수정/삭제**: 덱 목록 페이지(`/decks`)에서, 각 덱 항목 옆에 바로 수정/삭제
  버튼을 붙인다. 따로 페이지 이동 없이 그 자리에서 처리한다.

## 2. API 설계

### `src/app/api/decks/[deckId]/route.ts` (신규 파일)

- `PATCH`: body `{ name }` — 덱 이름을 바꾼다.
- `DELETE`: 이 덱과 그 안의 카드를 전부 삭제한다.

덱을 삭제하면 그 안의 카드도 같이 지워져야 하므로, `prisma/schema.prisma`의 `Card.deck`
관계에 `onDelete: Cascade`를 추가한다.

```prisma
model Card {
  ...
  deck        Deck     @relation(fields: [deckId], references: [id], onDelete: Cascade)
  ...
}
```

추가 후 `npx prisma migrate dev --name add-deck-cascade-delete` 실행.

### `src/app/api/cards/[cardId]/route.ts` (기존 파일 확장)

- 기존 `PATCH`는 `mastered`만 받았는데, 이제 `particle`, `reading`, `meaning`, `example`,
  `translation`도 (부분적으로, 즉 body에 들어있는 필드만) 받아서 수정할 수 있게 확장한다.
  빈 문자열로는 저장되지 않게 값이 있을 때만 반영한다.
- `DELETE`: 카드 하나를 삭제한다.

## 3. 새 화면: `/decks/[deckId]/manage`

- 이 덱에 속한 카드를 전부 목록(표 또는 카드 리스트)으로 보여준다. 각 카드마다
  `particle`, `reading`, `meaning`, `example`, `translation`을 보여준다.
- 각 카드에 "수정" 버튼 → 클릭하면 그 카드가 (기존 "새 카드 추가" 폼과 비슷하게) 5개
  입력칸이 있는 수정 폼으로 바뀐다. "저장" 누르면 `PATCH /api/cards/{id}`로 반영,
  "취소" 누르면 원래 값으로 되돌린다.
- 각 카드에 "삭제" 버튼 → `window.confirm`으로 한 번 확인한 뒤 `DELETE /api/cards/{id}`
  호출, 성공하면 목록에서 그 카드를 제거한다.
- 덱 상세(학습) 페이지(`/decks/[deckId]`)와 이 관리 페이지를 서로 오갈 수 있게 링크를
  단다 (예: 학습 페이지 위쪽에 "카드 관리" 링크, 관리 페이지 위쪽에 "학습하기" 링크).

## 4. 덱 목록 페이지(`/decks/page.tsx`) 수정

- 각 덱 항목(현재는 `Link`로 감싸진 한 줄)에 "수정"과 "삭제" 버튼을 추가한다.
  버튼 클릭이 `Link`의 이동을 막지 않도록 `e.preventDefault()` / `e.stopPropagation()`
  처리에 주의한다.
- "수정" 버튼 → 그 자리의 이름 텍스트가 입력칸으로 바뀌고, "저장"/"취소" 버튼이 뜬다.
  저장하면 `PATCH /api/decks/{id}`로 반영.
- "삭제" 버튼 → `window.confirm`으로 "정말 삭제하시겠어요? 안의 카드도 모두 삭제됩니다"
  같은 문구로 한 번 확인한 뒤 `DELETE /api/decks/{id}` 호출, 성공하면 목록에서 제거한다.

## 5. 주의할 점

- 카드 수정 폼과 "새 카드 추가" 폼은 필드 구성이 완전히 같으니, 가능하면 입력 폼 부분을
  재사용 가능한 형태로 만드는 걸 권장한다 (필수는 아님, 시간 되면).
- 삭제는 되돌릴 수 없는 동작이니 확인 절차(`window.confirm`)를 반드시 거친다.
- 기존 학습 모드(라운드 큐, mastered 처리)는 이번 작업으로 건드리지 않는다.
