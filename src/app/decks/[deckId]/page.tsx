"use client"; // useState를 쓰기 위해 브라우저에서 실행되는 컴포넌트로 표시합니다.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Flashcard from "@/components/Flashcard";
import OcrUpload from "@/components/OcrUpload";

// /api/cards가 돌려주는 카드 하나의 모양입니다.
// 데이터베이스의 Card 모델과 같은 필드를 갖지만, JSON으로 오가는 동안
// createdAt은 Date가 아니라 문자열이 되므로 그 점만 다르게 적어둡니다.
type Card = {
  id: number;
  particle: string;
  reading: string;
  meaning: string;
  example: string;
  translation: string;
  createdAt: string;
  deckId: number;
  mastered: boolean;
};

// /api/decks가 돌려주는 단어장 하나의 모양입니다. 여기서는 이름만 필요합니다.
type Deck = {
  id: number;
  name: string;
};

// 폼 입력값을 담는 타입입니다. Card와 필드는 같지만, 폼 전용으로 따로 둡니다.
type NewCardForm = {
  particle: string;
  reading: string;
  meaning: string;
  example: string;
  translation: string;
};

// 폼 입력칸이 비어있을 때 쓸 초기값입니다.
const emptyForm: NewCardForm = {
  particle: "",
  reading: "",
  meaning: "",
  example: "",
  translation: "",
};

// 배열을 "무작위로 섞은 새 배열"로 만들어 돌려줍니다(원본은 바꾸지 않습니다).
// 피셔-예이츠(Fisher-Yates) 셔플이라고 부르는 방법인데, 뒤에서부터 하나씩
// "아직 안 정해진 자리 중 하나"와 자리를 맞바꾸는 걸 반복하면 모든 순서가
// 똑같은 확률로 나오는 걸 수학적으로 보장할 수 있어서 자주 쓰입니다.
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function DeckPage() {
  // URL이 /decks/3이면 params.deckId는 문자열 "3"입니다.
  const params = useParams<{ deckId: string }>();
  const deckId = Number(params.deckId);

  // deckName: 화면 위쪽에 보여줄 단어장 이름입니다.
  const [deckName, setDeckName] = useState("");

  // cards: 이 단어장에 속한 카드 전체 목록입니다(외운 카드 포함).
  // 진행 상황("외운 카드 수 / 전체 카드 수")을 계산하는 기준이 됩니다.
  const [cards, setCards] = useState<Card[]>([]);

  // roundQueue: "이번 라운드"에 아직 보여줘야 할 카드들의 id를, 정해진 순서
  // 그대로 담은 줄(큐)입니다. 맨 앞(roundQueue[0])이 지금 화면에 보여줄 카드예요.
  // 라운드가 진행되는 동안에는 이 순서를 절대 섞지 않고, 맞히든 틀리든
  // 그냥 맨 앞을 하나씩 지워가며 앞으로 나아가기만 합니다.
  const [roundQueue, setRoundQueue] = useState<number[]>([]);

  // missedThisRound: 이번 라운드에서 "몰랐어요"를 누른 카드들의 id입니다.
  // 라운드가 끝난 뒤(roundQueue가 다 비었을 때) 이 목록이 있으면
  // "다음 라운드는 이 카드들로만 다시" 시작하는 데 씁니다.
  const [missedThisRound, setMissedThisRound] = useState<number[]>([]);

  // isLoading: 서버에서 카드 목록을 아직 가져오는 중인지 기억하는 값입니다.
  // true인 동안은 화면에 "불러오는 중..."만 보여줍니다.
  const [isLoading, setIsLoading] = useState(true);

  // isFormOpen: "새 카드 추가" 폼을 보여줄지 말지 기억하는 상태값입니다.
  const [isFormOpen, setIsFormOpen] = useState(false);

  // formValues: 폼의 입력칸 4개 값을 하나의 객체로 묶어서 기억합니다.
  // 이렇게 input의 값이 항상 useState 값과 연결되어 있는 걸 "controlled input"이라고 부릅니다.
  const [formValues, setFormValues] = useState<NewCardForm>(emptyForm);

  // errorMessage: 입력칸이 비어있거나 저장에 실패했을 때 보여줄 경고 문구입니다.
  const [errorMessage, setErrorMessage] = useState("");

  // [불러오기] deckId가 정해지면(=페이지가 열리면) 이 단어장의 이름과 카드 목록을
  // 동시에 요청합니다. fetch도 "화면을 그리는 중"과는 상관없는 부수 효과라서
  // 그리기가 다 끝난 뒤 실행되는 useEffect 안에서 하는 게 안전합니다.
  useEffect(() => {
    Promise.all([
      fetch("/api/decks")
        .then((res) => res.json())
        .then((decks: Deck[]) => {
          const deck = decks.find((d) => d.id === deckId);
          setDeckName(deck ? deck.name : "");
        }),
      fetch(`/api/cards?deckId=${deckId}`)
        .then((res) => res.json())
        .then((data: Card[]) => {
          setCards(data);
          // 첫 라운드는, 아직 안 외운(mastered가 false인) 카드들을
          // API가 준 순서(id 오름차순) 그대로 라운드 큐에 담습니다.
          const unmastered = data.filter((card) => !card.mastered);
          setRoundQueue(unmastered.map((card) => card.id));
        }),
    ])
      .catch((error) => {
        console.error("단어장 정보를 불러오지 못했습니다.", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [deckId]);

  // "맞혔어요" 버튼: 서버에 mastered를 true로 저장하고,
  // 라운드 큐 맨 앞에서 이 카드를 지운 뒤 다음 카드로 넘어갑니다.
  // (missedThisRound에는 추가하지 않으므로, 이번 라운드에서는 다시 안 나옵니다.)
  async function handleCorrect(cardId: number) {
    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mastered: true }),
      });

      if (!response.ok) {
        console.error("외운 카드로 표시하지 못했습니다.");
        return;
      }

      // cards 배열에서 이 카드만 mastered: true로 바꿔치기합니다(진행 상황 표시에 쓰입니다).
      setCards(
        cards.map((card) =>
          card.id === cardId ? { ...card, mastered: true } : card
        )
      );
      // 큐의 맨 앞(방금 맞힌 카드)을 제거하고 다음 카드로 넘어갑니다.
      setRoundQueue(roundQueue.slice(1));
    } catch (error) {
      console.error("외운 카드로 표시하지 못했습니다.", error);
    }
  }

  // "몰랐어요" 버튼: 데이터베이스는 건드리지 않습니다(mastered는 계속 false).
  // 이번 라운드의 순서는 그대로 둔 채, 이 카드를 "이번 라운드에서 틀린 카드"
  // 목록 맨 뒤에 적어두고 다음 카드로 넘어갑니다. 이 카드가 다시 보이는 건
  // 이번 라운드가 끝나고 다음 라운드가 시작될 때입니다.
  function handleIncorrect(cardId: number) {
    setMissedThisRound([...missedThisRound, cardId]);
    setRoundQueue(roundQueue.slice(1));
  }

  // "같은 순서로 다시 학습" 버튼: 이번 라운드에서 틀린 카드들을,
  // 틀렸던 순서 그대로 다음 라운드 큐로 만듭니다.
  function handleRestartRoundSameOrder() {
    setRoundQueue(missedThisRound);
    setMissedThisRound([]);
  }

  // "섞어서 다시 학습" 버튼: 이번 라운드에서 틀린 카드들을 무작위로 섞어서
  // 다음 라운드 큐로 만듭니다.
  function handleRestartRoundShuffled() {
    setRoundQueue(shuffle(missedThisRound));
    setMissedThisRound([]);
  }

  // "처음부터 다시 복습하기" 버튼: 서버에 저장된 이 단어장의 모든 카드를
  // mastered: false로 되돌리고, 새 라운드를 id 순서대로 다시 시작합니다.
  async function handleResetReview() {
    try {
      const response = await fetch(`/api/decks/${deckId}/reset`, {
        method: "POST",
      });

      if (!response.ok) {
        console.error("복습을 초기화하지 못했습니다.");
        return;
      }

      const resetCards = cards.map((card) => ({ ...card, mastered: false }));
      setCards(resetCards);
      setRoundQueue(resetCards.map((card) => card.id));
      setMissedThisRound([]);
    } catch (error) {
      console.error("복습을 초기화하지 못했습니다.", error);
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
      // /api/cards로 POST 요청을 보내 이 단어장(deckId)에 새 카드를 저장합니다.
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formValues, deckId }),
      });

      if (!response.ok) {
        setErrorMessage("카드를 저장하지 못했습니다. 다시 시도해주세요.");
        return;
      }

      // 서버가 만들어준 카드(id, createdAt이 채워지고 mastered는 false인 상태)를 응답으로 받습니다.
      const newCard: Card = await response.json();

      // 기존 배열은 그대로 두고, 그 뒤에 새 카드 하나만 붙인 "새 배열"을 만듭니다.
      setCards([...cards, newCard]);
      // 새 카드는 아직 안 외운 카드이니 이번 라운드 큐 맨 뒤에 추가합니다.
      setRoundQueue([...roundQueue, newCard.id]);

      // 폼을 초기 상태로 되돌리고 닫습니다.
      setFormValues(emptyForm);
      setErrorMessage("");
      setIsFormOpen(false);
    } catch (error) {
      console.error("카드를 저장하지 못했습니다.", error);
      setErrorMessage("카드를 저장하지 못했습니다. 다시 시도해주세요.");
    }
  }

  // 사진으로 추가한 카드들이 저장되고 나면 OcrUpload가 이 함수를 호출합니다.
  // 서버가 이미 저장을 끝낸 카드들이므로, 화면 상태에도 그대로 반영하기만 하면 됩니다.
  function handleOcrCardsSaved(newCards: Card[]) {
    setCards([...cards, ...newCards]);
    setRoundQueue([...roundQueue, ...newCards.map((card) => card.id)]);
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

  // 지금 라운드 큐 맨 앞에 있는 카드(=지금 보여줄 카드)를 cards 배열에서 찾습니다.
  const currentCardId = roundQueue[0];
  const currentCard = cards.find((card) => card.id === currentCardId);

  // 외운 카드 수 / 전체 카드 수. 화면 위쪽 진행 상황 표시에 씁니다.
  const masteredCount = cards.filter((card) => card.mastered).length;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      {/* 단어장 목록으로 돌아가는 링크입니다 */}
      <Link href="/decks" className="text-sm text-zinc-500 hover:underline">
        ← 단어장 목록
      </Link>

      <h1 className="text-xl font-bold">{deckName}</h1>

      {/* 카드가 하나라도 있으면 진행 상황(외운 카드 수 / 전체 카드 수)을 보여줍니다 */}
      {cards.length > 0 && (
        <p className="text-sm text-zinc-500">
          {masteredCount} / {cards.length} 외움
        </p>
      )}

      {cards.length === 0 ? (
        // 새로 만든 단어장처럼 카드가 하나도 없을 때
        <p className="text-sm text-zinc-500">
          아직 카드가 없어요. 아래에서 첫 카드를 추가해보세요.
        </p>
      ) : currentCard ? (
        // 이번 라운드 큐에 카드가 남아있을 때: 카드와 "몰랐어요"/"맞혔어요" 버튼을 보여줍니다.
        <>
          {/* key={currentCard.id}를 주면, 카드가 바뀔 때마다 Flashcard가
              완전히 새로 만들어져서 "뒤집힌 상태"가 초기화됩니다.
              key가 없으면 컴포넌트가 재사용되면서 이전 카드의 "뒤집힘" 상태가
              다음 카드에도 그대로 남아있게 됩니다. */}
          <Flashcard key={currentCard.id} card={currentCard} />

          <div className="flex gap-4">
            <button
              onClick={() => handleIncorrect(currentCard.id)}
              className="rounded border px-4 py-2"
            >
              몰랐어요
            </button>
            <button
              onClick={() => handleCorrect(currentCard.id)}
              className="rounded border px-4 py-2"
            >
              맞혔어요
            </button>
          </div>
        </>
      ) : missedThisRound.length > 0 ? (
        // 라운드 큐는 비었는데 이번 라운드에서 틀린 카드가 있을 때:
        // 아직 단어장 전체를 다 외운 게 아니므로, 그 카드들로만 다음 라운드를 시작합니다.
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-bold">
            이번 라운드에서 {missedThisRound.length}개를 못 외웠어요
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleRestartRoundSameOrder}
              className="rounded border px-4 py-2"
            >
              같은 순서로 다시 학습
            </button>
            <button
              onClick={handleRestartRoundShuffled}
              className="rounded border px-4 py-2"
            >
              섞어서 다시 학습
            </button>
          </div>
        </div>
      ) : (
        // 라운드 큐도 비었고 이번 라운드에서 틀린 카드도 없을 때
        // (= 단어장의 모든 카드가 mastered): 완료 화면을 보여줍니다.
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-bold">다 외웠어요!</p>
          <button
            onClick={handleResetReview}
            className="rounded border px-4 py-2"
          >
            처음부터 다시 복습하기
          </button>
        </div>
      )}

      {/* isFormOpen이 false일 때는 "새 카드 추가" 버튼만 보여줍니다 */}
      {!isFormOpen && (
        <div className="flex gap-2">
          <button
            onClick={() => setIsFormOpen(true)}
            className="rounded border px-4 py-2"
          >
            새 카드 추가
          </button>
          <OcrUpload deckId={deckId} onCardsSaved={handleOcrCardsSaved} />
        </div>
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
            placeholder="읽는 법 (예: と)"
            value={formValues.reading}
            onChange={(e) => handleFieldChange("reading", e.target.value)}
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
