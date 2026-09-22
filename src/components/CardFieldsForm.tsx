// 카드 하나에 필요한 5개 입력칸(조사/단어, 읽는 법, 뜻, 예문, 해석)을 묶어놓은 값 타입입니다.
// "새 카드 추가" 폼과 "카드 수정" 폼이 생김새가 똑같아서 공용으로 씁니다.
export type CardFieldValues = {
  particle: string;
  reading: string;
  meaning: string;
  example: string;
  translation: string;
};

type CardFieldsFormProps = {
  values: CardFieldValues;
  onChange: (field: keyof CardFieldValues, value: string) => void;
};

export default function CardFieldsForm({
  values,
  onChange,
}: CardFieldsFormProps) {
  return (
    <>
      <input
        className="rounded border px-2 py-1"
        placeholder="조사/단어 (예: と)"
        value={values.particle}
        onChange={(e) => onChange("particle", e.target.value)}
      />
      <input
        className="rounded border px-2 py-1"
        placeholder="읽는 법 (예: と)"
        value={values.reading}
        onChange={(e) => onChange("reading", e.target.value)}
      />
      <input
        className="rounded border px-2 py-1"
        placeholder="뜻"
        value={values.meaning}
        onChange={(e) => onChange("meaning", e.target.value)}
      />
      <input
        className="rounded border px-2 py-1"
        placeholder="일본어 예문"
        value={values.example}
        onChange={(e) => onChange("example", e.target.value)}
      />
      <input
        className="rounded border px-2 py-1"
        placeholder="한국어 해석"
        value={values.translation}
        onChange={(e) => onChange("translation", e.target.value)}
      />
    </>
  );
}
