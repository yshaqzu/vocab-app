import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cards?deckId=1: 지정한 단어장에 속한 카드를 모두 가져옵니다.
export async function GET(request: NextRequest) {
  const deckId = Number(request.nextUrl.searchParams.get("deckId"));

  if (!deckId) {
    return NextResponse.json(
      { error: "deckId 쿼리 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  const cards = await prisma.card.findMany({
    where: { deckId },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(cards);
}

// POST /api/cards: 요청 body로 받은 카드 하나를, 같은 body의 deckId가 가리키는
// 단어장에 새로 저장합니다.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { particle, reading, meaning, example, translation, deckId } = body;

  const fields = { particle, reading, meaning, example, translation };
  const isAnyFieldInvalid = Object.values(fields).some(
    (value) => typeof value !== "string" || value.trim() === ""
  );

  if (isAnyFieldInvalid || typeof deckId !== "number") {
    return NextResponse.json(
      { error: "모든 칸을 채워주세요." },
      { status: 400 }
    );
  }

  const card = await prisma.card.create({ data: { ...fields, deckId } });

  return NextResponse.json(card, { status: 201 });
}
