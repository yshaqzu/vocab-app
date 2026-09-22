import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { particles } from "../src/data/particles";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.card.deleteMany();
  await prisma.deck.deleteMany();

  const deck = await prisma.deck.create({ data: { name: "N3 조사" } });
  await prisma.card.createMany({
    // 조사(は, が, に...)는 이미 히라가나이므로, 읽는 법도 그대로 씁니다.
    data: particles.map((particle) => ({
      ...particle,
      reading: particle.particle,
      deckId: deck.id,
    })),
  });
  console.log(
    `시드 완료: "${deck.name}" 단어장에 카드 ${particles.length}개를 넣었습니다.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
