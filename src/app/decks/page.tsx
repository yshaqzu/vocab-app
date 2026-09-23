"use client"; // useState를 쓰기 위해 브라우저에서 실행되는 컴포넌트로 표시합니다.

import { useEffect, useState } from "react";
import Link from "next/link";

// /api/decks가 돌려주는 단어장 하나의 모양입니다.
// _count.cards는 Prisma가 "이 단어장에 딸린 카드가 몇 개인지" 함께 세어서 주는 값입니다.
type Deck = {
  id: number;
  name: string;
  createdAt: string;
  _count: { cards: number };
};

export default function DecksPage() {
  // decks: 화면에 보여줄 단어장 전체 목록입니다.
  const [decks, setDecks] = useState<Deck[]>([]);

  // isLoading: 서버에서 단어장 목록을 아직 가져오는 중인지 기억하는 값입니다.
  const [isLoading, setIsLoading] = useState(true);

  // 컴포넌트가 화면에 처음 나타난 직후 단어장 목록을 불러옵니다.
  useEffect(() => {
    fetch("/api/decks")
      .then((res) => res.json())
      .then((data: Deck[]) => {
        setDecks(data);
      })
      .catch((error) => {
        console.error("단어장을 불러오지 못했습니다.", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 p-8">
      <h1 className="text-xl font-bold">단어장 목록</h1>

      <Link href="/decks/manage" className="text-sm text-zinc-500 hover:underline">
        단어장 관리
      </Link>

      <ul className="flex w-full max-w-xs flex-col gap-2">
        {decks.map((deck) => (
          <li key={deck.id}>
            <Link
              href={`/decks/${deck.id}`}
              className="flex items-center justify-between gap-2 rounded border px-4 py-2 hover:bg-zinc-50"
            >
              <span>{deck.name}</span>
              <span className="text-sm text-zinc-500">
                카드 {deck._count.cards}개
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
