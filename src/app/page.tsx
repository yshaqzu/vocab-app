import { redirect } from "next/navigation";

// 카드는 이제 항상 어떤 단어장에 속해 있어야 하므로, 첫 화면(/)은 그 자체로
// 뭔가를 보여주지 않고 단어장 목록(/decks)으로 곧장 이동시킵니다.
export default function Home() {
  redirect("/decks");
}
