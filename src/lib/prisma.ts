import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Next.js 개발 모드는 코드를 고칠 때마다 모듈을 다시 불러오는데,
// 그때마다 PrismaClient를 새로 만들면 연결이 계속 쌓입니다.
// 그래서 전역 객체에 한 번 만든 인스턴스를 저장해두고 재사용합니다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
