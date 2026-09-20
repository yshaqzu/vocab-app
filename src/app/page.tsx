"use client"; // useState를 쓰기 위해 브라우저에서 실행되는 컴포넌트로 표시합니다.

import { useState } from "react";
import { particles } from "@/data/particles";
import Flashcard from "@/components/Flashcard";

export default function Home() {
  // currentIndex: 지금 몇 번째 카드를 보고 있는지 기억하는 상태값입니다.
  const [currentIndex, setCurrentIndex] = useState(0);

  // "이전" 버튼: 맨 앞 카드가 아니면 인덱스를 하나 줄입니다.
  function goToPrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  // "다음" 버튼: 맨 뒤 카드가 아니면 인덱스를 하나 늘립니다.
  function goToNext() {
    if (currentIndex < particles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  // 지금 보여줄 카드 데이터를 배열에서 꺼냅니다.
  const currentCard = particles[currentIndex];

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

      {/* 몇 번째 카드인지 보여주는 간단한 표시 */}
      <p className="text-sm text-zinc-500">
        {currentIndex + 1} / {particles.length}
      </p>
    </div>
  );
}
