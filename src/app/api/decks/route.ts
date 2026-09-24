import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/decks: 모든 단어장을, 각 단어장에 카드가 몇 개 있는지와 함께 가져옵니다.
// 관리 화면에서 드래그로 정한 order 순서대로 정렬하고, order가 같으면(마이그레이션
// 직후처럼 전부 0일 때) 만든 순서(id)대로 정렬합니다.
export async function GET() {
  const decks = await prisma.deck.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
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

  // 새 단어장은 항상 맨 뒤에 오도록 "지금 가장 큰 order + 1"을 넣습니다.
  const { _max } = await prisma.deck.aggregate({ _max: { order: true } });
  const order = (_max.order ?? -1) + 1;

  const deck = await prisma.deck.create({ data: { name, order } });

  return NextResponse.json(deck, { status: 201 });
}
