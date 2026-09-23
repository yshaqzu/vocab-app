"use client"; // useState를 쓰기 위해 브라우저에서 실행되는 컴포넌트로 표시합니다.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Flashcard from "@/components/Flashcard";

// /api/cards가 돌려주는 카드 하나의 모양입니다.
// JSON으로 오가는 동안 날짜(createdAt, srsDueDate)는 문자열이 됩니다.
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
  srsRepetitions: number;
  srsInterval: number;
  srsEaseFactor: number;
  srsDueDate: string;
};

// /api/decks가 돌려주는 단어장 하나의 모양입니다. 여기서는 이름만 필요합니다.
type Deck = {
  id: number;
  name: string;
};

// 이 단어장의 카드를 서버에서 가져와서, 지금 복습할 차례인(srsDueDate가 지금 이전인)
// 카드만 골라 돌려줍니다. 처음 불러올 때와 SM-2 진행 초기화 뒤에 같이 씁니다.
async function fetchDueCards(deckId: number): Promise<Card[]> {
  const res = await fetch(`/api/cards?deckId=${deckId}`);
  const data: Card[] = await res.json();
  const now = Date.now();
  return data.filter((card) => new Date(card.srsDueDate).getTime() <= now);
}

// SM-2 간격 반복 학습 화면입니다.
// 페이지를 열 때 "오늘 복습할 카드"(srsDueDate가 지금 이전인 카드)를 한 번 정해두고,
// 그 목록을 앞에서부터 한 번씩만 돕니다. 채점한 카드는 서버에서 최소 내일 이후로
// 미뤄지므로 이번 세션에서는 다시 보여주지 않습니다.
export default function SrsStudyPage() {
  const params = useParams<{ deckId: string }>();
  const deckId = Number(params.deckId);

  const [deckName, setDeckName] = useState("");

  // dueCards: 오늘 복습할 카드 목록(페이지를 열 때와 SM-2 진행 초기화 뒤에 정해짐)입니다.
  const [dueCards, setDueCards] = useState<Card[]>([]);

  // currentIndex: dueCards 중 지금 보여주고 있는 카드의 위치입니다.
  const [currentIndex, setCurrentIndex] = useState(0);

  // isSubmitting: 채점 요청을 보내는 중인지 기억합니다(버튼 연타 방지).
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/decks")
        .then((res) => res.json())
        .then((decks: Deck[]) => {
          const deck = decks.find((d) => d.id === deckId);
          setDeckName(deck ? deck.name : "");
        }),
      fetchDueCards(deckId).then(setDueCards),
    ])
      .catch((error) => {
        console.error("단어장 정보를 불러오지 못했습니다.", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [deckId]);

  // "맞혔어요"/"몰랐어요" 버튼: 서버에서 SM-2로 다음 복습 날짜를 계산해 저장하고,
  // 성공하면 다음 카드로 넘어갑니다.
  async function handleReview(cardId: number, correct: boolean) {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/cards/${cardId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correct }),
      });

      if (!response.ok) {
        console.error("채점 결과를 저장하지 못했습니다.");
        return;
      }

      setCurrentIndex(currentIndex + 1);
    } catch (error) {
      console.error("채점 결과를 저장하지 못했습니다.", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // "SM-2 진행 초기화" 버튼: 확인을 한 번 받은 뒤 이 단어장의 모든 카드의 SM-2 상태를
  // 기본값으로 되돌리고, 카드 목록을 다시 불러와 오늘 복습할 카드를 처음부터 다시 정합니다.
  async function handleSrsReset() {
    if (!window.confirm("이 단어장의 SM-2 진행 상황을 모두 초기화할까요?")) {
      return;
    }

    try {
      const response = await fetch(`/api/decks/${deckId}/srs-reset`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`status ${response.status}`);
      }

      setDueCards(await fetchDueCards(deckId));
      setCurrentIndex(0);
    } catch (error) {
      console.error("SM-2 진행 상황을 초기화하지 못했습니다.", error);
      alert("SM-2 진행 상황을 초기화하지 못했어요.");
    }
  }

  const currentCard = dueCards[currentIndex];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <Link href={`/decks/${deckId}`} className="hover:underline">
          ← 학습 모드 선택
        </Link>
        <Link href={`/decks/${deckId}/manage`} className="hover:underline">
          카드 관리
        </Link>
        <button onClick={handleSrsReset} className="hover:underline">
          SM-2 진행 초기화
        </button>
      </div>

      <h1 className="text-xl font-bold">{deckName}</h1>

      {isLoading ? (
        <p className="text-sm text-zinc-500">불러오는 중...</p>
      ) : dueCards.length === 0 ? (
        <p className="text-sm text-zinc-500">오늘 복습할 카드가 없어요</p>
      ) : currentCard ? (
        <>
          <p className="text-sm text-zinc-500">
            {currentIndex + 1} / {dueCards.length}
          </p>

          {/* key를 주면 카드가 바뀔 때마다 Flashcard의 "뒤집힌 상태"가 초기화됩니다. */}
          <Flashcard key={currentCard.id} card={currentCard} />

          <div className="flex gap-4">
            <button
              onClick={() => handleReview(currentCard.id, false)}
              disabled={isSubmitting}
              className="rounded border px-4 py-2 disabled:opacity-50"
            >
              몰랐어요
            </button>
            <button
              onClick={() => handleReview(currentCard.id, true)}
              disabled={isSubmitting}
              className="rounded border px-4 py-2 disabled:opacity-50"
            >
              맞혔어요
            </button>
          </div>
        </>
      ) : (
        <p className="text-lg font-bold">오늘 복습 끝났어요!</p>
      )}
    </div>
  );
}
