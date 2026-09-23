"use client"; // useState를 쓰기 위해 브라우저에서 실행되는 컴포넌트로 표시합니다.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewDeckPage() {
  const router = useRouter();

  // newDeckName: 입력칸의 값입니다.
  const [newDeckName, setNewDeckName] = useState("");

  // errorMessage: 단어장 만들기가 실패했을 때 보여줄 경고 문구입니다.
  const [errorMessage, setErrorMessage] = useState("");

  // "생성" 버튼을 눌렀을 때 실행됩니다.
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

      router.push("/decks");
    } catch (error) {
      console.error("단어장을 만들지 못했습니다.", error);
      setErrorMessage("단어장을 만들지 못했습니다. 다시 시도해주세요.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 p-8">
      <Link
        href="/decks/manage"
        className="self-start text-sm text-zinc-500 hover:underline"
      >
        ← 단어장 관리
      </Link>

      <h1 className="text-xl font-bold">새 단어장 만들기</h1>

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
          생성
        </button>
      </div>
    </div>
  );
}
