"use client"; // useState를 쓰기 위해 브라우저에서 실행되는 컴포넌트로 표시합니다.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Flashcard from "@/components/Flashcard";

// /api/cards가 돌려주는 카드 하나의 모양입니다(라운드 모드와 같습니다).
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

// "몇 장 뒤에 다시 등장할지" 범위의 기본값입니다. DB에 저장하지 않으므로
// 화면을 새로 열 때마다 이 값으로 돌아갑니다.
const DEFAULT_MIN_GAP = 2;
const DEFAULT_MAX_GAP = 4;

// 배열을 "무작위로 섞은 새 배열"로 만들어 돌려줍니다(피셔-예이츠 셔플, 원본은 그대로).
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 지금 카드(queue[0])를 빼고, 남은 큐에서 minGap~maxGap번째 자리 중 무작위
// 위치에 다시 끼워넣은 새 큐를 돌려줍니다.
// 예: minGap 2, maxGap 4면 지금 카드는 다음 2~4번째 카드로 다시 나옵니다.
// 남은 큐가 범위보다 짧으면 범위를 "남은 큐 길이 + 1"(=맨 뒤)로 줄여서 넣습니다.
function requeue(queue: number[], minGap: number, maxGap: number): number[] {
  const [current, ...rest] = queue;
  const lastPosition = rest.length + 1;
  const low = Math.min(minGap, lastPosition);
  const high = Math.min(maxGap, lastPosition);
  const position = low + Math.floor(Math.random() * (high - low + 1));
  // position은 1부터 세는 "몇 번째"이므로 배열 인덱스로는 1을 뺍니다.
  // (최소값이 0이어도 바로 다음 자리, 즉 인덱스 0으로 취급합니다.)
  const index = Math.max(position - 1, 0);
  return [...rest.slice(0, index), current, ...rest.slice(index)];
}

// 숫자 입력칸의 문자열을 0 이상의 정수로 바꿉니다(비었거나 이상하면 0).
function toGap(value: string): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export default function RequeueStudyPage() {
  // URL이 /decks/3/requeue이면 params.deckId는 문자열 "3"입니다.
  const params = useParams<{ deckId: string }>();
  const deckId = Number(params.deckId);

  const [deckName, setDeckName] = useState("");

  // cards: 이 단어장에 속한 카드 전체 목록입니다(외운 카드 포함).
  const [cards, setCards] = useState<Card[]>([]);

  // queue: 앞으로 보여줄 카드 id들의 줄입니다. 맨 앞(queue[0])이 지금 카드예요.
  // "몰랐어요"를 누른 카드는 큐 밖으로 빠지지 않고 몇 장 뒤에 다시 끼워집니다.
  const [queue, setQueue] = useState<number[]>([]);

  // "몇 장 뒤에 다시 등장할지" 범위입니다. 바꾼 값은 다음 "몰랐어요"부터 적용됩니다.
  const [minGap, setMinGap] = useState(DEFAULT_MIN_GAP);
  const [maxGap, setMaxGap] = useState(DEFAULT_MAX_GAP);

  const [isLoading, setIsLoading] = useState(true);

  // [불러오기] 단어장 이름과 카드 목록을 동시에 요청합니다.
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
          // 아직 안 외운 카드들을 무작위로 섞어서 큐를 만듭니다.
          const unmastered = data.filter((card) => !card.mastered);
          setQueue(shuffle(unmastered.map((card) => card.id)));
        }),
    ])
      .catch((error) => {
        console.error("단어장 정보를 불러오지 못했습니다.", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [deckId]);

  // 최소값을 바꿀 때: 최대값보다 커지면 최대값도 같이 올려줍니다.
  function handleMinGapChange(value: string) {
    const next = toGap(value);
    setMinGap(next);
    if (next > maxGap) {
      setMaxGap(next);
    }
  }

  // 최대값을 바꿀 때: 최소값보다 작아지지 않도록 최소값으로 보정합니다.
  function handleMaxGapChange(value: string) {
    setMaxGap(Math.max(toGap(value), minGap));
  }

  // "맞혔어요" 버튼: 서버에 mastered를 true로 저장하고, 큐 맨 앞(지금 카드)을 지웁니다.
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

      setCards(
        cards.map((card) =>
          card.id === cardId ? { ...card, mastered: true } : card
        )
      );
      setQueue(queue.slice(1));
    } catch (error) {
      console.error("외운 카드로 표시하지 못했습니다.", error);
    }
  }

  // "몰랐어요" 버튼: 서버는 건드리지 않고, 지금 카드를 몇 장 뒤 무작위 위치에 다시 넣습니다.
  function handleIncorrect() {
    setQueue(requeue(queue, minGap, maxGap));
  }

  // "처음부터 다시 복습하기" 버튼: 모든 카드를 mastered: false로 되돌리고
  // 큐를 무작위 순서로 새로 만듭니다.
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
      setQueue(shuffle(resetCards.map((card) => card.id)));
    } catch (error) {
      console.error("복습을 초기화하지 못했습니다.", error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">불러오는 중...</p>
      </div>
    );
  }

  const currentCard = cards.find((card) => card.id === queue[0]);
  const masteredCount = cards.filter((card) => card.mastered).length;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <Link href={`/decks/${deckId}`} className="hover:underline">
          ← 학습 모드 선택
        </Link>
        <Link href={`/decks/${deckId}/manage`} className="hover:underline">
          카드 관리
        </Link>
      </div>

      <h1 className="text-xl font-bold">{deckName}</h1>

      {/* "몰랐어요" 카드가 몇 장 뒤에 다시 나올지 정하는 범위 입력칸입니다 */}
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <span>최소</span>
        <input
          type="number"
          min={0}
          value={minGap}
          onChange={(e) => handleMinGapChange(e.target.value)}
          className="w-14 rounded border px-2 py-1 text-center"
        />
        <span>~ 최대</span>
        <input
          type="number"
          min={minGap}
          value={maxGap}
          onChange={(e) => handleMaxGapChange(e.target.value)}
          className="w-14 rounded border px-2 py-1 text-center"
        />
        <span>장 뒤에 다시 등장</span>
      </div>

      {cards.length > 0 && (
        <p className="text-sm text-zinc-500">
          {masteredCount} / {cards.length} 외움
        </p>
      )}

      {cards.length === 0 ? (
        <p className="text-sm text-zinc-500">
          아직 카드가 없어요. &quot;카드 관리&quot;에서 첫 카드를 추가해보세요.
        </p>
      ) : currentCard ? (
        <>
          {/* key를 주면 카드가 바뀔 때마다 Flashcard의 "뒤집힌 상태"가 초기화됩니다 */}
          <Flashcard key={currentCard.id} card={currentCard} />

          <div className="flex gap-4">
            <button onClick={handleIncorrect} className="rounded border px-4 py-2">
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
      ) : (
        // 큐가 비었으면(=모든 카드가 한 번씩 "맞혔어요"를 받았으면) 완료 화면입니다.
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
    </div>
  );
}
