// `prisma studio`는 SQLite의 상대 경로 형식(file:./dev.db)을 인식하지 못하는
// 알려진 버그가 있어(마이그레이션/시드에는 영향 없음), 여기서 절대 경로 URL을
// 직접 만들어 --url로 넘겨준다.
import { pathToFileURL } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dbUrl = pathToFileURL(path.resolve("dev.db")).href;

const result = spawnSync("npx", ["prisma", "studio", "--url", dbUrl], {
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 0);
