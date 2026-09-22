import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  GoogleGenAI,
  Type,
  type GenerateContentParameters,
} from "@google/genai";

// 무료 등급이면서 이미지 입력을 지원하는 Flash 계열의 안정 버전(프리뷰 아님).
// https://ai.google.dev/gemini-api/docs/models 에서 확인.
const PRIMARY_MODEL = "gemini-3.8-flash";
// 주 모델이 재시도 끝에도 503(과부하)이면 한 번 더 시도해볼 대체 모델입니다.
// gemini-2.5-flash는 이 API 키에서 404("no longer available to new users")로
// 이미 사용이 막혀 있어 대체 모델로 쓸 수 없음을 실제 호출로 확인했습니다.
// Gemini가 404 에러 메시지에서 직접 권장하는 gemini-3.6-flash를 대신 씁니다.
const FALLBACK_MODEL = "gemini-3.6-flash";

// 503(UNAVAILABLE, 일시적인 과부하)일 때만 재시도합니다. 최대 재시도 횟수입니다
// (재시도가 아닌 첫 시도까지 포함하면 모델 하나당 최대 요청 횟수는 이 값 + 1입니다).
const MAX_RETRIES = 2;
const RETRY_DELAY_RANGE_MS: [number, number] = [1000, 2000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isUnavailableError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 503;
}

// 지정한 모델로 Gemini를 호출합니다. 503을 받으면 1~2초 대기 후 재시도합니다.
// 503이 아닌 다른 에러(인증 실패 등)는 재시도하지 않고 바로 던집니다.
async function generateContentWithRetry(
  ai: GoogleGenAI,
  model: string,
  params: Omit<GenerateContentParameters, "model">
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await ai.models.generateContent({ ...params, model });
    } catch (error) {
      if (!isUnavailableError(error) || attempt >= MAX_RETRIES) {
        throw error;
      }
      const [min, max] = RETRY_DELAY_RANGE_MS;
      console.warn(
        `Gemini(${model})가 503을 반환해 재시도합니다. (${attempt + 1}/${MAX_RETRIES})`
      );
      await sleep(min + Math.random() * (max - min));
    }
  }
}

// 주 모델(PRIMARY_MODEL)로 재시도까지 다 해봤는데도 503이면,
// 대체 모델(FALLBACK_MODEL)로 딱 한 번 더 시도합니다.
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, "model">
) {
  try {
    return await generateContentWithRetry(ai, PRIMARY_MODEL, params);
  } catch (error) {
    if (!isUnavailableError(error)) {
      throw error;
    }
    console.warn(
      `Gemini(${PRIMARY_MODEL})가 재시도 끝에도 503이라 ${FALLBACK_MODEL}로 대체합니다.`
    );
    return await ai.models.generateContent({ ...params, model: FALLBACK_MODEL });
  }
}

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
    const result = await generateContentWithFallback(ai, {
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
