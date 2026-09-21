"use client"; // useState를 쓰기 위해 브라우저에서 실행되는 컴포넌트로 표시합니다.

import { useEffect, useState } from "react";
import Flashcard from "@/components/Flashcard";

// /api/cards가 돌려주는 카드 하나의 모양입니다.
// 데이터베이스의 Card 모델과 같은 필드를 갖지만, JSON으로 오가는 동안
// createdAt은 Date가 아니라 문자열이 되므로 그 점만 다르게 적어둡니다.
type Card = {
  id: number;
  particle: string;
  meaning: string;
  example: string;
  translation: string;
  createdAt: string;
};

// 폼 입력값을 담는 타입입니다. Card와 필드는 같지만, 폼 전용으로 따로 둡니다.
type NewCardForm = {
  particle: string;
  meaning: string;
  example: string;
  translation: string;
};

// 폼 입력칸이 비어있을 때 쓸 초기값입니다.
const emptyForm: NewCardForm = {
  particle: "",
  meaning: "",
  example: "",
  translation: "",
};

export default function Home() {
  // cards: 화면에 보여줄 카드 전체 목록입니다. 처음에는 빈 배열이었다가,
  // 아래 useEffect에서 API를 통해 데이터베이스 내용을 받아오면 채워집니다.
  const [cards, setCards] = useState<Card[]>([]);

  // isLoading: 서버에서 카드 목록을 아직 가져오는 중인지 기억하는 값입니다.
  // true인 동안은 화면에 "불러오는 중..."만 보여줍니다.
  const [isLoading, setIsLoading] = useState(true);

  // currentIndex: 지금 몇 번째 카드를 보고 있는지 기억하는 상태값입니다.
  const [currentIndex, setCurrentIndex] = useState(0);

  // isFormOpen: "새 카드 추가" 폼을 보여줄지 말지 기억하는 상태값입니다.
  const [isFormOpen, setIsFormOpen] = useState(false);

  // formValues: 폼의 입력칸 4개 값을 하나의 객체로 묶어서 기억합니다.
  // 이렇게 input의 값이 항상 useState 값과 연결되어 있는 걸 "controlled input"이라고 부릅니다.
  const [formValues, setFormValues] = useState<NewCardForm>(emptyForm);

  // errorMessage: 입력칸이 비어있거나 저장에 실패했을 때 보여줄 경고 문구입니다.
  const [errorMessage, setErrorMessage] = useState("");

  // [불러오기] 컴포넌트가 화면에 처음 나타난 직후 딱 한 번만 실행됩니다 (의존성 배열이 []이라서).
  // fetch도 localStorage와 마찬가지로 "화면을 그리는 중"과는 상관없는 부수 효과라서
  // 그리기가 다 끝난 뒤 실행되는 useEffect 안에서 하는 게 안전합니다.
  useEffect(() => {
    fetch("/api/cards")
      .then((res) => res.json())
      .then((data: Card[]) => {
        setCards(data);
      })
      .catch((error) => {
        console.error("카드를 불러오지 못했습니다.", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // "이전" 버튼: 맨 앞 카드가 아니면 인덱스를 하나 줄입니다.
  function goToPrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  // "다음" 버튼: 맨 뒤 카드가 아니면 인덱스를 하나 늘립니다.
  function goToNext() {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  // input 하나가 바뀔 때마다 호출됩니다. 어떤 칸이 바뀌었는지는 fieldName으로 구분합니다.
  function handleFieldChange(fieldName: keyof NewCardForm, value: string) {
    setFormValues({
      ...formValues, // 기존 값들은 그대로 두고
      [fieldName]: value, // 바뀐 칸만 새 값으로 덮어씁니다
    });
  }

  // "추가" 버튼을 눌렀을 때 실행됩니다.
  // 서버에 저장 요청을 보내고 응답을 기다려야 하므로 async 함수로 만듭니다.
  async function handleAddCard() {
    // 4개 칸 중 하나라도 빈 칸(공백만 있는 경우 포함)이면 추가하지 않고 경고만 보여줍니다.
    const isAnyFieldEmpty = Object.values(formValues).some(
      (value) => value.trim() === ""
    );
    if (isAnyFieldEmpty) {
      setErrorMessage("모든 칸을 채워주세요.");
      return;
    }

    try {
      // /api/cards로 POST 요청을 보내 데이터베이스에 새 카드를 저장합니다.
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });

      if (!response.ok) {
        setErrorMessage("카드를 저장하지 못했습니다. 다시 시도해주세요.");
        return;
      }

      // 서버가 만들어준 카드(id, createdAt이 채워진 상태)를 응답으로 받습니다.
      const newCard: Card = await response.json();

      // 기존 배열은 그대로 두고, 그 뒤에 새 카드 하나만 붙인 "새 배열"을 만듭니다.
      // React에서는 배열을 직접 수정(push)하지 않고, 이렇게 새 배열을 만들어서 set 함수에 넣어줘야
      // 화면이 그 변화를 알아채고 다시 그려집니다.
      setCards([...cards, newCard]);

      // 새로 추가된 카드(맨 마지막 카드)로 화면을 이동시켜줍니다.
      setCurrentIndex(cards.length);

      // 폼을 초기 상태로 되돌리고 닫습니다.
      setFormValues(emptyForm);
      setErrorMessage("");
      setIsFormOpen(false);
    } catch (error) {
      console.error("카드를 저장하지 못했습니다.", error);
      setErrorMessage("카드를 저장하지 못했습니다. 다시 시도해주세요.");
    }
  }

  // "취소" 버튼: 입력하던 내용을 버리고 폼을 닫습니다.
  function handleCancel() {
    setFormValues(emptyForm);
    setErrorMessage("");
    setIsFormOpen(false);
  }

  // 아직 서버에서 카드 목록을 받아오는 중이면, 나머지 화면은 그리지 않고
  // 이 로딩 문구만 보여줍니다.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">불러오는 중...</p>
      </div>
    );
  }

  // 지금 보여줄 카드 데이터를 배열에서 꺼냅니다.
  const currentCard = cards[currentIndex];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      {/* 현재 카드를 Flashcard 컴포넌트에 props로 넘겨줍니다 */}
      <Flashcard card={currentCard} />

      <div className="flex gap-4">
        <button onClick={goToPrevious} className="rounded border px-4 py-2">
          이전
        </button>
        <button onClick={goToNext} className="rounded border px-4 py-2">
          다음
        </button>
      </div>

      {/* 몇 번째 카드인지 보여주는 간단한 표시. cards.length라서 카드가 늘면 자동으로 맞춰집니다. */}
      <p className="text-sm text-zinc-500">
        {currentIndex + 1} / {cards.length}
      </p>

      {/* isFormOpen이 false일 때는 "새 카드 추가" 버튼만 보여줍니다 */}
      {!isFormOpen && (
        <button
          onClick={() => setIsFormOpen(true)}
          className="rounded border px-4 py-2"
        >
          새 카드 추가
        </button>
      )}

      {/* isFormOpen이 true일 때는 입력 폼을 보여줍니다 */}
      {isFormOpen && (
        <div className="flex w-full max-w-xs flex-col gap-2 rounded border p-4">
          <input
            className="rounded border px-2 py-1"
            placeholder="조사 (예: と)"
            // value가 항상 formValues.particle과 같으므로 controlled input입니다.
            value={formValues.particle}
            onChange={(e) => handleFieldChange("particle", e.target.value)}
          />
          <input
            className="rounded border px-2 py-1"
            placeholder="뜻"
            value={formValues.meaning}
            onChange={(e) => handleFieldChange("meaning", e.target.value)}
          />
          <input
            className="rounded border px-2 py-1"
            placeholder="일본어 예문"
            value={formValues.example}
            onChange={(e) => handleFieldChange("example", e.target.value)}
          />
          <input
            className="rounded border px-2 py-1"
            placeholder="한국어 해석"
            value={formValues.translation}
            onChange={(e) => handleFieldChange("translation", e.target.value)}
          />

          {/* errorMessage에 내용이 있을 때만 경고 문구를 보여줍니다 */}
          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddCard}
              className="rounded border px-4 py-2"
            >
              추가
            </button>
            <button
              onClick={handleCancel}
              className="rounded border px-4 py-2"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
