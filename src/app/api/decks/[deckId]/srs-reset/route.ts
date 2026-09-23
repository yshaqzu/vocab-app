import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/decks/1/srs-reset: 이 단어장에 속한 모든 카드의 SM-2 진행 상태를
// 새 카드와 같은 기본값으로 되돌립니다("SM-2 진행 초기화" 버튼이 호출합니다).
// 라운드 모드에서 쓰는 mastered는 건드리지 않습니다.
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/decks/[deckId]/srs-reset">
) {
  const { deckId } = await params;

  const { count } = await prisma.card.updateMany({
    where: { deckId: Number(deckId) },
    data: {
      srsRepetitions: 0,
      srsInterval: 0,
      srsEaseFactor: 2.5,
      srsDueDate: new Date(),
    },
  });

  return NextResponse.json({ count });
}
