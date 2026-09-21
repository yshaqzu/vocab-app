import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/decks/1/reset: 이 단어장에 속한 모든 카드의 mastered를
// 한꺼번에 false로 되돌립니다("처음부터 다시 복습하기" 버튼이 호출합니다).
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/decks/[deckId]/reset">
) {
  const { deckId } = await params;

  await prisma.card.updateMany({
    where: { deckId: Number(deckId) },
    data: { mastered: false },
  });

  return NextResponse.json({ ok: true });
}
