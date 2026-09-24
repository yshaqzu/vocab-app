# 단어장 순서 드래그 변경 기능 설계

생디와 Cowork 세션에서 같이 정한 설계입니다. 로컬 Claude Code에게 이 파일을 보여주고
"이 설계대로 구현해줘"라고 하면 됩니다.

## 1. 확정된 결정

- **위치**: 단어장 관리 화면(`/decks/manage`)에서만 마우스로 항목을 꾹 누르고
  드래그해서 순서를 바꿀 수 있게 한다. 둘러보기 화면(`/decks`)에는 드래그 기능을
  넣지 않는다(다만 순서는 DB에 저장되므로 `/decks`에도 같은 순서로 보인다).
- 새 라이브러리는 추가하지 않고, 브라우저 기본 HTML5 드래그 앤 드롭
  (`draggable`, `onDragStart`, `onDragOver`, `onDrop`)으로 구현한다.
- 이름 수정/삭제 버튼은 지금처럼 그대로 동작해야 한다(드래그 때문에 클릭이
  막히면 안 됨).

## 2. `prisma/schema.prisma` 변경

`Deck` 모델에 순서를 저장하는 필드를 추가한다.

```prisma
model Deck {
  id        Int      @id @default(autoincrement())
  name      String
  order     Int      @default(0)
  createdAt DateTime @default(now())
  cards     Card[]
}
```

추가 후 `npx prisma migrate dev --name add_deck_order` 실행. 기존 단어장들은
전부 `order = 0`으로 들어가는데, 아래 3번처럼 조회할 때 `order` 다음에 `id`로도
정렬하기 때문에 마이그레이션 직후에는 지금 순서(만든 순서)가 그대로 유지된다.
별도의 데이터 보정(백필) 스크립트는 필요 없다.

## 3. API

### `src/app/api/decks/route.ts` (수정)

- `GET`의 `orderBy`를 `{ id: "asc" }`에서 `[{ order: "asc" }, { id: "asc" }]`로
  바꾼다. (`order`가 같으면 `id` 순서로 정렬해서, 마이그레이션 직후처럼 전부
  `order`가 같을 때도 지금 순서가 안 흐트러지게 한다.)
- `POST`(단어장 생성)는 그대로 두되, 새로 만드는 단어장은 항상 `order`를
  "지금 가장 큰 order 값 + 1"로 넣어서 맨 뒤에 추가되게 한다.

### `src/app/api/decks/reorder/route.ts` (신규)

- `POST`, body `{ orderedIds: number[] }` — 원하는 순서대로 나열된 단어장 id
  배열을 받는다.
- 배열의 인덱스를 그대로 `order` 값으로 써서, 각 id에 대해
  `prisma.deck.update({ where: { id }, data: { order: index } })`를 실행한다
  (`Promise.all`이나 `$transaction`으로 한 번에 처리).
- 성공하면 `{ ok: true }` 정도만 반환하면 된다.

## 4. 화면: `src/app/decks/manage/page.tsx` (수정)

- 단어장 목록의 각 `<li>`에 `draggable={true}`를 추가한다 (이름 수정 모드일
  때는 `draggable={false}`로 꺼서 입력칸 조작과 겹치지 않게 한다).
- 드래그 상태를 담을 state를 하나 추가한다: 지금 드래그 중인 단어장의 id
  (`draggingId` 같은 이름, 없으면 `null`).
- `onDragStart`: 그 항목의 id를 `draggingId`로 저장한다.
- `onDragOver`(다른 항목 위로 지나갈 때): `e.preventDefault()`로 드롭을
  허용한다.
- `onDrop`(다른 항목 위에 놓았을 때): `decks` 배열에서 `draggingId`인 항목을
  빼서, 지금 놓은 위치로 다시 끼워넣은 새 배열을 만들어 `setDecks`로 화면에
  바로 반영한다(기다리지 않고 즉시 순서가 바뀌어 보이게). 그 다음
  `POST /api/decks/reorder`를 그 새 순서의 id 배열로 호출해서 서버에도 저장한다.
  저장이 실패하면 `errorMessage`에 안내를 띄운다.
- `onDragEnd`: `draggingId`를 `null`로 되돌린다.
- 드래그 중인 항목은 `opacity-50` 같은 클래스를 줘서 옮기고 있다는 걸
  시각적으로 알려준다. 각 항목 왼쪽에 `⠿` 같은 작은 손잡이 표시를 텍스트로
  하나 붙여서 "여길 잡고 끌 수 있다"는 걸 보여준다(별도 아이콘 라이브러리
  없이 문자로 충분).

## 5. 확인할 점

- 마이그레이션 후에도 기존 단어장들의 화면상 순서가 그대로인지 확인한다.
- 드래그로 순서를 바꾼 뒤 새로고침해도(`GET /api/decks` 다시 호출) 바뀐 순서가
  유지되는지 확인한다.
- 새 단어장을 만들면 항상 맨 뒤에 추가되는지 확인한다.
- 이름 수정/삭제 버튼 클릭이 드래그 때문에 방해받지 않는지 확인한다.
- tsc/eslint/next build 통과 확인.
