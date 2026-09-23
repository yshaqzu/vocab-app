"use client"; // useState를 쓰기 위해 브라우저에서 실행되는 컴포넌트로 표시합니다.

import { useEffect, useState } from "react";
import Link from "next/link";

// /api/decks가 돌려주는 단어장 하나의 모양입니다.
// _count.cards는 Prisma가 "이 단어장에 딸린 카드가 몇 개인지" 함께 세어서 주는 값입니다.
type Deck = {
  id: number;
  name: string;
  createdAt: string;
  _count: { cards: number };
};

export default function ManageDecksPage() {
  // decks: 화면에 보여줄 단어장 전체 목록입니다.
  const [decks, setDecks] = useState<Deck[]>([]);

  // isLoading: 서버에서 단어장 목록을 아직 가져오는 중인지 기억하는 값입니다.
  const [isLoading, setIsLoading] = useState(true);

  // newDeckName: "새 단어장 만들기" 입력칸의 값입니다.
  const [newDeckName, setNewDeckName] = useState("");

  // errorMessage: 단어장 만들기가 실패했을 때 보여줄 경고 문구입니다.
  const [errorMessage, setErrorMessage] = useState("");

  // editingDeckId: 지금 이름 수정 중인 단어장의 id입니다. null이면 아무것도 수정 중이 아닙니다.
  const [editingDeckId, setEditingDeckId] = useState<number | null>(null);
  // editDeckName: 수정 입력칸에 입력 중인 이름입니다. "취소"를 누르면 버려집니다.
  const [editDeckName, setEditDeckName] = useState("");

  // 컴포넌트가 화면에 처음 나타난 직후 단어장 목록을 불러옵니다.
  useEffect(() => {
    fetch("/api/decks")
      .then((res) => res.json())
      .then((data: Deck[]) => {
        setDecks(data);
      })
      .catch((error) => {
        console.error("단어장을 불러오지 못했습니다.", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // "만들기" 버튼을 눌렀을 때 실행됩니다.
  async function handleCreateDeck() {
    if (newDeckName.trim() === "") {
      setErrorMessage("단어장 이름을 입력해주세요.");
      return;
    }

    try {
      const response = await fetch("/api/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeckName }),
      });

      if (!response.ok) {
        setErrorMessage("단어장을 만들지 못했습니다. 다시 시도해주세요.");
        return;
      }

      const newDeck: Deck = await response.json();
      // 새로 만든 단어장은 카드가 0개이니, _count를 직접 채워서 목록에 추가합니다.
      setDecks([...decks, { ...newDeck, _count: { cards: 0 } }]);
      setNewDeckName("");
      setErrorMessage("");
    } catch (error) {
      console.error("단어장을 만들지 못했습니다.", error);
      setErrorMessage("단어장을 만들지 못했습니다. 다시 시도해주세요.");
    }
  }

  // "수정" 버튼: 이 단어장을 이름 수정 모드로 바꿉니다.
  function handleStartEditDeck(deck: Deck) {
    setEditingDeckId(deck.id);
    setEditDeckName(deck.name);
    setErrorMessage("");
  }

  // "취소" 버튼: 수정하던 이름을 버리고 원래 이름으로 되돌립니다.
  function handleCancelEditDeck() {
    setEditingDeckId(null);
    setEditDeckName("");
  }

  // "저장" 버튼: 수정한 이름을 PATCH /api/decks/{id}로 서버에 반영합니다.
  async function handleSaveEditDeck(deckId: number) {
    if (editDeckName.trim() === "") {
      setErrorMessage("단어장 이름을 입력해주세요.");
      return;
    }

    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editDeckName }),
      });

      if (!response.ok) {
        setErrorMessage("단어장 이름을 바꾸지 못했습니다. 다시 시도해주세요.");
        return;
      }

      const updatedDeck: { name: string } = await response.json();
      // PATCH 응답에는 _count가 없으므로, 카드 개수는 그대로 두고 이름만 바꿔치기합니다.
      setDecks(
        decks.map((deck) =>
          deck.id === deckId ? { ...deck, name: updatedDeck.name } : deck
        )
      );
      setEditingDeckId(null);
      setEditDeckName("");
      setErrorMessage("");
    } catch (error) {
      console.error("단어장 이름을 바꾸지 못했습니다.", error);
      setErrorMessage("단어장 이름을 바꾸지 못했습니다. 다시 시도해주세요.");
    }
  }

  // "삭제" 버튼: 한 번 더 확인한 뒤 DELETE /api/decks/{id}를 호출합니다.
  // 이 단어장 안의 카드도 서버(DB의 cascade 삭제)에서 함께 지워집니다.
  async function handleDeleteDeck(deck: Deck) {
    const isConfirmed = window.confirm(
      `"${deck.name}" 단어장을 삭제하시겠어요? 안의 카드도 모두 삭제됩니다.`
    );
    if (!isConfirmed) return;

    try {
      const response = await fetch(`/api/decks/${deck.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setErrorMessage("단어장을 삭제하지 못했습니다. 다시 시도해주세요.");
        return;
      }

      setDecks(decks.filter((d) => d.id !== deck.id));
    } catch (error) {
      console.error("단어장을 삭제하지 못했습니다.", error);
      setErrorMessage("단어장을 삭제하지 못했습니다. 다시 시도해주세요.");
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
      <Link href="/decks" className="self-start text-sm text-zinc-500 hover:underline">
        ← 둘러보기
      </Link>

      <h1 className="text-xl font-bold">단어장 관리</h1>

      <ul className="flex w-full max-w-xs flex-col gap-2">
        {decks.map((deck) =>
          editingDeckId === deck.id ? (
            // 이름 수정 모드: 이름 자리가 입력칸으로 바뀌고, 저장/취소 버튼이 뜹니다.
            <li
              key={deck.id}
              className="flex items-center gap-2 rounded border px-4 py-2"
            >
              <input
                className="min-w-0 flex-1 rounded border px-2 py-1"
                value={editDeckName}
                onChange={(e) => setEditDeckName(e.target.value)}
              />
              <button
                onClick={() => handleSaveEditDeck(deck.id)}
                className="rounded border px-2 py-1 text-sm"
              >
                저장
              </button>
              <button
                onClick={handleCancelEditDeck}
                className="rounded border px-2 py-1 text-sm"
              >
                취소
              </button>
            </li>
          ) : (
            <li
              key={deck.id}
              className="flex items-center justify-between gap-2 rounded border px-4 py-2"
            >
              <span>{deck.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">
                  카드 {deck._count.cards}개
                </span>
                <button
                  onClick={() => handleStartEditDeck(deck)}
                  className="rounded border px-2 py-1 text-sm"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDeleteDeck(deck)}
                  className="rounded border px-2 py-1 text-sm"
                >
                  삭제
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      <div className="flex w-full max-w-xs flex-col gap-2 rounded border p-4">
        <input
          className="rounded border px-2 py-1"
          placeholder="새 단어장 이름"
          value={newDeckName}
          onChange={(e) => setNewDeckName(e.target.value)}
        />

        {errorMessage && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}

        <button onClick={handleCreateDeck} className="rounded border px-4 py-2">
          만들기
        </button>
      </div>
    </div>
  );
}
