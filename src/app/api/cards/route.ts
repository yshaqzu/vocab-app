import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cards: 데이터베이스에 저장된 모든 카드를 가져옵니다.
export async function GET() {
  const cards = await prisma.card.findMany({
    orderBy: { id: "asc" },
  });
  return NextResponse.json(cards);
}

// POST /api/cards: 요청 body로 받은 카드 하나를 데이터베이스에 새로 저장합니다.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { particle, meaning, example, translation } = body;

  const fields = { particle, meaning, example, translation };
  const isAnyFieldInvalid = Object.values(fields).some(
    (value) => typeof value !== "string" || value.trim() === ""
  );

  if (isAnyFieldInvalid) {
    return NextResponse.json(
      { error: "모든 칸을 채워주세요." },
      { status: 400 }
    );
  }

  const card = await prisma.card.create({ data: fields });

  return NextResponse.json(card, { status: 201 });
}
