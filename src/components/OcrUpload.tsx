"use client"; // 파일 업로드, fetch 호출 등 상호작용이 있는 컴포넌트입니다.

import { useRef, useState } from "react";

// /api/ocr이 돌려주는 카드 후보 하나의 모양입니다(아직 DB에 저장되지 않은 상태).
type OcrCard = {
  particle: string;
  reading: string;
  meaning: string;
  example: string;
  translation: string;
};

// 미리보기 화면에서 카드 후보 하나를 다루기 위해 필요한 값들을 더한 타입입니다.
// key: 목록 렌더링과 수정 대상 식별에 씁니다(id가 아직 없으므로 따로 만듭니다).
// selected: 체크박스로 "저장할지 말지" 고른 상태입니다.
type PreviewCard = OcrCard & { key: number; selected: boolean };

// /api/cards가 저장 후 돌려주는 카드 하나의 모양입니다.
type SavedCard = OcrCard & {
  id: number;
  createdAt: string;
  deckId: number;
  mastered: boolean;
};

type OcrUploadProps = {
  deckId: number;
  // 사용자가 미리보기에서 "저장"을 눌러 실제로 저장된 카드들을 부모에게 알립니다.
  onCardsSaved: (cards: SavedCard[]) => void;
};

// 미리보기 카드마다 고유한 key를 붙이기 위한 카운터입니다(모듈 전역이라 컴포넌트가
// 다시 열려도 이전 목록과 key가 겹치지 않습니다).
let nextPreviewKey = 0;

export default function OcrUpload({ deckId, onCardsSaved }: OcrUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // isOpen: 업로드 영역 자체를 보여줄지 말지 기억합니다.
  const [isOpen, setIsOpen] = useState(false);
  // isAnalyzing: 이미지를 Gemini에 보내 분석하는 중인지 기억합니다.
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // isSaving: 선택된 카드들을 서버에 저장하는 중인지 기억합니다.
  const [isSaving, setIsSaving] = useState(false);
  // previewCards: 분석 결과로 받은 카드 후보 목록입니다. 저장 전까지는 이 화면에서만 존재합니다.
  const [previewCards, setPreviewCards] = useState<PreviewCard[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  function handleOpen() {
    setIsOpen(true);
  }

  // 업로드 영역을 닫고 모든 상태를 초기화합니다.
  function handleCancel() {
    setIsOpen(false);
    setPreviewCards([]);
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // 파일을 고르는 즉시 /api/ocr에 업로드해서 분석을 시작합니다.
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setErrorMessage("");
    setPreviewCards([]);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("deckId", String(deckId));

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setErrorMessage(
          data?.error ?? "이미지 분석에 실패했습니다. 다시 시도해주세요."
        );
        return;
      }

      const data: { cards: OcrCard[] } = await response.json();

      if (data.cards.length === 0) {
        setErrorMessage("이미지에서 단어를 찾지 못했어요.");
        return;
      }

      // 모든 후보 카드는 기본적으로 선택된 상태로 미리보기에 보여줍니다.
      setPreviewCards(
        data.cards.map((card) => ({
          ...card,
          key: nextPreviewKey++,
          selected: true,
        }))
      );
    } catch (error) {
      console.error("이미지 분석에 실패했습니다.", error);
      setErrorMessage("이미지 분석에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // 미리보기 카드 하나의 필드 하나를 고칩니다(Gemini가 오인식했을 수 있으므로).
  function handleFieldChange(key: number, field: keyof OcrCard, value: string) {
    setPreviewCards(
      previewCards.map((card) =>
        card.key === key ? { ...card, [field]: value } : card
      )
    );
  }

  // 카드 하나의 체크(저장할지 여부)를 뒤집습니다.
  function handleToggleSelected(key: number) {
    setPreviewCards(
      previewCards.map((card) =>
        card.key === key ? { ...card, selected: !card.selected } : card
      )
    );
  }

  // "저장" 버튼: 체크된 카드만, 기존 /api/cards 엔드포인트를 순서대로 호출해 저장합니다.
  async function handleSave() {
    const selectedCards = previewCards.filter((card) => card.selected);

    if (selectedCards.length === 0) {
      setErrorMessage("저장할 카드를 하나 이상 선택해주세요.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const savedCards: SavedCard[] = [];

      for (const card of selectedCards) {
        const response = await fetch("/api/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            particle: card.particle,
            reading: card.reading,
            meaning: card.meaning,
            example: card.example,
            translation: card.translation,
            deckId,
          }),
        });

        if (!response.ok) {
          setErrorMessage("일부 카드를 저장하지 못했습니다. 다시 시도해주세요.");
          return;
        }

        savedCards.push(await response.json());
      }

      onCardsSaved(savedCards);
      handleCancel();
    } catch (error) {
      console.error("카드를 저장하지 못했습니다.", error);
      setErrorMessage("카드를 저장하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <button onClick={handleOpen} className="rounded border px-4 py-2">
        사진으로 카드 추가
      </button>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3 rounded border p-4">
      <p className="text-sm font-bold">사진으로 카드 추가</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={isAnalyzing || isSaving}
      />

      {isAnalyzing && (
        <p className="text-sm text-zinc-500">이미지를 분석하는 중...</p>
      )}

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

      {previewCards.length > 0 && (
        <div className="flex flex-col gap-3">
          {previewCards.map((card) => (
            <div
              key={card.key}
              className="flex flex-col gap-2 rounded border p-3"
            >
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={card.selected}
                  onChange={() => handleToggleSelected(card.key)}
                />
                이 카드 저장
              </label>
              <input
                className="rounded border px-2 py-1"
                placeholder="조사/단어"
                value={card.particle}
                onChange={(e) =>
                  handleFieldChange(card.key, "particle", e.target.value)
                }
              />
              <input
                className="rounded border px-2 py-1"
                placeholder="읽는 법"
                value={card.reading}
                onChange={(e) =>
                  handleFieldChange(card.key, "reading", e.target.value)
                }
              />
              <input
                className="rounded border px-2 py-1"
                placeholder="뜻"
                value={card.meaning}
                onChange={(e) =>
                  handleFieldChange(card.key, "meaning", e.target.value)
                }
              />
              <input
                className="rounded border px-2 py-1"
                placeholder="일본어 예문"
                value={card.example}
                onChange={(e) =>
                  handleFieldChange(card.key, "example", e.target.value)
                }
              />
              <input
                className="rounded border px-2 py-1"
                placeholder="한국어 해석"
                value={card.translation}
                onChange={(e) =>
                  handleFieldChange(card.key, "translation", e.target.value)
                }
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {previewCards.length > 0 && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded border px-4 py-2"
          >
            저장
          </button>
        )}
        <button onClick={handleCancel} className="rounded border px-4 py-2">
          취소
        </button>
      </div>
    </div>
  );
}
