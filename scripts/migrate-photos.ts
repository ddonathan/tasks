import * as fs from "node:fs";
import * as path from "node:path";

const MIRA_API_KEY = process.env.MIRA_API_KEY;
const CONVEX_SITE_URL =
  process.env.CONVEX_SITE_URL || "https://hidden-tern-314.convex.site";

if (!MIRA_API_KEY) {
  console.error("MIRA_API_KEY environment variable is required");
  process.exit(1);
}

const PHOTOS_DIR = "/Users/dan/clawd/bodycomp/photos";

async function main() {
  console.log(`Target: ${CONVEX_SITE_URL}`);
  console.log(`Photos source: ${PHOTOS_DIR}\n`);

  if (!fs.existsSync(PHOTOS_DIR)) {
    console.error(`Photos directory not found: ${PHOTOS_DIR}`);
    process.exit(1);
  }

  const dateDirs = fs
    .readdirSync(PHOTOS_DIR)
    .filter((d) => d.match(/^\d{4}-\d{2}-\d{2}$/))
    .sort();

  console.log(`Found ${dateDirs.length} date directories\n`);

  let succeeded = 0;
  let failed = 0;

  for (const dateDir of dateDirs) {
    const dirPath = path.join(PHOTOS_DIR, dateDir);
    const files = fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith(".jpg") || f.endsWith(".png"))
      .sort();

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileBuffer = fs.readFileSync(filePath);
      const blob = new Blob([fileBuffer], { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("file", blob, file);

      try {
        const res = await fetch(
          `${CONVEX_SITE_URL}/api/bodycomp/photos?date=${dateDir}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${MIRA_API_KEY}`,
            },
            body: formData,
          },
        );

        if (res.ok) {
          const data = await res.json();
          console.log(`  OK ${dateDir}/${file} -> ${data.storageId}`);
          succeeded++;
        } else {
          const body = await res.text();
          console.log(
            `  FAIL ${dateDir}/${file} - ${res.status} ${res.statusText} ${body}`,
          );
          failed++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`  FAIL ${dateDir}/${file} - ${msg}`);
        failed++;
      }
    }
  }

  const total = succeeded + failed;
  console.log(`\nPhotos: ${succeeded}/${total} succeeded, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
