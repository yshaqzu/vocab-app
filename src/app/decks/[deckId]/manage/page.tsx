"use client"; // useState를 쓰기 위해 브라우저에서 실행되는 컴포넌트로 표시합니다.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import CardFieldsForm, {
  type CardFieldValues,
} from "@/components/CardFieldsForm";

// /api/cards가 돌려주는 카드 하나의 모양입니다.
type Card = {
  id: number;
  particle: string;
  reading: string;
  meaning: string;
  example: string;
  translation: string;
  createdAt: string;
  deckId: number;
  mastered: boolean;
};

// /api/decks가 돌려주는 단어장 하나의 모양입니다. 여기서는 이름만 필요합니다.
type Deck = {
  id: number;
  name: string;
};

export default function ManageCardsPage() {
  // URL이 /decks/3/manage면 params.deckId는 문자열 "3"입니다.
  const params = useParams<{ deckId: string }>();
  const deckId = Number(params.deckId);

  const [deckName, setDeckName] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // editingCardId: 지금 수정 폼으로 바뀌어 있는 카드의 id입니다. null이면 아무 카드도 수정 중이 아닙니다.
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  // editValues: 수정 폼에 입력 중인 값입니다. "취소"를 누르면 이 값은 버려지고 원래 카드 값이 그대로 남습니다.
  const [editValues, setEditValues] = useState<CardFieldValues | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/decks")
        .then((res) => res.json())
        .then((decks: Deck[]) => {
          const deck = decks.find((d) => d.id === deckId);
          setDeckName(deck ? deck.name : "");
        }),
      fetch(`/api/cards?deckId=${deckId}`)
        .then((res) => res.json())
        .then((data: Card[]) => {
          setCards(data);
        }),
    ])
      .catch((error) => {
        console.error("단어장 정보를 불러오지 못했습니다.", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [deckId]);

  // "수정" 버튼: 이 카드를 수정 모드로 바꾸고, 지금 값으로 수정 폼을 채웁니다.
  function handleStartEdit(card: Card) {
    setEditingCardId(card.id);
    setEditValues({
      particle: card.particle,
      reading: card.reading,
      meaning: card.meaning,
      example: card.example,
      translation: card.translation,
    });
    setErrorMessage("");
  }

  // "취소" 버튼: 수정하던 내용을 버리고 원래 값으로 되돌립니다(서버에는 아무것도 보내지 않습니다).
  function handleCancelEdit() {
    setEditingCardId(null);
    setEditValues(null);
    setErrorMessage("");
  }

  function handleEditFieldChange(field: keyof CardFieldValues, value: string) {
    if (!editValues) return;
    setEditValues({ ...editValues, [field]: value });
  }

  // "저장" 버튼: 수정한 값을 PATCH /api/cards/{id}로 서버에 반영합니다.
  async function handleSaveEdit(cardId: number) {
    if (!editValues) return;

    const isAnyFieldEmpty = Object.values(editValues).some(
      (value) => value.trim() === ""
    );
    if (isAnyFieldEmpty) {
      setErrorMessage("모든 칸을 채워주세요.");
      return;
    }

    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });

      if (!response.ok) {
        setErrorMessage("카드를 수정하지 못했습니다. 다시 시도해주세요.");
        return;
      }

      const updatedCard: Card = await response.json();
      setCards(
        cards.map((card) => (card.id === cardId ? updatedCard : card))
      );
      setEditingCardId(null);
      setEditValues(null);
      setErrorMessage("");
    } catch (error) {
      console.error("카드를 수정하지 못했습니다.", error);
      setErrorMessage("카드를 수정하지 못했습니다. 다시 시도해주세요.");
    }
  }

  // "삭제" 버튼: 한 번 더 확인한 뒤 DELETE /api/cards/{id}를 호출합니다.
  async function handleDelete(card: Card) {
    const isConfirmed = window.confirm(
      `"${card.particle}" 카드를 삭제하시겠어요? 되돌릴 수 없습니다.`
    );
    if (!isConfirmed) return;

    try {
      const response = await fetch(`/api/cards/${card.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setErrorMessage("카드를 삭제하지 못했습니다. 다시 시도해주세요.");
        return;
      }

      setCards(cards.filter((c) => c.id !== card.id));
      if (editingCardId === card.id) {
        setEditingCardId(null);
        setEditValues(null);
      }
    } catch (error) {
      console.error("카드를 삭제하지 못했습니다.", error);
      setErrorMessage("카드를 삭제하지 못했습니다. 다시 시도해주세요.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 p-8">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <Link href="/decks" className="hover:underline">
          ← 단어장 목록
        </Link>
        <Link href={`/decks/${deckId}`} className="hover:underline">
          학습하기
        </Link>
      </div>

      <h1 className="text-xl font-bold">{deckName} 카드 관리</h1>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <Link
        href={`/decks/${deckId}/manage/new`}
        className="rounded border px-4 py-2"
        aria-label="새 카드 추가"
      >
        +
      </Link>

      {cards.length === 0 ? (
        <p className="text-sm text-zinc-500">아직 카드가 없어요.</p>
      ) : (
        <ul className="flex w-full max-w-md flex-col gap-3">
          {cards.map((card) => (
            <li key={card.id} className="rounded border p-4">
              {editingCardId === card.id && editValues ? (
                // 수정 모드: "새 카드 추가"와 같은 입력 폼을 보여줍니다.
                <div className="flex flex-col gap-2">
                  <CardFieldsForm
                    values={editValues}
                    onChange={handleEditFieldChange}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(card.id)}
                      className="rounded border px-4 py-2"
                    >
                      저장
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="rounded border px-4 py-2"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                // 보기 모드: 카드 내용과 "수정"/"삭제" 버튼을 보여줍니다.
                <div className="flex flex-col gap-1">
                  <p className="font-bold">
                    {card.particle}
                    <span className="ml-2 text-sm font-normal text-zinc-500">
                      {card.reading}
                    </span>
                  </p>
                  <p className="text-sm">{card.meaning}</p>
                  <p className="text-sm text-zinc-500">{card.example}</p>
                  <p className="text-sm text-zinc-500">{card.translation}</p>

                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleStartEdit(card)}
                      className="rounded border px-4 py-2"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(card)}
                      className="rounded border px-4 py-2"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
