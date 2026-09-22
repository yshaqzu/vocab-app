# 사진 → 카드 자동 추가 (OCR) 기능 설계

생디와 Cowork 세션에서 같이 정한 설계입니다. 로컬 Claude Code에게 이 파일을 보여주고
"이 설계대로 구현해줘"라고 하면 됩니다.

## 1. 전체 흐름 (확정된 UX 결정)

1. 사용자가 **먼저 덱을 선택**한다 (덱 상세 페이지 `/decks/[deckId]`에서 시작).
2. "사진으로 카드 추가" 버튼 → 이미지 업로드.
3. 서버가 Gemini에 이미지를 보내서 단어/조사를 추출한다. **이 시점에는 DB에 저장하지 않는다.**
4. 추출된 카드들을 **미리보기 화면**에 보여준다. 각 필드는 바로 수정 가능해야 한다
   (Gemini가 오타/오인식을 낼 수 있으므로).
5. 사용자가 필요 없는 카드는 체크 해제하고, "저장" 버튼을 누르면 선택된 카드만
   1번 덱에 저장된다.

## 2. 카드 필드 (확정)

기존 `Card` 모델(`particle`, `meaning`, `example`, `translation`)에 `reading` 필드를 추가한다.

```prisma
model Card {
  id          Int      @id @default(autoincrement())
  particle    String
  reading     String   // 추가: 후리가나(읽는 법). 이미 히라가나/가타카나인 단어는 그대로 넣는다.
  meaning     String
  example     String
  translation String
  createdAt   DateTime @default(now())
  deckId      Int
  deck        Deck     @relation(fields: [deckId], references: [id])
  mastered    Boolean  @default(false)
}
```

마이그레이션: `npx prisma migrate dev --name add-reading-field`

화면에 단어를 보여줄 때는 `<ruby>出席<rt>しゅっせき</rt></ruby>` 형태로 렌더링한다
(한자별로 나누지 않고 단어 전체에 읽는 법 하나를 붙이는 단순한 방식으로 합의됨).

## 3. API 설계

### `POST /api/ocr` (신규)

- 요청: `multipart/form-data` — `image` (파일), `deckId` (number)
- 처리: 이미지를 base64로 변환 → Gemini API 호출 (vision, structured output/JSON 스키마 사용)
  → **DB에 저장하지 않고** 추출 결과만 반환
- 응답 예시:
  ```json
  {
    "cards": [
      {
        "particle": "出席",
        "reading": "しゅっせき",
        "meaning": "출석",
        "example": "明日の会議に出席します。",
        "translation": "내일 회의에 출석합니다."
      }
    ]
  }
  ```

### `POST /api/cards` (기존 라우트 확장)

- `src/app/api/cards/route.ts`의 필드 검증에 `reading`을 추가한다 (지금은 particle/meaning/example/translation만 검사함).
- 미리보기에서 사용자가 "저장"을 누르면, 체크된 카드 각각에 대해 이 엔드포인트를 순서대로 호출한다
  (새 엔드포인트를 만들 필요 없이 기존 걸 재사용).

## 4. Gemini 프롬프트 설계

- 입력: 업로드된 이미지 + 아래 지시문
- 지시문 핵심 내용:
  - 이미지에서 일본어 단어/조사를 모두 찾을 것
  - 각 항목에 대해 `particle`(원문), `reading`(읽는 법, 히라가나), `meaning`(한국어 뜻),
    `example`(그 단어가 들어간 새 일본어 예문), `translation`(그 예문의 한국어 번역)을 생성할 것
  - 결과를 정해진 JSON 스키마(배열)로만 반환할 것 (자유 텍스트 금지 — responseSchema 사용)

## 5. 모델 선택 관련 참고

Gemini 모델 라인업이 자주 바뀌고, 이 문서를 쓰는 시점(2026-09) 기준 정보가
구현 시점엔 달라져 있을 수 있습니다. 로컬 Claude Code가 구현할 때
`https://ai.google.dev/gemini-api/docs/models` 와 `https://ai.google.dev/gemini-api/docs/pricing`
문서를 직접 확인해서, **무료 등급이면서 이미지 입력을 지원하는 Flash 계열의 안정 버전(프리뷰 아닌 것)**을
고르는 걸 추천합니다. (조사한 시점엔 Flash 계열 모델들이 대부분 무료 등급에서 이미지 입력을 지원했습니다.)

SDK는 `@google/genai` (Node.js/JS 공식 SDK)를 사용합니다. 정확한 메서드 시그니처는
버전마다 바뀔 수 있으니, `npm info @google/genai` 로 최신 버전을 확인하고 공식 문서의
현재 예제 코드를 참고해서 구현하는 걸 권장합니다.

## 6. UI 구현 위치

- `src/app/decks/[deckId]/page.tsx`에 "사진으로 카드 추가" 버튼 추가
- 업로드 + 미리보기 + 저장 흐름은 별도 컴포넌트로 분리하는 걸 추천
  (예: `src/components/OcrUpload.tsx`)
