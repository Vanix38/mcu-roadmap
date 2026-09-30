/**
 * Télécharge les affiches depuis les wikis Fandom Marvel.
 *
 * Usage:
 *   node scripts/fetch-mcu-posters.mjs                 # dry-run (manquants seulement)
 *   node scripts/fetch-mcu-posters.mjs --apply         # télécharge les manquants
 *   node scripts/fetch-mcu-posters.mjs --apply --force # écrase les existants
 *   node scripts/fetch-mcu-posters.mjs --only=iron-man-2008 --apply
 *   node scripts/fetch-mcu-posters.mjs --prefer=logo
 *   node scripts/fetch-mcu-posters.mjs --prefer=poster # défaut
 *
 * Sources:
 *   - studio marvel → MCU Wiki (marvelcinematicuniverse.fandom.com)
 *   - hors MCU → Marvel Database (marvel.fandom.com)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MCU_JSON = path.join(ROOT, "src", "data", "mcu.json");
/** Affiches wiki — dossier séparé des logos paysage dans public/images/mcu/ */
const IMAGES_DIR = path.join(ROOT, "public", "images", "mcu-wiki");
const MCU_WIKI_API = "https://marvelcinematicuniverse.fandom.com/api.php";
const MCU_WIKI_ORIGIN = "https://marvelcinematicuniverse.fandom.com";
const MARVEL_DB_API = "https://marvel.fandom.com/api.php";
const MARVEL_DB_ORIGIN = "https://marvel.fandom.com";
/** Wikia CDN renvoie 403 sans User-Agent navigateur + Referer */
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${MCU_WIKI_ORIGIN}/`,
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

/** id → page MCU Fandom (Marvel Studios uniquement) — toujours la page film/série, pas le personnage */
const MCU_PAGE_OVERRIDES = {
  "iron-man-2008": "Iron Man (film)",
  "iron-man-2-2010": "Iron Man 2",
  "iron-man-3-2013": "Iron Man 3",
  "the-incredible-hulk-2008": "The Incredible Hulk",
  "thor-2011": "Thor (film)",
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
  "ant-man-2015": "Ant-Man (film)",
  "ant-man-and-the-wasp-2018": "Ant-Man and the Wasp",
  "ant-man-quantumania-2023": "Ant-Man and the Wasp: Quantumania",
  "doctor-strange-2016": "Doctor Strange (film)",
  "doctor-strange-mom-2022": "Doctor Strange in the Multiverse of Madness",
  "black-panther-2018": "Black Panther (film)",
  "black-panther-wakanda-forever-2022": "Black Panther: Wakanda Forever",
  "black-widow-2021": "Black Widow (film)",
  "captain-marvel-2019": "Captain Marvel (film)",
  "the-marvels-2023": "The Marvels",
  "spider-man-homecoming-2017": "Spider-Man: Homecoming",
  "spider-man-far-from-home-2019": "Spider-Man: Far From Home",
  "spider-man-no-way-home-2021": "Spider-Man: No Way Home",
  "spider-man-brand-new-day-2026": "Spider-Man: Brand New Day",
  "shang-chi-2021": "Shang-Chi and the Legend of the Ten Rings",
  "eternals-2021": "Eternals (film)",
  "wandavision-2021": "WandaVision",
  "falcon-winter-soldier-2021": "The Falcon and the Winter Soldier",
  "loki-s1-2021": "Loki (TV series)",
  "loki-s2-2023": "Loki (TV series)/Season Two",
  "what-if-s1-2021": "What If...?",
  "what-if-s2-2023": "What If...?/Season Two",
  "what-if-s3-2024": "What If...?/Season Three",
  "hawkeye-2021": "Hawkeye (TV series)",
  "moon-knight-2022": "Moon Knight (TV series)",
  "ms-marvel-2022": "Ms. Marvel (TV series)",
  "she-hulk-2022": "She-Hulk: Attorney at Law",
  "secret-invasion-2023": "Secret Invasion (TV series)",
  "echo-2024": "Echo (TV series)",
  "agatha-all-along-2024": "Agatha All Along",
  "ironheart-2025": "Ironheart (TV series)",
  "daredevil-born-again-s1-2025": "Daredevil: Born Again",
  "daredevil-born-again-s2-2026": "Daredevil: Born Again/Season Two",
  "eyes-of-wakanda-2025": "Eyes of Wakanda",
  "marvel-zombies-2025": "Marvel Zombies",
  "wonder-man-2026": "Wonder Man (TV series)",
  "vision-quest-2026": "Vision Quest",
  "your-friendly-neighborhood-spiderman-s1-2025":
    "Your Friendly Neighborhood Spider-Man",
  "i-am-groot-2022": "I Am Groot",
  "i-am-groot-s2-2023": "I Am Groot/Season Two",
  "werewolf-by-night-2022": "Werewolf by Night (TV special)",
  "thunderbolts-2025": "Thunderbolts*",
  "fantastic-four-first-steps-2025": "The Fantastic Four: First Steps",
  "deadpool-wolverine-2024": "Deadpool & Wolverine",
};

/**
 * Hors MCU (Fox / Sony / Netflix / ABC…) → Marvel Database (marvel.fandom.com)
 */
const MARVEL_DB_OVERRIDES = {
  "x-men-2000": "X-Men (film)",
  "x2-2003": "X2",
  "x-men-last-stand-2006": "X-Men: The Last Stand",
  "x-men-origins-wolverine-2009": "X-Men Origins: Wolverine",
  "x-men-first-class-2011": "X-Men: First Class",
  "the-wolverine-2013": "The Wolverine",
  "x-men-days-of-future-past-2014": "X-Men: Days of Future Past",
  "deadpool-2016": "Deadpool (film)",
  "x-men-apocalypse-2016": "X-Men: Apocalypse",
  "logan-2017": "Logan (film)",
  "deadpool-2-2018": "Deadpool 2",
  "x-men-dark-phoenix-2019": "Dark Phoenix (film)",
  "the-new-mutants-2020": "The New Mutants (film)",
  "x-men-97-s1-2024": "X-Men '97",
  "x-men-97-s2-2026": "X-Men '97",
  "spider-man-2002": "Spider-Man (2002 film)",
  "spider-man-2-2004": "Spider-Man 2 (film)",
  "spider-man-3-2007": "Spider-Man 3 (film)",
  "the-amazing-spider-man-2012": "The Amazing Spider-Man (2012 film)",
  "the-amazing-spider-man-2-2014": "The Amazing Spider-Man 2 (film)",
  "venom-2018": "Venom (film)",
  "venom-let-there-be-carnage-2021": "Venom: Let There Be Carnage",
  "morbius-2022": "Morbius (film)",
  "madame-web-2024": "Madame Web (film)",
  "venom-the-last-dance-2024": "Venom: The Last Dance",
  "kraven-the-hunter-2024": "Kraven the Hunter (film)",
  "spider-noir-2026": "Spider-Noir",
  "spider-man-into-the-spider-verse-2018": "Spider-Man: Into the Spider-Verse",
  "spider-man-across-the-spider-verse-2023":
    "Spider-Man: Across the Spider-Verse",
  "spider-man-beyond-the-spider-verse-2027":
    "Spider-Man: Beyond the Spider-Verse",
  "fantastic-four-2005": "Fantastic Four (2005 film)",
  "fantastic-four-rise-of-the-silver-surfer-2007":
    "Fantastic Four: Rise of the Silver Surfer",
  "fant4stic-2015": "Fantastic Four (2015 film)",
  "daredevil-s1-2015": "Marvel's Daredevil",
  "daredevil-s2-2016": "Marvel's Daredevil",
  "daredevil-s3-2018": "Marvel's Daredevil",
  "jessica-jones-s1-2015": "Marvel's Jessica Jones",
  "jessica-jones-s2-2018": "Marvel's Jessica Jones",
  "jessica-jones-s3-2019": "Marvel's Jessica Jones",
  "luke-cage-s1-2016": "Marvel's Luke Cage",
  "luke-cage-s2-2018": "Marvel's Luke Cage",
  "iron-fist-s1-2017": "Marvel's Iron Fist",
  "iron-fist-s2-2018": "Marvel's Iron Fist",
  "the-defenders-2017": "Marvel's The Defenders",
  "the-punisher-s1-2017": "Marvel's The Punisher",
  "the-punisher-s2-2019": "Marvel's The Punisher",
  "punisher-one-last-kill-2026": "Punisher: One Last Kill",
  "agents-of-shield-s1-2013": "Marvel's Agents of S.H.I.E.L.D.",
  "agents-of-shield-s2-2014": "Marvel's Agents of S.H.I.E.L.D.",
  "agents-of-shield-s3-2015": "Marvel's Agents of S.H.I.E.L.D.",
  "agents-of-shield-s4-2016": "Marvel's Agents of S.H.I.E.L.D.",
  "agents-of-shield-s5-2017": "Marvel's Agents of S.H.I.E.L.D.",
  "agents-of-shield-s6-2019": "Marvel's Agents of S.H.I.E.L.D.",
  "agents-of-shield-s7-2020": "Marvel's Agents of S.H.I.E.L.D.",
  "agent-carter-s1-2015": "Marvel's Agent Carter",
  "agent-carter-s2-2016": "Marvel's Agent Carter",
  "inhumans-2017": "Marvel's Inhumans",
  "cloak-and-dagger-s1-2018": "Marvel's Cloak & Dagger",
  "cloak-and-dagger-s2-2019": "Marvel's Cloak & Dagger",
  "runaways-s1-2017": "Marvel's Runaways",
  "runaways-s2-2018": "Marvel's Runaways",
  "runaways-s3-2019": "Marvel's Runaways",
};

function isOutsideMcu(item) {
  return item.studio !== "marvel";
}

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
  if (/\(film\).*poster|poster.*\(film\)/.test(n)) score += 40;
  if (/\(film\)/.test(n) && !/\bvol\.?\s*\d+\b/.test(n) && !/\blogo\b/.test(n)) {
    score += 35;
  }
  if (/\binfobox\b/.test(n)) score -= 120;
  if (/\b(character|portrait|selfie|promo.?still)\b/.test(n)) score -= 40;
  if (/\b(trailer|screenshot|still|frame)\b/.test(n)) score -= 30;
  if (/\btransparent\b/.test(n)) score -= 80;
  if (/\bdoomsday\b/.test(n)) score -= 50;
  if (/^avengers[_ ]logo\b/.test(n) || n.includes("avengers logo")) score -= 60;
  if (/\bgamora\b|\byelena\b|\bloki_infobox\b/.test(n) && !/\bposter\b/.test(n)) {
    score -= 35;
  }
  // Marvel Database mélange comics / covers
  if (/\bvol\.?\s*\d+\b/.test(n)) score -= 70;
  if (/\bearth-\d+\b/.test(n) && !/\bposter\b/.test(n)) score -= 50;
  if (/\b(box art|video game|xbox|novel)\b/.test(n)) score -= 60;
  if (/\btextless\b/.test(n) && !/\bposter\b/.test(n)) score -= 40;
  return score;
}

let lastFandomCallAt = 0;

async function mediaWikiFetch(apiBase, params, referer) {
  const elapsed = Date.now() - lastFandomCallAt;
  const minGap = 350;
  if (elapsed < minGap) await sleep(minGap - elapsed);

  const url = new URL(apiBase);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const headers = {
    ...BROWSER_HEADERS,
    Referer: referer ?? BROWSER_HEADERS.Referer,
    Accept: "application/json",
    "Api-User-Agent":
      "mcu-roadmap-fetch/1.0 (local-dev; https://github.com/Vanix38/mcu-roadmap)",
  };

  let lastErr = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    lastFandomCallAt = Date.now();
    const res = await fetch(url, { headers });
    if (res.status === 429) {
      const wait = 2000 * (attempt + 1);
      console.log(`  … rate-limit 429, pause ${wait}ms`);
      await sleep(wait);
      lastErr = new Error(`Wiki API 429 Too Many Requests for ${url}`);
      continue;
    }
    if (!res.ok) {
      throw new Error(`Wiki API ${res.status} ${res.statusText} for ${url}`);
    }
    return res.json();
  }
  throw lastErr ?? new Error(`Wiki API failed for ${url}`);
}

function wikiFetch(params) {
  return mediaWikiFetch(MCU_WIKI_API, params, `${MCU_WIKI_ORIGIN}/`);
}

function marvelDbFetch(params) {
  return mediaWikiFetch(MARVEL_DB_API, params, `${MARVEL_DB_ORIGIN}/`);
}

function cleanTitle(title) {
  return title
    .replace(/\s*\(Saison\s+\d+\)\s*/gi, "")
    .replace(/\s*\(2015\)\s*/gi, "")
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
      if (/\(film\)/.test(t)) s += 40;
      if (/\(tv series\)|\(series\)/.test(t)) s += 35;
      if (/\(tv special\)/.test(t)) s += 30;
      if (/\/season/.test(t)) s -= 5;
      if (/\/(credits|trivia|gallery|release)/.test(t)) s -= 40;
      // Dépriorise les pages personnage nues
      if (!/\(/.test(t) && !t.includes(":")) s -= 15;
      return s;
    };
    return score(bt) - score(at);
  });
  return ranked[0].title;
}

async function resolveMcuWikiTitle(item) {
  const tryTitles = [];
  if (MCU_PAGE_OVERRIDES[item.id]) tryTitles.push(MCU_PAGE_OVERRIDES[item.id]);

  const base = cleanTitle(item.title);
  // Toujours tenter la page média avant la page personnage (même nom)
  if (item.type === "movie" || item.type === "special") {
    tryTitles.push(`${base} (film)`);
    tryTitles.push(`${base} (TV special)`);
    tryTitles.push(`${base} (${item.releaseDate.slice(0, 4)} film)`);
  }
  if (item.type === "series") {
    tryTitles.push(`${base} (TV series)`);
    tryTitles.push(`${base} (series)`);
    tryTitles.push(`${base} (Disney+ series)`);
  }
  tryTitles.push(base);

  for (const c of [...new Set(tryTitles)]) {
    const data = await wikiFetch({
      action: "query",
      titles: c,
      redirects: "1",
    });
    const page = Object.values(data?.query?.pages ?? {})[0];
    if (page && !page.missing && page.pageid > 0) {
      // Évite les redirects personnage (ex. Wonder Man → Simon Williams)
      // si une page (film)/(TV series) était dans la liste et qu'on a un redirect
      const redirects = data?.query?.redirects ?? [];
      const redirected = redirects.find((r) => r.from === c);
      if (
        redirected &&
        !/\((film|tv series|series|tv special)\)/i.test(c) &&
        !/\((film|tv series|series|tv special)\)/i.test(redirected.to)
      ) {
        // Redirect depuis un titre nu vers un personnage → ignorer
        const looksLikeCharacter =
          !/\((film|tv series|series|tv special|miniseries)\)/i.test(
            redirected.to,
          ) &&
          !/^(the )?(avengers|guardians|wandavision|what if)/i.test(
            redirected.to,
          );
        if (looksLikeCharacter && c === base) continue;
      }
      return page.title;
    }
    await sleep(80);
  }

  return searchWikiPage(base);
}

async function resolveMarvelDbTitle(item) {
  if (MARVEL_DB_OVERRIDES[item.id]) {
    const override = MARVEL_DB_OVERRIDES[item.id];
    const data = await marvelDbFetch({
      action: "query",
      titles: override,
      redirects: "1",
    });
    const page = Object.values(data?.query?.pages ?? {})[0];
    if (page && !page.missing && page.pageid > 0) return page.title;
  }

  const tryTitles = [];
  const base = cleanTitle(item.title);
  const year = item.releaseDate.slice(0, 4);
  tryTitles.push(base);
  if (item.type === "movie") {
    tryTitles.push(`${base} (film)`);
    tryTitles.push(`${base} (${year} film)`);
  }
  if (item.type === "series") {
    tryTitles.push(`Marvel's ${base}`);
    tryTitles.push(`${base} (TV series)`);
  }

  for (const c of [...new Set(tryTitles)]) {
    const data = await marvelDbFetch({
      action: "query",
      titles: c,
      redirects: "1",
    });
    const page = Object.values(data?.query?.pages ?? {})[0];
    if (page && !page.missing && page.pageid > 0) return page.title;
    await sleep(200);
  }

  const search = await marvelDbFetch({
    action: "query",
    list: "search",
    srsearch: `${base} ${item.type === "movie" ? "film" : ""}`.trim(),
    srlimit: "8",
  });
  const hits = search?.query?.search ?? [];
  if (hits.length === 0) return null;

  const ranked = [...hits].sort((a, b) => {
    const score = (t) => {
      const low = t.toLowerCase();
      let s = 0;
      if (low.includes("(film)")) s += 25;
      if (low.startsWith("marvel's")) s += 15;
      if (low.includes("vol ")) s -= 40;
      if (low.includes("soundtrack") || low.includes("character")) s -= 40;
      return s;
    };
    return score(b.title) - score(a.title);
  });
  return ranked[0].title;
}

async function getImageUrlForFile(fileTitle, fetcher = wikiFetch) {
  const info = await fetcher({
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

async function getFandomCandidates(pageTitle, fetcher, sourceLabel) {
  const data = await fetcher({
    action: "query",
    titles: pageTitle,
    prop: "pageimages|images",
    pithumbsize: "1200",
    imlimit: "50",
    redirects: "1",
  });

  const page = Object.values(data?.query?.pages ?? {})[0];
  if (!page || page.missing) return { pageTitle: null, candidates: [] };

  const resolvedTitle = page.title;
  const candidates = [];

  if (page.thumbnail?.source) {
    let pageScore = scoreImageFilename(page.pageimage ?? "", prefer) + 15;
    const tw = page.thumbnail.width ?? 0;
    const th = page.thumbnail.height ?? 0;
    if (prefer === "poster" && th > tw) pageScore += 40;
    if (prefer === "logo" && tw > th) pageScore += 40;
    candidates.push({
      file: page.pageimage ?? "pageimage",
      url: toFullResolutionUrl(page.thumbnail.source),
      score: pageScore,
      source: sourceLabel,
    });
  }

  const files = (page.images ?? [])
    .map((img) => img.title)
    .filter((t) => /\.(jpg|jpeg|png|webp)$/i.test(t));

  const rankedFiles = files
    .map((file) => ({ file, score: scoreImageFilename(file, prefer) }))
    .sort((a, b) => b.score - a.score);

  const picked = [
    ...rankedFiles.filter((f) => f.score > 0).slice(0, 6),
    ...rankedFiles.filter((f) => f.score <= 0).slice(0, 2),
  ];

  const seen = new Set();
  for (const { file, score } of picked) {
    if (seen.has(file)) continue;
    seen.add(file);
    const meta = await getImageUrlForFile(file, fetcher);
    if (!meta) continue;

    let finalScore = score;
    if (meta.width >= 400 && meta.height >= 400) finalScore += 5;
    if (prefer === "logo" && meta.width > meta.height) finalScore += 15;
    if (prefer === "poster" && meta.height > meta.width) finalScore += 15;

    candidates.push({
      file,
      url: meta.url,
      score: finalScore,
      source: sourceLabel,
    });
    await sleep(120);
  }

  candidates.sort((a, b) => b.score - a.score);
  return { pageTitle: resolvedTitle, candidates };
}

async function resolveCandidates(item) {
  if (isOutsideMcu(item)) {
    const override = MARVEL_DB_OVERRIDES[item.id];
    const pageTitle = override ?? (await resolveMarvelDbTitle(item));
    if (!pageTitle) {
      return { pageTitle: null, candidates: [], source: "marvel-db" };
    }
    const result = await getFandomCandidates(
      pageTitle,
      marvelDbFetch,
      "marvel-db",
    );
    return { ...result, source: "marvel-db" };
  }

  const pageTitle = await resolveMcuWikiTitle(item);
  if (!pageTitle) return { pageTitle: null, candidates: [], source: "mcu-wiki" };
  const result = await getFandomCandidates(pageTitle, wikiFetch, "mcu-wiki");
  return { ...result, source: "mcu-wiki" };
}

async function downloadFile(url, refererOrigin = MCU_WIKI_ORIGIN) {
  const headers = {
    ...BROWSER_HEADERS,
    Referer: `${refererOrigin}/`,
  };
  const res = await fetch(url, {
    headers,
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Download ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 800) throw new Error(`Fichier trop petit (${buf.length} B)`);
  const ext = extFromContentType(
    res.headers.get("content-type"),
    extFromUrl(url),
  );
  return { buf, ext, size: buf.length };
}

async function main() {
  console.log("MCU / Marvel Database poster fetch");
  console.log(JSON.stringify(parseArgsSummary(), null, 2));
  console.log(
    "\n⚠ Images sous copyright. Usage perso/dev uniquement. Ne pas redistribuer sans droits.",
  );
  console.log(
    "Sources: Marvel Studios → MCU Wiki | hors MCU → marvel.fandom.com\n",
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

  const hors = targets.filter(isOutsideMcu).length;
  console.log(`Items: ${items.length} | À traiter: ${targets.length} (dont ${hors} hors MCU)`);

  if (targets.length === 0) {
    console.log("Rien à faire.");
    return;
  }

  const results = { ok: [], skip: [], fail: [] };

  for (const [index, item] of targets.entries()) {
    const prefix = `[${index + 1}/${targets.length}] ${item.id}`;
    try {
      const { pageTitle, candidates, source } = await resolveCandidates(item);
      if (!pageTitle) {
        console.log(`${prefix} — page introuvable (${source})`);
        results.fail.push({ id: item.id, reason: "no-page", source });
        continue;
      }

      await sleep(150);

      if (!candidates.length) {
        console.log(`${prefix} — aucune image (${source}: ${pageTitle})`);
        results.fail.push({
          id: item.id,
          reason: "no-image",
          page: pageTitle,
          source,
        });
        continue;
      }

      const best = candidates[0];
      console.log(
        `${prefix} — [${source}] ${pageTitle} → ${best.file} (score ${best.score})`,
      );

      if (!apply) {
        results.skip.push({ id: item.id, url: best.url, source });
        continue;
      }

      const { buf, ext, size } = await downloadFile(
        best.url,
        isOutsideMcu(item) ? MARVEL_DB_ORIGIN : MCU_WIKI_ORIGIN,
      );
      const destName = `${item.id}.${ext}`;
      const destPath = path.join(IMAGES_DIR, destName);

      for (const e of VALID_EXTENSIONS) {
        const other = path.join(IMAGES_DIR, `${item.id}.${e}`);
        if (other !== destPath && fs.existsSync(other)) fs.unlinkSync(other);
      }

      fs.writeFileSync(destPath, buf);
      console.log(`  ✓ ${destName} (${Math.round(size / 1024)} Ko)`);
      results.ok.push({ id: item.id, dest: destName, source });
      await sleep(isOutsideMcu(item) ? 700 : 250);
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
      console.log(
        `  - ${f.id}: ${f.reason}${f.page ? ` (${f.page})` : ""}${f.source ? ` [${f.source}]` : ""}`,
      );
    }
  }
  if (!apply && results.skip.length) {
    console.log("\nDry-run. Relancer avec --apply pour télécharger.");
  }

  void KEEP;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
