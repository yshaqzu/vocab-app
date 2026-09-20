// 조사 카드 하나의 모양(타입)을 정의합니다.
export type Particle = {
  particle: string; // 조사 (예: は)
  meaning: string; // 뜻 (한국어 설명)
  example: string; // 일본어 예문
  translation: string; // 예문의 한국어 해석
};

// N3 조사 예시 데이터를 하드코딩한 배열입니다.
export const particles: Particle[] = [
  {
    particle: "は",
    meaning: "~은/는 (주제를 나타냄)",
    example: "私は学生です。",
    translation: "저는 학생입니다.",
  },
  {
    particle: "が",
    meaning: "~이/가 (주어를 나타냄)",
    example: "誰が来ましたか。",
    translation: "누가 왔습니까?",
  },
  {
    particle: "に",
    meaning: "~에/에게 (시간, 장소, 대상)",
    example: "七時に起きます。",
    translation: "7시에 일어납니다.",
  },
  {
    particle: "から",
    meaning: "~부터/~때문에 (시작점, 이유)",
    example: "会議は九時から始まります。",
    translation: "회의는 9시부터 시작됩니다.",
  },
];
