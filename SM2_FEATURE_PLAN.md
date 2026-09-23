# SM-2 간격 반복 복습 방식 설계

생디와 Cowork 세션에서 같이 정한 설계입니다. 로컬 Claude Code에게 이 파일을 보여주고
"이 설계대로 구현해줘"라고 하면 됩니다.

## 1. 확정된 결정

- 평가는 지금처럼 "맞혔어요"/"몰랐어요" 2단계 그대로 쓴다 (Anki식 4단계로 늘리지 않는다).
- 기존 라운드 기반 방식과 SM-2 방식은 **학습 시작할 때 고르는 별도 모드**로 공존시킨다.
  기존 라운드 로직은 건드리지 않고, SM-2는 완전히 새로운 화면/로직으로 추가한다.

## 2. SM-2 알고리즘 (2단계 평가용으로 단순화)

카드마다 아래 값을 들고 있는다.

- `repetitions`: 연속으로 맞힌 횟수
- `interval`: 다음 복습까지 며칠 뒤인지 (일 단위)
- `easeFactor`: 난이도 계수 (기본 2.5, 최소 1.3)
- `dueDate`: 다음 복습 예정 날짜/시각

**"맞혔어요"를 눌렀을 때:**
```
repetitions += 1
if repetitions == 1: interval = 1
else if repetitions == 2: interval = 6
else: interval = round(interval * easeFactor)
easeFactor = min(2.5, easeFactor + 0.1)
dueDate = 지금 + interval일
```

**"몰랐어요"를 눌렀을 때:**
```
repetitions = 0
interval = 1
easeFactor = max(1.3, easeFactor - 0.2)
dueDate = 지금 + 1일
```

새로 만든 카드는 `repetitions=0`, `interval=0`, `easeFactor=2.5`, `dueDate=지금`
(=바로 복습 대상)으로 시작한다.

## 3. `prisma/schema.prisma` 변경

`Card` 모델에 아래 필드를 추가한다.

```prisma
model Card {
  ...
  srsRepetitions Int      @default(0)
  srsInterval    Int      @default(0)
  srsEaseFactor  Float    @default(2.5)
  srsDueDate     DateTime @default(now())
  ...
}
```

추가 후 `npx prisma migrate dev --name add-srs-fields` 실행.

## 4. API

### `src/app/api/cards/[cardId]/review/route.ts` (신규)

- `POST`, body `{ correct: boolean }`
- 위 알고리즘대로 서버에서 새 `srsRepetitions`/`srsInterval`/`srsEaseFactor`/`srsDueDate`를
  계산해서 `prisma.card.update`로 저장하고, 갱신된 카드를 반환한다.
- 기존 `/api/cards/[cardId]`의 `PATCH`(범용 필드 수정, 관리 화면에서 씀)는 건드리지 않는다.
  SM-2 계산 로직은 전용 라우트에만 넣는다.

## 5. 화면 구성

지금 `/decks/[deckId]`가 바로 라운드 학습 화면인데, 이걸 "모드 선택" 화면으로 바꾸고
실제 학습 화면들은 하위 경로로 옮긴다.

- **`/decks/[deckId]` (수정, 모드 선택 화면)**: 덱 이름만 보여주고, "라운드 모드로
  학습" / "SM-2 모드로 학습" 두 버튼을 보여준다. (카드 관리 링크는 여기에 유지)
- **`/decks/[deckId]/round` (신규)**: 지금 `/decks/[deckId]`에 있던 라운드 기반 학습
  로직(Flashcard, roundQueue, missedThisRound, handleCorrect/handleIncorrect,
  처음부터 다시 복습하기 등)을 그대로 옮긴다. 동작은 하나도 안 바뀐다.
- **`/decks/[deckId]/srs` (신규)**: SM-2 모드 화면.
  - 이 덱의 카드 중 `srsDueDate <= 지금`인 카드만 오늘 복습 대상으로 가져온다
    (카드 목록은 기존 `GET /api/cards?deckId=` 그대로 쓰고, 클라이언트에서
    `srsDueDate`로 필터링하면 된다).
  - 오늘 복습할 카드가 없으면 "오늘 복습할 카드가 없어요" 문구만 보여준다.
  - 있으면 기존 `Flashcard` 컴포넌트를 그대로 재사용해서 한 장씩 보여주고,
    "맞혔어요"/"몰랐어요" 버튼을 누르면 `POST /api/cards/{id}/review`를 호출한다.
  - 한 카드를 채점하고 나면(맞혔든 틀렸든) 그 카드는 최소 내일 이후로 미뤄지므로,
    이번 세션에서는 다시 큐에 안 넣고 다음 카드로 넘어간다 (라운드 방식처럼
    다시 섞어서 반복하지 않음 — 처음에 정한 "오늘 복습할 카드 목록"을 한 번씩만 돈다).
  - 다 끝나면 "오늘 복습 끝났어요!" 같은 완료 화면을 보여준다.

## 6. 확인할 점

- 라운드 모드(`/decks/[deckId]/round`)는 기존 동작을 그대로 유지해야 한다
  (셔플, 몰랐어요 재등장 등 지금 로직 손대지 않기).
- `/decks/[deckId]/manage`, `/decks/[deckId]/manage/new`에서 학습 화면으로 가는
  링크(`학습하기` 등)가 `/decks/[deckId]`(모드 선택 화면)를 가리키는지 확인한다.
- tsc/eslint/next build 통과 확인.
