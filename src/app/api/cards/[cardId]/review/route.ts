import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

// POST /api/cards/5/review: SM-2 모드에서 카드 하나를 채점합니다.
// body { correct: boolean }을 받아서, SM-2 알고리즘(맞혔어요/몰랐어요 2단계로 단순화한 버전)으로
// 다음 복습 일정(srsRepetitions/srsInterval/srsEaseFactor/srsDueDate)을 계산해 저장합니다.
export async function POST(
  request: NextRequest,
  { params }: RouteContext<"/api/cards/[cardId]/review">
) {
  const { cardId } = await params;
  const body = await request.json();

  if (typeof body.correct !== "boolean") {
    return NextResponse.json(
      { error: "correct 값(true/false)이 필요합니다." },
      { status: 400 }
    );
  }

  const card = await prisma.card.findUnique({
    where: { id: Number(cardId) },
  });

  if (!card) {
    return NextResponse.json(
      { error: "카드를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  let repetitions: number;
  let interval: number;
  let easeFactor: number;

  if (body.correct) {
    // 맞혔어요: 연속으로 맞힌 횟수를 늘리고, 그만큼 다음 복습을 더 뒤로 미룹니다.
    repetitions = card.srsRepetitions + 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(card.srsInterval * card.srsEaseFactor);
    }
    easeFactor = Math.min(MAX_EASE_FACTOR, card.srsEaseFactor + 0.1);
  } else {
    // 몰랐어요: 처음부터 다시 쌓고, 내일 다시 보여주며, 이 카드를 조금 더 어렵게 취급합니다.
    repetitions = 0;
    interval = 1;
    easeFactor = Math.max(MIN_EASE_FACTOR, card.srsEaseFactor - 0.2);
  }

  const updated = await prisma.card.update({
    where: { id: card.id },
    data: {
      srsRepetitions: repetitions,
      srsInterval: interval,
      srsEaseFactor: easeFactor,
      srsDueDate: new Date(Date.now() + interval * DAY_MS),
    },
  });

  return NextResponse.json(updated);
}
