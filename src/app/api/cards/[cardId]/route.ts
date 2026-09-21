import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/cards/5: 카드 하나의 일부 필드만 바꿉니다.
// 지금은 mastered(외웠는지 여부)만 바꿀 수 있게 해뒀습니다.
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext<"/api/cards/[cardId]">
) {
  const { cardId } = await params;
  const body = await request.json();

  if (typeof body.mastered !== "boolean") {
    return NextResponse.json(
      { error: "mastered 값(true/false)이 필요합니다." },
      { status: 400 }
    );
  }

  const card = await prisma.card.update({
    where: { id: Number(cardId) },
    data: { mastered: body.mastered },
  });

  return NextResponse.json(card);
}
