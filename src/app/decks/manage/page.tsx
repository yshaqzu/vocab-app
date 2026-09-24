"use client"; // useState를 쓰기 위해 브라우저에서 실행되는 컴포넌트로 표시합니다.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";

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

  // errorMessage: 이름 수정/삭제가 실패했을 때 보여줄 경고 문구입니다.
  const [errorMessage, setErrorMessage] = useState("");

  // editingDeckId: 지금 이름 수정 중인 단어장의 id입니다. null이면 아무것도 수정 중이 아닙니다.
  const [editingDeckId, setEditingDeckId] = useState<number | null>(null);
  // editDeckName: 수정 입력칸에 입력 중인 이름입니다. "취소"를 누르면 버려집니다.
  const [editDeckName, setEditDeckName] = useState("");

  // draggingId: 지금 드래그로 옮기는 중인 단어장의 id입니다. null이면 드래그 중이 아닙니다.
  const [draggingId, setDraggingId] = useState<number | null>(null);
  // preDragDecksRef: 드래그를 시작한 순간의 순서입니다. 저장이 실패하면 이 순서로 되돌립니다.
  const preDragDecksRef = useRef<Deck[]>([]);
  // lastEnteredIdRef: 마지막으로 자리를 바꿔준 항목의 id입니다.
  // 자리를 바꾼 직후 그 항목이 애니메이션으로 커서 아래를 지나가면서 dragenter가 또 불려
  // 두 항목이 계속 왔다 갔다 하는 것을 막습니다.
  const lastEnteredIdRef = useRef<number | null>(null);
  // emptyDragImageRef: 브라우저 기본 드래그 고스트 대신 쓸 투명한 1x1 이미지입니다.
  // 드래그 시작 순간에 만들면 아직 로드가 안 돼서 기본 고스트가 그대로 뜰 수 있으므로 미리 만들어 둡니다.
  const emptyDragImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new Image();
    image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    emptyDragImageRef.current = image;
  }, []);

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

  // 드래그 중인 단어장이 다른 단어장(targetId) 위로 들어오면, 그 자리로 바로 옮겨 화면에만 반영합니다.
  // 서버 저장은 드래그가 끝날 때(handleDragEndDeck) 한 번만 합니다.
  function handleDragEnterDeck(targetId: number) {
    if (draggingId === null) return;
    if (draggingId === targetId) {
      // 커서가 드래그 중인 항목 위로 돌아왔으니, 다음에 들어가는 항목과는 다시 자리를 바꿀 수 있습니다.
      lastEnteredIdRef.current = null;
      return;
    }
    if (lastEnteredIdRef.current === targetId) return;

    const fromIndex = decks.findIndex((d) => d.id === draggingId);
    const toIndex = decks.findIndex((d) => d.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...decks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    lastEnteredIdRef.current = targetId;
    setDecks(reordered);
  }

  // 드래그가 끝나면(놓았든, 바깥에 놓아 취소됐든) 지금 화면 순서를 POST /api/decks/reorder로 저장합니다.
  // 저장이 실패하면 드래그를 시작하기 전 순서로 되돌립니다.
  async function handleDragEndDeck() {
    setDraggingId(null);
    lastEnteredIdRef.current = null;

    const previousDecks = preDragDecksRef.current;
    const isUnchanged =
      previousDecks.length === decks.length &&
      previousDecks.every((d, i) => d.id === decks[i].id);
    if (isUnchanged) return;

    try {
      const response = await fetch("/api/decks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: decks.map((d) => d.id) }),
      });

      if (!response.ok) {
        setDecks(previousDecks);
        setErrorMessage("단어장 순서를 저장하지 못했습니다. 다시 시도해주세요.");
        return;
      }

      setErrorMessage("");
    } catch (error) {
      console.error("단어장 순서를 저장하지 못했습니다.", error);
      setDecks(previousDecks);
      setErrorMessage("단어장 순서를 저장하지 못했습니다. 다시 시도해주세요.");
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

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      <Link
        href="/decks/manage/new"
        className="rounded border px-4 py-2"
        aria-label="새 단어장 만들기"
      >
        +
      </Link>

      <ul className="flex w-full max-w-xs flex-col gap-2">
        {decks.map((deck) =>
          editingDeckId === deck.id ? (
            // 이름 수정 모드: 이름 자리가 입력칸으로 바뀌고, 저장/취소 버튼이 뜹니다.
            <motion.li
              key={deck.id}
              layout
              transition={{ duration: 0.2 }}
              draggable={false}
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
            </motion.li>
          ) : (
            // 항목을 꾹 눌러 끌고 다른 항목 위를 지나가면 그 자리로 바로바로 순서가 바뀝니다.
            // motion.li의 layout은 순서가 바뀔 때 항목이 부드럽게 밀려나게 해줍니다.
            // motion은 onDragStart/onDragEnd를 자기 드래그 기능용으로 가로채서 DOM에 넘기지 않으므로,
            // HTML 드래그 앤 드롭 속성과 이벤트는 안쪽 div에 붙입니다.
            <motion.li key={deck.id} layout transition={{ duration: 0.2 }}>
              <div
                draggable={true}
                onDragStart={(e) => {
                  // Firefox는 dataTransfer에 뭔가 넣어야 드래그가 시작됩니다.
                  e.dataTransfer.setData("text/plain", String(deck.id));
                  e.dataTransfer.effectAllowed = "move";

                  // 브라우저가 자동으로 만드는 반투명 드래그 고스트 이미지를 끈다.
                  // 안 그러면 지금 opacity-50으로 반투명해지는 카드와 겹쳐 보여서
                  // 같은 카드가 두 개처럼 보인다. 실시간 재배치로 이미 충분히 피드백을
                  // 주고 있으므로, 커서에 따로 이미지를 붙일 필요가 없다.
                  if (emptyDragImageRef.current) {
                    e.dataTransfer.setDragImage(emptyDragImageRef.current, 0, 0);
                  }

                  preDragDecksRef.current = decks;
                  lastEnteredIdRef.current = null;
                  setDraggingId(deck.id);
                }}
                onDragEnter={() => handleDragEnterDeck(deck.id)}
                onDragOver={(e) => e.preventDefault()}
                // 순서는 dragenter에서 이미 바뀌었으므로, 놓을 때는 기본 동작만 막습니다.
                onDrop={(e) => e.preventDefault()}
                onDragEnd={handleDragEndDeck}
                className={`flex items-center justify-between gap-2 rounded border px-4 py-2 ${
                  draggingId === deck.id ? "opacity-50" : ""
                }`}
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
                  <span className="cursor-grab select-none text-zinc-400" aria-hidden="true">
                    ⠿
                  </span>
                </div>
              </div>
            </motion.li>
          )
        )}
      </ul>
    </div>
  );
}
