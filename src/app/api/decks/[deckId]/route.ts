import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/decks/1: 단어장 이름을 바꿉니다.
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext<"/api/decks/[deckId]">
) {
  const { deckId } = await params;
  const body = await request.json();
  const { name } = body;

  if (typeof name !== "string" || name.trim() === "") {
    return NextResponse.json(
      { error: "단어장 이름을 입력해주세요." },
      { status: 400 }
    );
  }

  const deck = await prisma.deck.update({
    where: { id: Number(deckId) },
    data: { name },
  });

  return NextResponse.json(deck);
}

// DELETE /api/decks/1: 단어장과 그 안의 카드를 전부 삭제합니다.
// Card.deck 관계에 onDelete: Cascade가 걸려 있어 카드는 DB가 알아서 같이 지웁니다.
export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext<"/api/decks/[deckId]">
) {
  const { deckId } = await params;

  await prisma.deck.delete({
    where: { id: Number(deckId) },
  });

  return NextResponse.json({ ok: true });
}
