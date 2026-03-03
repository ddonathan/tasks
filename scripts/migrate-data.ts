import * as fs from "node:fs";
import * as path from "node:path";

const MIRA_API_KEY = process.env.MIRA_API_KEY;
const CONVEX_SITE_URL =
  process.env.CONVEX_SITE_URL || "https://hidden-tern-314.convex.site";

if (!MIRA_API_KEY) {
  console.error("MIRA_API_KEY environment variable is required");
  process.exit(1);
}

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");

interface MigrationResult {
  succeeded: number;
  failed: number;
  total: number;
}

function getDataFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    console.warn(`  Directory not found: ${dir}`);
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter(
      (f) =>
        f.startsWith("2026-") &&
        f.endsWith(".json") &&
        f !== "index.json" &&
        f !== "body.json",
    )
    .sort()
    .map((f) => path.join(dir, f));
}

async function postData(
  endpoint: string,
  data: Record<string, unknown>,
): Promise<Response> {
  return fetch(`${CONVEX_SITE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MIRA_API_KEY}`,
    },
    body: JSON.stringify(data),
  });
}

async function migrateFitness(): Promise<MigrationResult> {
  const dir = path.join(PROJECT_ROOT, "public", "fitness-data");
  const files = getDataFiles(dir);
  let succeeded = 0;
  let failed = 0;

  console.log("Migrating fitness data...");

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf-8");
    const data = JSON.parse(raw);
    const date = data.date || path.basename(file, ".json");
    const mainLift = data.workout?.mainLift || "Unknown";

    try {
      const res = await postData("/api/workouts", data);
      if (res.ok) {
        console.log(`  \u2713 ${date} (${mainLift})`);
        succeeded++;
      } else {
        const body = await res.text();
        console.log(`  \u2717 ${date} - Error: ${res.status} ${res.statusText} ${body}`);
        failed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  \u2717 ${date} - Error: ${msg}`);
      failed++;
    }
  }

  const total = succeeded + failed;
  console.log(`\nFitness: ${succeeded}/${total} succeeded, ${failed} failed\n`);
  return { succeeded, failed, total };
}

async function migrateBodyComp(): Promise<MigrationResult> {
  const dir = path.join(PROJECT_ROOT, "public", "bodycomp-data");
  const files = getDataFiles(dir);
  let succeeded = 0;
  let failed = 0;

  console.log("Migrating body composition data...");

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf-8");
    const data = JSON.parse(raw);
    const date = data.date || path.basename(file, ".json");
    const weight = data.weight ? `${data.weight} lbs` : "no weight";

    try {
      const res = await postData("/api/bodycomp", data);
      if (res.ok) {
        console.log(`  \u2713 ${date} (${weight})`);
        succeeded++;
      } else {
        const body = await res.text();
        console.log(`  \u2717 ${date} - Error: ${res.status} ${res.statusText} ${body}`);
        failed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  \u2717 ${date} - Error: ${msg}`);
      failed++;
    }
  }

  const total = succeeded + failed;
  console.log(
    `\nBody comp: ${succeeded}/${total} succeeded, ${failed} failed\n`,
  );
  return { succeeded, failed, total };
}

async function main() {
  console.log(`Target: ${CONVEX_SITE_URL}\n`);

  const fitness = await migrateFitness();
  const bodycomp = await migrateBodyComp();

  const totalSucceeded = fitness.succeeded + bodycomp.succeeded;
  const totalAll = fitness.total + bodycomp.total;

  console.log(`Done! Total: ${totalSucceeded}/${totalAll} succeeded`);

  if (fitness.failed + bodycomp.failed > 0) {
    process.exit(1);
  }
}

main();
