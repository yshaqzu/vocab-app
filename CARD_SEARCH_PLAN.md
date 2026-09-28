# 카드 관리 화면 검색 기능 설계

생디와 Cowork 세션에서 같이 정한 설계입니다. 로컬 Claude Code에게 이 파일을 보여주고
"이 설계대로 구현해줘"라고 하면 됩니다.

## 1. 확정된 결정

- 위치: `/decks/[deckId]/manage`(카드 관리 화면)에만 검색창을 추가한다. 학습
  화면들(`/round`, `/srs`, `/requeue`)에는 필요 없다.
- 서버에 새로 요청을 보내지 않고, 이미 불러온 `cards` 배열을 화면(클라이언트)에서
  바로 필터링한다 (카드 수가 많지 않아서 이 정도로 충분함).
- 검색은 단어(`particle`), 읽는 법(`reading`), 뜻(`meaning`), 예문(`example`),
  번역(`translation`) 5개 필드를 전부 대상으로 한다. 이 중 하나라도 검색어를
  포함하면 그 카드를 보여준다. 대소문자/공백은 신경 쓰지 않는다(둘 다 낮은
  대소문자로 바꿔서 비교, `trim()`으로 앞뒤 공백 제거).
- 입력할 때마다 실시간으로 필터링한다(버튼 없이 바로 반영).

## 2. `src/app/decks/[deckId]/manage/page.tsx` 변경

- `searchQuery` state를 하나 추가한다 (`useState("")`).
- "+" 버튼 아래, 카드 목록 위에 검색창(`<input type="text">`)을 추가한다.
  placeholder는 "단어, 읽는 법, 뜻으로 검색" 정도로 한다.
- 화면에 보여줄 카드 목록은 `cards`를 바로 쓰지 않고, 아래 조건으로 한 번
  걸러서(`filter`) 만든 배열(`visibleCards`라고 하자)을 쓴다.

```ts
const query = searchQuery.trim().toLowerCase();
const visibleCards = query === ""
  ? cards
  : cards.filter((card) =>
      [card.particle, card.reading, card.meaning, card.example, card.translation]
        .some((field) => field.toLowerCase().includes(query))
    );
```

- 지금 `cards.length === 0 ? ... : <ul>...cards.map...` 부분을 `visibleCards`
  기준으로 바꾼다.
  - `cards.length === 0`(단어장에 카드가 아예 없음)일 때는 지금처럼
    "아직 카드가 없어요." 그대로 둔다.
  - `cards.length > 0`인데 `visibleCards.length === 0`(검색 결과가 없음)일
    때는 "검색 결과가 없어요." 같은 문구를 새로 보여준다.
- 카드를 수정/삭제해서 `cards` 배열이 바뀌어도(`setCards(...)`), 검색은
  매번 `cards`에서 다시 걸러지는 것이므로 별도로 손볼 부분은 없다.

## 3. 확인할 점

- 검색어를 지우면 전체 카드가 다시 보이는지 확인한다.
- 단어/읽는 법/뜻/예문/번역 중 아무 필드로나 검색해도 잘 걸러지는지 확인한다.
- 카드가 하나도 없는 단어장과, 검색 결과가 없는 경우의 문구가 서로 다르게
  잘 나오는지 확인한다.
- tsc/eslint/next build 통과 확인.
