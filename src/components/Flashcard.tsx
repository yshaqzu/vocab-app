"use client"; // 클릭 같은 상호작용이 있는 컴포넌트라서 브라우저에서 실행되어야 함을 표시합니다.

import { useState } from "react";
import type { Particle } from "@/data/particles";

// 부모(page.tsx)로부터 카드 하나의 데이터를 props로 받습니다.
type FlashcardProps = {
  card: Particle;
};

export default function Flashcard({ card }: FlashcardProps) {
  // isRevealed: 뜻/예문을 보여줄지 말지 기억하는 상태값입니다.
  const [isRevealed, setIsRevealed] = useState(false);

  // 클릭할 때마다 true <-> false 로 뒤집습니다.
  function handleClick() {
    setIsRevealed(!isRevealed);
  }

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer rounded border p-6 text-center"
    >
      {/* 조사는 항상 보여줍니다 */}
      <p className="text-2xl font-bold">{card.particle}</p>

      {/* isRevealed가 true일 때만 뜻/예문을 보여줍니다 */}
      {isRevealed && (
        <div className="mt-4 space-y-1 text-sm">
          <p>{card.meaning}</p>
          <p>{card.example}</p>
          <p>{card.translation}</p>
        </div>
      )}
    </div>
  );
}
