import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EDITABLE_TEXT_FIELDS = [
  "particle",
  "reading",
  "meaning",
  "example",
  "translation",
] as const;

type CardUpdateData = Partial<{
  particle: string;
  reading: string;
  meaning: string;
  example: string;
  translation: string;
  mastered: boolean;
}>;

// PATCH /api/cards/5: 카드 하나의 일부 필드만 바꿉니다.
// mastered(외웠는지 여부)와, particle/reading/meaning/example/translation 중
// body에 들어있는 필드만 부분적으로 반영합니다. 빈 문자열은 무시합니다.
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext<"/api/cards/[cardId]">
) {
  const { cardId } = await params;
  const body = await request.json();

  const data: CardUpdateData = {};

  for (const field of EDITABLE_TEXT_FIELDS) {
    const value = body[field];
    if (typeof value === "string" && value.trim() !== "") {
      data[field] = value;
    }
  }

  if (typeof body.mastered === "boolean") {
    data.mastered = body.mastered;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "수정할 내용이 없습니다." },
      { status: 400 }
    );
  }

  const card = await prisma.card.update({
    where: { id: Number(cardId) },
    data,
  });

  return NextResponse.json(card);
}

// DELETE /api/cards/5: 카드 하나를 삭제합니다.
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext<"/api/cards/[cardId]">
) {
  const { cardId } = await params;

  await prisma.card.delete({
    where: { id: Number(cardId) },
  });

  return NextResponse.json({ ok: true });
}
