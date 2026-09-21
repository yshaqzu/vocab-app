import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/decks: 모든 단어장을, 각 단어장에 카드가 몇 개 있는지와 함께 가져옵니다.
export async function GET() {
  const decks = await prisma.deck.findMany({
    orderBy: { id: "asc" },
    include: {
      _count: { select: { cards: true } },
    },
  });
  return NextResponse.json(decks);
}

// POST /api/decks: 요청 body의 이름으로 새 단어장을 만듭니다.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;

  if (typeof name !== "string" || name.trim() === "") {
    return NextResponse.json(
      { error: "단어장 이름을 입력해주세요." },
      { status: 400 }
    );
  }

  const deck = await prisma.deck.create({ data: { name } });

  return NextResponse.json(deck, { status: 201 });
}
