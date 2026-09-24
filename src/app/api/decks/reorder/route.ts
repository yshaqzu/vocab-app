import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/decks/reorder: body의 orderedIds(원하는 순서대로 나열한 단어장 id 배열)를
// 받아서, 배열의 인덱스를 그대로 각 단어장의 order 값으로 저장합니다.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { orderedIds } = body;

  if (
    !Array.isArray(orderedIds) ||
    !orderedIds.every((id) => Number.isInteger(id))
  ) {
    return NextResponse.json(
      { error: "orderedIds는 단어장 id 배열이어야 합니다." },
      { status: 400 }
    );
  }

  // 전부 한 트랜잭션으로 처리해서, 중간에 실패하면 순서가 반쯤만 바뀌지 않게 합니다.
  await prisma.$transaction(
    orderedIds.map((id: number, index: number) =>
      prisma.deck.update({ where: { id }, data: { order: index } })
    )
  );

  return NextResponse.json({ ok: true });
}
