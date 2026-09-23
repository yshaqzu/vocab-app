"use client"; // useState를 쓰기 위해 브라우저에서 실행되는 컴포넌트로 표시합니다.

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import CardFieldsForm, {
  type CardFieldValues,
} from "@/components/CardFieldsForm";
import OcrUpload from "@/components/OcrUpload";

// 폼 입력칸이 비어있을 때 쓸 초기값입니다.
const emptyForm: CardFieldValues = {
  particle: "",
  reading: "",
  meaning: "",
  example: "",
  translation: "",
};

export default function NewCardPage() {
  // URL이 /decks/3/manage/new면 params.deckId는 문자열 "3"입니다.
  const params = useParams<{ deckId: string }>();
  const deckId = Number(params.deckId);
  const router = useRouter();

  // formValues: 직접 입력 폼의 입력칸 값입니다.
  const [formValues, setFormValues] = useState<CardFieldValues>(emptyForm);
  const [errorMessage, setErrorMessage] = useState("");

  function handleFieldChange(field: keyof CardFieldValues, value: string) {
    setFormValues({ ...formValues, [field]: value });
  }

  // "추가" 버튼을 눌렀을 때 실행됩니다.
  async function handleAddCard() {
    const isAnyFieldEmpty = Object.values(formValues).some(
      (value) => value.trim() === ""
    );
    if (isAnyFieldEmpty) {
      setErrorMessage("모든 칸을 채워주세요.");
      return;
    }

    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formValues, deckId }),
      });

      if (!response.ok) {
        setErrorMessage("카드를 저장하지 못했습니다. 다시 시도해주세요.");
        return;
      }

      router.push(`/decks/${deckId}/manage`);
    } catch (error) {
      console.error("카드를 저장하지 못했습니다.", error);
      setErrorMessage("카드를 저장하지 못했습니다. 다시 시도해주세요.");
    }
  }

  // 사진으로 추가한 카드들이 저장되고 나면 OcrUpload가 이 함수를 호출합니다.
  // 서버가 이미 저장을 끝낸 카드들이므로, 카드 관리 화면으로 돌아가기만 하면 됩니다.
  function handleOcrCardsSaved() {
    router.push(`/decks/${deckId}/manage`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 p-8">
      <Link
        href={`/decks/${deckId}/manage`}
        className="self-start text-sm text-zinc-500 hover:underline"
      >
        ← 카드 관리
      </Link>

      <h1 className="text-xl font-bold">새 카드 추가</h1>

      <div className="flex w-full max-w-xs flex-col gap-2 rounded border p-4">
        <CardFieldsForm values={formValues} onChange={handleFieldChange} />

        {errorMessage && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}

        <button onClick={handleAddCard} className="rounded border px-4 py-2">
          추가
        </button>
      </div>

      <OcrUpload deckId={deckId} onCardsSaved={handleOcrCardsSaved} />
    </div>
  );
}
