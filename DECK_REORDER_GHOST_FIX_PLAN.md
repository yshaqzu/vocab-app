# 드래그 중 카드가 두 개로 보이는 문제 수정

`/decks/manage`에서 카드를 드래그하면, 이미 실시간으로 자리를 바꿔서 보여주고
있는데도 브라우저가 자동으로 만드는 반투명 "드래그 고스트 이미지"(드래그하는
카드의 스냅샷을 커서에 붙여 보여주는 것)가 겹쳐 보여서, 같은 카드가 두 개
있는 것처럼 보인다. 이미 실시간 재배치로 충분히 피드백을 주고 있으니, 브라우저
기본 고스트 이미지는 꺼버리고 지금처럼 반투명해지는 카드만 남긴다.

## 수정할 곳: `src/app/decks/manage/page.tsx`의 `onDragStart`

`onDragStart` 핸들러 안, `e.dataTransfer.setData(...)`를 호출하는 부분 근처에
아래처럼 투명한 1x1 이미지를 드래그 이미지로 지정하는 코드를 추가한다.

```ts
onDragStart={(e) => {
  e.dataTransfer.setData("text/plain", String(deck.id));
  e.dataTransfer.effectAllowed = "move";

  // 브라우저가 자동으로 만드는 반투명 드래그 고스트 이미지를 끈다.
  // 안 그러면 지금 opacity-50으로 반투명해지는 카드와 겹쳐 보여서
  // 같은 카드가 두 개처럼 보인다. 실시간 재배치로 이미 충분히 피드백을
  // 주고 있으므로, 커서에 따로 이미지를 붙일 필요가 없다.
  const emptyDragImage = new Image();
  emptyDragImage.src =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  e.dataTransfer.setDragImage(emptyDragImage, 0, 0);

  preDragDecksRef.current = decks;
  lastEnteredIdRef.current = null;
  setDraggingId(deck.id);
}}
```

다른 로직(`handleDragEnterDeck`, `handleDragEndDeck`, `opacity-50` 클래스 등)은
그대로 둔다.

## 확인할 점

- 드래그할 때 커서를 따라다니는 반투명 카드 스냅샷이 더 이상 안 보이고,
  목록 안의 카드가 반투명해진 채로 실시간으로 자리만 바뀌는지 확인한다.
- 크롬/엣지뿐 아니라 파이어폭스에서도 같은지 확인한다(파이어폭스는 드래그
  이미지 관련 동작이 약간 다를 수 있음).
- tsc/eslint/next build 통과 확인.
