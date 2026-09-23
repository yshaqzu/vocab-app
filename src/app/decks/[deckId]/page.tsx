"use client"; // useEffect/useState를 쓰기 위해 브라우저에서 실행되는 컴포넌트로 표시합니다.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// /api/decks가 돌려주는 단어장 하나의 모양입니다. 여기서는 이름만 필요합니다.
type Deck = {
  id: number;
  name: string;
};

// 학습 모드 선택 화면입니다. 라운드 모드(/round)와 SM-2 모드(/srs) 중 하나를 골라
// 실제 학습 화면으로 들어갑니다.
export default function DeckModeSelectPage() {
  const params = useParams<{ deckId: string }>();
  const deckId = Number(params.deckId);

  const [deckName, setDeckName] = useState("");

  useEffect(() => {
    fetch("/api/decks")
      .then((res) => res.json())
      .then((decks: Deck[]) => {
        const deck = decks.find((d) => d.id === deckId);
        setDeckName(deck ? deck.name : "");
      })
      .catch((error) => {
        console.error("단어장 정보를 불러오지 못했습니다.", error);
      });
  }, [deckId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <Link href="/decks" className="hover:underline">
          ← 단어장 목록
        </Link>
        <Link href={`/decks/${deckId}/manage`} className="hover:underline">
          카드 관리
        </Link>
      </div>

      <h1 className="text-xl font-bold">{deckName}</h1>

      <div className="flex flex-col gap-3">
        <Link
          href={`/decks/${deckId}/round`}
          className="rounded border px-4 py-2 text-center"
        >
          라운드 모드로 학습
        </Link>
        <Link
          href={`/decks/${deckId}/srs`}
          className="rounded border px-4 py-2 text-center"
        >
          SM-2 모드로 학습
        </Link>
      </div>
    </div>
  );
}
