/**
 * Télécharge les affiches / logos depuis le Marvel Cinematic Universe Wiki (Fandom).
 *
 * Usage:
 *   node scripts/fetch-mcu-posters.mjs                 # dry-run (manquants seulement)
 *   node scripts/fetch-mcu-posters.mjs --apply         # télécharge les manquants
 *   node scripts/fetch-mcu-posters.mjs --apply --force # écrase les existants
 *   node scripts/fetch-mcu-posters.mjs --only=iron-man-2008 --apply
 *   node scripts/fetch-mcu-posters.mjs --prefer=logo   # privilégie logo/title card
 *   node scripts/fetch-mcu-posters.mjs --prefer=poster # privilégie affiche portrait (défaut)
 *
 * Note: images sous copyright Marvel / studios — usage perso / dev uniquement.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MCU_JSON = path.join(ROOT, "src", "data", "mcu.json");
/** Affiches wiki — dossier séparé des logos paysage dans public/images/mcu/ */
const IMAGES_DIR = path.join(ROOT, "public", "images", "mcu-wiki");
const WIKI_API = "https://marvelcinematicuniverse.fandom.com/api.php";
const WIKI_ORIGIN = "https://marvelcinematicuniverse.fandom.com";
/** Wikia CDN renvoie 403 sans User-Agent navigateur + Referer */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${WIKI_ORIGIN}/`,
};

const VALID_EXTENSIONS = ["webp", "jpg", "jpeg", "png"];
const KEEP = new Set(["README.md", ".gitkeep"]);

const apply = process.argv.includes("--apply");
const force = process.argv.includes("--force");
const preferArg = process.argv.find((a) => a.startsWith("--prefer="));
const prefer = preferArg?.split("=")[1] === "logo" ? "logo" : "poster";
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyIds = onlyArg
  ? new Set(onlyArg.slice("--only=".length).split(",").filter(Boolean))
  : null;

/** id → titre exact de la page wiki (quand le titre auto est ambigu) */
const PAGE_OVERRIDES = {
  "iron-man-2008": "Iron Man",
  "iron-man-2-2010": "Iron Man 2",
  "iron-man-3-2013": "Iron Man 3",
  "the-incredible-hulk-2008": "The Incredible Hulk",
  "thor-2011": "Thor",
  "thor-the-dark-world-2013": "Thor: The Dark World",
  "thor-ragnarok-2017": "Thor: Ragnarok",
  "thor-love-and-thunder-2022": "Thor: Love and Thunder",
  "captain-america-the-first-avenger-2011": "Captain America: The First Avenger",
  "captain-america-the-winter-soldier-2014": "Captain America: The Winter Soldier",
  "captain-america-civil-war-2016": "Captain America: Civil War",
  "captain-america-brave-new-world-2025": "Captain America: Brave New World",
  "the-avengers-2012": "The Avengers",
  "avengers-age-of-ultron-2015": "Avengers: Age of Ultron",
  "avengers-infinity-war-2018": "Avengers: Infinity War",
  "avengers-endgame-2019": "Avengers: Endgame",
  "avengers-doomsday-2026": "Avengers: Doomsday",
  "avengers-secret-wars-2027": "Avengers: Secret Wars",
  "guardians-of-the-galaxy-2014": "Guardians of the Galaxy",
  "guardians-of-the-galaxy-vol-2-2017": "Guardians of the Galaxy Vol. 2",
  "guardians-of-the-galaxy-vol-3-2023": "Guardians of the Galaxy Vol. 3",
  "gotg-holiday-special-2022": "The Guardians of the Galaxy Holiday Special",
  "ant-man-2015": "Ant-Man",
  "ant-man-and-the-wasp-2018": "Ant-Man and the Wasp",
  "ant-man-quantumania-2023": "Ant-Man and the Wasp: Quantumania",
  "doctor-strange-2016": "Doctor Strange",
  "doctor-strange-mom-2022": "Doctor Strange in the Multiverse of Madness",
  "black-panther-2018": "Black Panther",
  "black-panther-wakanda-forever-2022": "Black Panther: Wakanda Forever",
  "black-widow-2021": "Black Widow (film)",
  "captain-marvel-2019": "Captain Marvel",
  "the-marvels-2023": "The Marvels",
  "spider-man-homecoming-2017": "Spider-Man: Homecoming",
  "spider-man-far-from-home-2019": "Spider-Man: Far From Home",
  "spider-man-no-way-home-2021": "Spider-Man: No Way Home",
  "spider-man-brand-new-day-2026": "Spider-Man: Brand New Day",
  "shang-chi-2021": "Shang-Chi and the Legend of the Ten Rings",
  "eternals-2021": "Eternals",
  "wandavision-2021": "WandaVision",
  "falcon-winter-soldier-2021": "The Falcon and the Winter Soldier",
  "loki-s1-2021": "Loki",
  "loki-s2-2023": "Loki/Season Two",
  "what-if-s1-2021": "What If...?",
  "what-if-s2-2023": "What If...?/Season Two",
  "what-if-s3-2024": "What If...?/Season Three",
  "hawkeye-2021": "Hawkeye (series)",
  "moon-knight-2022": "Moon Knight",
  "ms-marvel-2022": "Ms. Marvel",
  "she-hulk-2022": "She-Hulk: Attorney at Law",
  "secret-invasion-2023": "Secret Invasion",
  "echo-2024": "Echo",
  "agatha-all-along-2024": "Agatha All Along",
  "ironheart-2025": "Ironheart",
  "daredevil-born-again-s1-2025": "Daredevil: Born Again",
  "daredevil-born-again-s2-2026": "Daredevil: Born Again/Season Two",
  "eyes-of-wakanda-2025": "Eyes of Wakanda",
  "marvel-zombies-2025": "Marvel Zombies",
  "wonder-man-2026": "Wonder Man",
  "vision-quest-2026": "Vision Quest",
  "your-friendly-neighborhood-spiderman-s1-2025":
    "Your Friendly Neighborhood Spider-Man",
  "i-am-groot-2022": "I Am Groot",
  "i-am-groot-s2-2023": "I Am Groot/Season Two",
  "werewolf-by-night-2022": "Werewolf by Night",
  "thunderbolts-2025": "Thunderbolts*",
  "fantastic-four-first-steps-2025": "The Fantastic Four: First Steps",
  "deadpool-wolverine-2024": "Deadpool & Wolverine",
  "x-men-97-s1-2024": "X-Men '97",
  "x-men-97-s2-2026": "X-Men '97/Season Two",
  "spider-man-2002": "Spider-Man (2002 film)",
  "spider-man-2-2004": "Spider-Man 2",
  "spider-man-3-2007": "Spider-Man 3",
  "the-amazing-spider-man-2012": "The Amazing Spider-Man",
  "the-amazing-spider-man-2-2014": "The Amazing Spider-Man 2",
  "spider-man-into-the-spider-verse-2018": "Spider-Man: Into the Spider-Verse",
  "spider-man-across-the-spider-verse-2023":
    "Spider-Man: Across the Spider-Verse",
  "spider-man-beyond-the-spider-verse-2027":
    "Spider-Man: Beyond the Spider-Verse",
  "venom-2018": "Venom (film)",
  "venom-let-there-be-carnage-2021": "Venom: Let There Be Carnage",
  "venom-the-last-dance-2024": "Venom: The Last Dance",
  "morbius-2022": "Morbius",
  "madame-web-2024": "Madame Web",
  "kraven-the-hunter-2024": "Kraven the Hunter",
  "x-men-2000": "X-Men (film)",
  "x2-2003": "X2",
  "x-men-last-stand-2006": "X-Men: The Last Stand",
  "x-men-origins-wolverine-2009": "X-Men Origins: Wolverine",
  "x-men-first-class-2011": "X-Men: First Class",
  "the-wolverine-2013": "The Wolverine",
  "x-men-days-of-future-past-2014": "X-Men: Days of Future Past",
  "deadpool-2016": "Deadpool",
  "x-men-apocalypse-2016": "X-Men: Apocalypse",
  "logan-2017": "Logan",
  "deadpool-2-2018": "Deadpool 2",
  "x-men-dark-phoenix-2019": "Dark Phoenix",
  "the-new-mutants-2020": "The New Mutants",
  "fantastic-four-2005": "Fantastic Four (2005 film)",
  "fantastic-four-rise-of-the-silver-surfer-2007":
    "Fantastic Four: Rise of the Silver Surfer",
  "fant4stic-2015": "Fantastic Four (2015 film)",
  "daredevil-s1-2015": "Daredevil (TV series)",
  "daredevil-s2-2016": "Daredevil (TV series)/Season Two",
  "daredevil-s3-2018": "Daredevil (TV series)/Season Three",
  "jessica-jones-s1-2015": "Jessica Jones (TV series)",
  "jessica-jones-s2-2018": "Jessica Jones (TV series)/Season Two",
  "jessica-jones-s3-2019": "Jessica Jones (TV series)/Season Three",
  "luke-cage-s1-2016": "Luke Cage (TV series)",
  "luke-cage-s2-2018": "Luke Cage (TV series)/Season Two",
  "iron-fist-s1-2017": "Iron Fist (TV series)",
  "iron-fist-s2-2018": "Iron Fist (TV series)/Season Two",
  "the-defenders-2017": "The Defenders (TV series)",
  "the-punisher-s1-2017": "The Punisher (TV series)",
  "the-punisher-s2-2019": "The Punisher (TV series)/Season Two",
  "punisher-one-last-kill-2026": "Punisher: One Last Kill",
  "agents-of-shield-s1-2013": "Agents of S.H.I.E.L.D. (TV series)",
  "agents-of-shield-s2-2014": "Agents of S.H.I.E.L.D. (TV series)/Season Two",
  "agents-of-shield-s3-2015": "Agents of S.H.I.E.L.D. (TV series)/Season Three",
  "agents-of-shield-s4-2016": "Agents of S.H.I.E.L.D. (TV series)/Season Four",
  "agents-of-shield-s5-2017": "Agents of S.H.I.E.L.D. (TV series)/Season Five",
  "agents-of-shield-s6-2019": "Agents of S.H.I.E.L.D. (TV series)/Season Six",
  "agents-of-shield-s7-2020": "Agents of S.H.I.E.L.D. (TV series)/Season Seven",
  "inhumans-2017": "Inhumans (TV series)",
  "cloak-and-dagger-s1-2018": "Cloak & Dagger (TV series)",
  "cloak-and-dagger-s2-2019": "Cloak & Dagger (TV series)/Season Two",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgsSummary() {
  return { apply, force, prefer, only: onlyIds ? [...onlyIds] : null };
}

function existingImageForId(id) {
  for (const ext of VALID_EXTENSIONS) {
    const file = path.join(IMAGES_DIR, `${id}.${ext}`);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function extFromUrl(url, fallback = "jpg") {
  try {
    const clean = url.split("?")[0];
    const base = path.basename(clean).toLowerCase();
    const m = base.match(/\.(webp|jpg|jpeg|png)$/);
    return m ? m[1] : fallback;
  } catch {
    return fallback;
  }
}

function extFromContentType(contentType, fallback = "jpg") {
  if (!contentType) return fallback;
  const ct = contentType.split(";")[0].trim().toLowerCase();
  if (ct === "image/webp") return "webp";
  if (ct === "image/png") return "png";
  if (ct === "image/jpeg" || ct === "image/jpg") return "jpg";
  return fallback;
}

/** URL pleine résolution Wikia (sans scale-to-width) */
function toFullResolutionUrl(url) {
  return url
    .replace(/\/revision\/latest\/scale-to-width-down\/\d+/i, "/revision/latest")
    .replace(/\/scale-to-width-down\/\d+/i, "");
}

function scoreImageFilename(name, mode) {
  const n = name.toLowerCase().replace(/^file:/, "");
  let score = 0;
  if (/\b(logo|logotype|wordmark|title.?card|title.?treatment)\b/.test(n)) {
    score += mode === "logo" ? 100 : 40;
  }
  if (/\b(poster|affiche|theatrical)\b/.test(n)) {
    score += mode === "poster" ? 100 : 30;
  }
  if (/\binfobox\b/.test(n)) score += 20;
  if (/\b(character|portrait|selfie|promo.?still)\b/.test(n)) score -= 40;
  if (/\b(trailer|screenshot|still|frame)\b/.test(n)) score -= 30;
  // Logos génériques / nav / autres films collés sur beaucoup de pages
  if (/\btransparent\b/.test(n)) score -= 80;
  if (/\bdoomsday\b/.test(n)) score -= 50;
  if (/^avengers[_ ]logo\b/.test(n) || n.includes("avengers logo")) score -= 60;
  if (/\bgamora\b|\byelena\b|\bloki_infobox\b/.test(n) && !/\bposter\b/.test(n)) {
    score -= 35;
  }
  return score;
}

async function wikiFetch(params) {
  const url = new URL(WIKI_API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const res = await fetch(url, {
    headers: {
      ...BROWSER_HEADERS,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Wiki API ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

function cleanTitle(title) {
  return title
    .replace(/\s*\(Saison\s+\d+\)\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchWikiPage(query) {
  const data = await wikiFetch({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "8",
    srnamespace: "0",
  });
  const results = data?.query?.search ?? [];
  if (results.length === 0) return null;

  const q = query.toLowerCase();
  const ranked = [...results].sort((a, b) => {
    const at = a.title.toLowerCase();
    const bt = b.title.toLowerCase();
    const score = (t) => {
      let s = 0;
      if (t === q) s += 50;
      if (/\(film\)/.test(t)) s += 20;
      if (/\(series\)|\(tv series\)/.test(t)) s += 15;
      if (/\/season/.test(t)) s -= 5;
      if (/\/(credits|trivia|gallery|release)/.test(t)) s -= 40;
      return s;
    };
    return score(bt) - score(at);
  });
  return ranked[0].title;
}

async function resolveWikiTitle(item) {
  const tryTitles = [];
  if (PAGE_OVERRIDES[item.id]) tryTitles.push(PAGE_OVERRIDES[item.id]);

  const base = cleanTitle(item.title);
  tryTitles.push(base);
  if (item.type === "movie") {
    tryTitles.push(`${base} (film)`);
    tryTitles.push(`${base} (${item.releaseDate.slice(0, 4)} film)`);
  }
  if (item.type === "series") {
    tryTitles.push(`${base} (TV series)`);
    tryTitles.push(`${base} (series)`);
  }

  for (const c of tryTitles) {
    const data = await wikiFetch({
      action: "query",
      titles: c,
      redirects: "1",
    });
    const page = Object.values(data?.query?.pages ?? {})[0];
    if (page && !page.missing && page.pageid > 0) return page.title;
    await sleep(80);
  }

  return searchWikiPage(base);
}

async function getImageUrlForFile(fileTitle) {
  const info = await wikiFetch({
    action: "query",
    titles: fileTitle,
    prop: "imageinfo",
    iiprop: "url|size|mime",
  });
  const fpage = Object.values(info?.query?.pages ?? {})[0];
  const ii = fpage?.imageinfo?.[0];
  if (!ii?.url) return null;
  return {
    url: toFullResolutionUrl(ii.url),
    width: ii.width ?? 0,
    height: ii.height ?? 0,
  };
}

async function getPageImageCandidates(pageTitle) {
  const data = await wikiFetch({
    action: "query",
    titles: pageTitle,
    prop: "pageimages|images",
    pithumbsize: "1200",
    pilicense: "any",
    imlimit: "50",
    redirects: "1",
  });

  const page = Object.values(data?.query?.pages ?? {})[0];
  if (!page || page.missing) return { pageTitle: null, candidates: [] };

  const resolvedTitle = page.title;
  const candidates = [];

  if (page.thumbnail?.source) {
    candidates.push({
      file: page.pageimage ?? "pageimage",
      url: toFullResolutionUrl(page.thumbnail.source),
      score: scoreImageFilename(page.pageimage ?? "", prefer) + 15,
      source: "pageimage",
    });
  }

  const files = (page.images ?? [])
    .map((img) => img.title)
    .filter((t) => /\.(jpg|jpeg|png|webp)$/i.test(t));

  const rankedFiles = files
    .map((file) => ({ file, score: scoreImageFilename(file, prefer) }))
    .sort((a, b) => b.score - a.score);

  // Prend les meilleurs scorés + quelques fallbacks génériques
  const picked = [
    ...rankedFiles.filter((f) => f.score > 0).slice(0, 6),
    ...rankedFiles.filter((f) => f.score <= 0).slice(0, 3),
  ];

  const seen = new Set();
  for (const { file, score } of picked) {
    if (seen.has(file)) continue;
    seen.add(file);
    const meta = await getImageUrlForFile(file);
    if (!meta) continue;

    let finalScore = score;
    // Bonus léger pour images assez grandes
    if (meta.width >= 400 && meta.height >= 400) finalScore += 5;
    // En mode logo, favorise le paysage
    if (prefer === "logo" && meta.width > meta.height) finalScore += 15;
    // En mode poster, favorise le portrait
    if (prefer === "poster" && meta.height > meta.width) finalScore += 15;

    candidates.push({
      file,
      url: meta.url,
      score: finalScore,
      source: "images",
    });
    await sleep(120);
  }

  candidates.sort((a, b) => b.score - a.score);
  return { pageTitle: resolvedTitle, candidates };
}

async function downloadFile(url) {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Download ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new Error(`Fichier trop petit (${buf.length} B)`);
  const ext = extFromContentType(
    res.headers.get("content-type"),
    extFromUrl(url),
  );
  return { buf, ext, size: buf.length };
}

async function main() {
  console.log("MCU Wiki poster fetch");
  console.log(JSON.stringify(parseArgsSummary(), null, 2));
  console.log(
    "\n⚠ Images sous copyright. Usage perso/dev uniquement. Ne pas redistribuer sans droits.\n",
  );

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const items = JSON.parse(fs.readFileSync(MCU_JSON, "utf8"));
  const targets = items.filter((item) => {
    if (onlyIds && !onlyIds.has(item.id)) return false;
    if (force) return true;
    return !existingImageForId(item.id);
  });

  console.log(`Items MCU: ${items.length}`);
  console.log(`À traiter: ${targets.length}${force ? " (force)" : " (manquants)"}`);

  if (targets.length === 0) {
    console.log("Rien à faire.");
    return;
  }

  const results = { ok: [], skip: [], fail: [] };

  for (const [index, item] of targets.entries()) {
    const prefix = `[${index + 1}/${targets.length}] ${item.id}`;
    try {
      const pageTitle = await resolveWikiTitle(item);
      if (!pageTitle) {
        console.log(`${prefix} — page wiki introuvable`);
        results.fail.push({ id: item.id, reason: "no-page" });
        continue;
      }

      await sleep(150);
      const { pageTitle: resolved, candidates } =
        await getPageImageCandidates(pageTitle);

      if (!candidates.length) {
        console.log(`${prefix} — aucune image (page: ${resolved ?? pageTitle})`);
        results.fail.push({ id: item.id, reason: "no-image", page: pageTitle });
        continue;
      }

      const best = candidates[0];
      console.log(
        `${prefix} — ${resolved ?? pageTitle} → ${best.file} (${best.source}, score ${best.score})`,
      );

      if (!apply) {
        results.skip.push({ id: item.id, url: best.url });
        continue;
      }

      const { buf, ext, size } = await downloadFile(best.url);
      const destName = `${item.id}.${ext}`;
      const destPath = path.join(IMAGES_DIR, destName);

      // Supprime les autres extensions pour éviter les doublons
      for (const e of VALID_EXTENSIONS) {
        const other = path.join(IMAGES_DIR, `${item.id}.${e}`);
        if (other !== destPath && fs.existsSync(other)) fs.unlinkSync(other);
      }

      fs.writeFileSync(destPath, buf);
      console.log(`  ✓ ${destName} (${Math.round(size / 1024)} Ko)`);
      results.ok.push({ id: item.id, dest: destName });
      await sleep(250);
    } catch (err) {
      console.log(`${prefix} — ERREUR: ${err.message}`);
      results.fail.push({ id: item.id, reason: err.message });
      await sleep(400);
    }
  }

  console.log("\n--- Résumé ---");
  console.log(`Téléchargés: ${results.ok.length}`);
  console.log(`Dry-run / planifiés: ${results.skip.length}`);
  console.log(`Échecs: ${results.fail.length}`);
  if (results.fail.length) {
    for (const f of results.fail) {
      console.log(`  - ${f.id}: ${f.reason}${f.page ? ` (${f.page})` : ""}`);
    }
  }
  if (!apply && results.skip.length) {
    console.log("\nDry-run. Relancer avec --apply pour télécharger.");
  }

  // Ignore KEEP listing noise
  void KEEP;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
