import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

// 무료 등급이면서 이미지 입력을 지원하는 Flash 계열의 안정 버전(프리뷰 아님).
// https://ai.google.dev/gemini-api/docs/models 에서 확인.
const GEMINI_MODEL = "gemini-3.8-flash";

const PROMPT = `이미지에 나온 일본어 단어/조사를 모두 찾아서 학습 카드로 만들어줘.
각 항목마다 다음 필드를 채워줘:
- particle: 이미지에 나온 단어/조사 원문 그대로
- reading: 읽는 법(히라가나). 이미 히라가나/가타카나인 단어는 그대로 적어줘.
- meaning: 한국어 뜻
- example: 그 단어가 들어간 새로운 일본어 예문 (이미지에 없던 문장을 새로 만들어줘)
- translation: 그 예문의 한국어 번역

이미지에서 아무 단어도 찾지 못하면 빈 배열을 반환해.`;

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      particle: { type: Type.STRING },
      reading: { type: Type.STRING },
      meaning: { type: Type.STRING },
      example: { type: Type.STRING },
      translation: { type: Type.STRING },
    },
    required: ["particle", "reading", "meaning", "example", "translation"],
    propertyOrdering: [
      "particle",
      "reading",
      "meaning",
      "example",
      "translation",
    ],
  },
};

// POST /api/ocr: 이미지를 Gemini에 보내 단어 카드 후보를 추출합니다.
// DB에는 저장하지 않고, 추출 결과만 돌려줍니다(저장은 /api/cards를 따로 호출).
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const image = formData.get("image");
  const deckId = Number(formData.get("deckId"));

  if (!(image instanceof File)) {
    return NextResponse.json(
      { error: "이미지 파일이 필요합니다." },
      { status: 400 }
    );
  }

  if (!deckId) {
    return NextResponse.json(
      { error: "deckId가 필요합니다." },
      { status: 400 }
    );
  }

  const imageBytes = Buffer.from(await image.arrayBuffer());
  const base64Image = imageBytes.toString("base64");

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  let responseText: string | undefined;
  try {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        { text: PROMPT },
        {
          inlineData: {
            mimeType: image.type || "image/jpeg",
            data: base64Image,
          },
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
      },
    });
    responseText = result.text;
  } catch (error) {
    console.error("Gemini 이미지 인식에 실패했습니다.", error);
    return NextResponse.json(
      { error: "이미지 분석에 실패했습니다. 다시 시도해주세요." },
      { status: 502 }
    );
  }

  if (!responseText) {
    return NextResponse.json(
      { error: "이미지에서 단어를 찾지 못했습니다." },
      { status: 422 }
    );
  }

  try {
    const cards = JSON.parse(responseText);
    return NextResponse.json({ cards });
  } catch (error) {
    console.error("Gemini 응답을 파싱하지 못했습니다.", error, responseText);
    return NextResponse.json(
      { error: "인식 결과를 처리하지 못했습니다." },
      { status: 502 }
    );
  }
}
