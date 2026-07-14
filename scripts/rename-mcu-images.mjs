/**
 * Renomme les logos MCU vers {id}.{ext}
 *
 * Usage:
 *   node scripts/rename-mcu-images.mjs          # dry-run
 *   node scripts/rename-mcu-images.mjs --apply  # renommer
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MCU_JSON = path.join(ROOT, "src", "data", "mcu.json");
const IMAGES_DIR = path.join(ROOT, "public", "images", "mcu");
const VALID_EXTENSIONS = new Set(["webp", "jpg", "jpeg", "png"]);
const KEEP = new Set(["README.md", ".gitkeep"]);

const apply = process.argv.includes("--apply");

const validIds = new Set(
  JSON.parse(fs.readFileSync(MCU_JSON, "utf8")).map((item) => item.id),
);

/** source filename → target filename */
const RENAME_MAP = new Map([
  ["Logo_spider_man_no_way_homepng.png", "spider-man-no-way-home-2021.png"],
  ["The_Amazing_Spider-Man_2_Logo.png", "the-amazing-spider-man-2-2014.png"],
  ["agathaallalong_log_def_03.webp", "agatha-all-along-2024.webp"],
  ["ant-man_lob_log_04.webp", "ant-man-2015.webp"],
  ["ant-manandthewasp_lob_log_03.webp", "ant-man-and-the-wasp-2018.webp"],
  ["antmanandthewaspquantumania_lob_log_def_03.webp", "ant-man-quantumania-2023.webp"],
  ["avengersageofultron_lob_log_03.webp", "avengers-age-of-ultron-2015.webp"],
  ["avengersdoomsday_lob_log_def_02.webp", "avengers-doomsday-2026.webp"],
  ["avengersendgame_lob_log_01_1.webp", "avengers-endgame-2019.webp"],
  ["avengersinfinitywar_lob_log_03.webp", "avengers-infinity-war-2018.webp"],
  ["blackpanther_lob_log_03.webp", "black-panther-2018.webp"],
  ["blackpantherwakandaforever_lob_log_def_04.webp", "black-panther-wakanda-forever-2022.webp"],
  ["blackwidow_lob_log_def_06.webp", "black-widow-2021.webp"],
  ["captainamericabravenewworld_lob_log_def_03.webp", "captain-america-brave-new-world-2025.webp"],
  ["captainamericacivilwar_lob_log_02_0.webp", "captain-america-civil-war-2016.webp"],
  ["captainamericathefirstavenger_lob_log_03.webp", "captain-america-the-first-avenger-2011.webp"],
  ["captainamericathewintersoldier_lob_log_04_1200px.webp", "captain-america-the-winter-soldier-2014.webp"],
  ["captainmarvel_lob_log_06_0.webp", "captain-marvel-2019.webp"],
  ["daredevilbornagain_lob_log_def_03.webp", "daredevil-born-again-s1-2025.webp"],
  ["daredevilbornagains2_lob_log_def_01.webp", "daredevil-born-again-s2-2026.webp"],
  ["darkphoenix_lob_log_def_01.webp", "x-men-dark-phoenix-2019.webp"],
  ["deadpoolandwolverine_lob_log_def_03.webp", "deadpool-wolverine-2024.webp"],
  ["doctorstrange_lob_log_03.webp", "doctor-strange-2016.webp"],
  ["doctorstrangeinthemultiverseofmadness_lob_log_def_02.webp", "doctor-strange-mom-2022.webp"],
  ["echo_lob_log_def_01.webp", "echo-2024.webp"],
  ["eternals_lob_log_def_04.webp", "eternals-2021.webp"],
  ["eyesofwakanda_lob_log_def_02.webp", "eyes-of-wakanda-2025.webp"],
  ["falcws_lob_log_def_03.webp", "falcon-winter-soldier-2021.webp"],
  ["fox_deadpool2_lob_log_def_01.webp", "deadpool-2-2018.webp"],
  ["fox_deadpool_lob_log_def_01.webp", "deadpool-2016.webp"],
  ["fox_logan_lob_log_def_01.webp", "logan-2017.webp"],
  ["fox_x-menapocalypse_lob_log_def_01_0.webp", "x-men-apocalypse-2016.webp"],
  ["fox_x-mendaysoffuturepast_lob_log_def_01.webp", "x-men-days-of-future-past-2014.webp"],
  ["guardiansofthegalaxyvol2_lob_log_03.webp", "guardians-of-the-galaxy-vol-2-2017.webp"],
  ["guardiansofthegalaxyvolume3_lob_log_def_03.webp", "guardians-of-the-galaxy-vol-3-2023.webp"],
  ["hawkeye_lob_log_def_01.webp", "hawkeye-2021.webp"],
  ["iamgroot_lob_log_def_04.webp", "i-am-groot-2022.webp"],
  ["ironheart_lob_log_def_04.webp", "ironheart-2025.webp"],
  ["ironman2_lob_log_03.webp", "iron-man-2-2010.webp"],
  ["ironman3_lob_log_03_0.webp", "iron-man-3-2013.webp"],
  ["ironman_lob_log_03.webp", "iron-man-2008.webp"],
  ["lokis2_lob_log_def_01.webp", "loki-s2-2023.webp"],
  ["marvelzombies_lob_log_def_03.webp", "marvel-zombies-2025.webp"],
  ["moonknight_lob_log_def_03.webp", "moon-knight-2022.webp"],
  ["msmarvel_lob_log_def_01_0.webp", "ms-marvel-2022.webp"],
  ["secretinvasion_lob_log_def_03.webp", "secret-invasion-2023.webp"],
  ["shangchi_lob_log_def_03_0.webp", "shang-chi-2021.webp"],
  ["shehulk_lob_log_def_04.webp", "she-hulk-2022.webp"],
  ["sn_lob_log_def_01_0.webp", "avengers-secret-wars-2027.webp"],
  ["spider-man2_lob_log_def_01.webp", "spider-man-2-2004.webp"],
  ["spider-man3_lob_log_def_01.webp", "spider-man-3-2007.webp"],
  ["spider-man_lob_log_def_01.webp", "spider-man-2002.webp"],
  ["spider-manfarfromhome_lob_log_def_02.webp", "spider-man-far-from-home-2019.webp"],
  ["spider-manhomecoming_lob_log_def_02.webp", "spider-man-homecoming-2017.webp"],
  ["spidermanbrandnewday_lob_log_def_01.webp", "spider-man-brand-new-day-2026.webp"],
  ["theamazingspider-man_lob_log_def_01.webp", "the-amazing-spider-man-2012.webp"],
  ["theavengers_lob_log_03.webp", "the-avengers-2012.webp"],
  ["thefantasticfourfirststeps_lob_log_def_03.webp", "fantastic-four-first-steps-2025.webp"],
  ["theguardiansofthegalaxyholidayspecial_lob_log_def_02.webp", "gotg-holiday-special-2022.webp"],
  ["theincrediblehulk_lob_log_def_04.webp", "the-incredible-hulk-2008.webp"],
  ["themarvels_lob_log_def_02.webp", "the-marvels-2023.webp"],
  ["thepunisheronelastkill_lob_log_def_01.webp", "punisher-one-last-kill-2026.webp"],
  ["thor_lob_log_03.webp", "thor-2011.webp"],
  ["thorlat_lob_log_def_04.webp", "thor-love-and-thunder-2022.webp"],
  ["thorragnarok_lob_log_03.webp", "thor-ragnarok-2017.webp"],
  ["thorthedarkworld_lob_log_03.webp", "thor-the-dark-world-2013.webp"],
  ["wandavision_lob_log_def_01.webp", "wandavision-2021.webp"],
  ["werewolfbynight_lob_log_def_01.webp", "werewolf-by-night-2022.webp"],
  ["whatif_lob_log_def_01.webp", "what-if-s1-2021.webp"],
  ["whatifs3_lob_log_def_01.webp", "what-if-s3-2024.webp"],
  ["wonderman_lob_log_def_01.webp", "wonder-man-2026.webp"],
  ["yourfriendlyneighborhoodspiderman_lob_log_def_03_0.webp", "your-friendly-neighborhood-spiderman-s1-2025.webp"],
  ["iamgroots2_lob_log_def_02.webp", "i-am-groot-s2-2023.webp"],
  ["xmen97-log_def-900x500.webp", "x-men-97-s1-2024.webp"],
  ["xmen97s2_lob_log_def_01.webp", "x-men-97-s2-2026.webp"],
  ["venom_lob_log_def_01.webp", "venom-2018.webp"],
  ["Venom_Let_There_Be_Carnage.webp", "venom-let-there-be-carnage-2021.webp"],
  ["Venom_-_The_Last_Dance_logo.png", "venom-the-last-dance-2024.png"],
  ["Kraven_le_Chasseur_(film).png", "kraven-the-hunter-2024.png"],
  ["x2.png", "x2-2003.png"],
  ["last-stand.png", "x-men-last-stand-2006.png"],
  ["first-class.webp", "x-men-first-class-2011.webp"],
  ["origins.png", "x-men-origins-wolverine-2009.png"],
  ["wolverine.png", "the-wolverine-2013.png"],
  ["new-mutants.webp", "the-new-mutants-2020.webp"],
]);

function isCorrectlyNamed(filename) {
  const parsed = path.parse(filename);
  const ext = parsed.ext.slice(1).toLowerCase();
  return VALID_EXTENSIONS.has(ext) && validIds.has(parsed.name);
}

function validateTarget(target) {
  const parsed = path.parse(target);
  const ext = parsed.ext.slice(1).toLowerCase();
  if (!VALID_EXTENSIONS.has(ext)) {
    throw new Error(`Extension invalide: ${target}`);
  }
  if (!validIds.has(parsed.name)) {
    throw new Error(`ID inconnu dans mcu.json: ${parsed.name}`);
  }
}

let renamed = 0;
let skipped = 0;
const errors = [];
const unmapped = [];

for (const [from, to] of RENAME_MAP) {
  try {
    validateTarget(to);
  } catch (error) {
    errors.push(`${from}: ${error.message}`);
    continue;
  }

  const src = path.join(IMAGES_DIR, from);
  const dest = path.join(IMAGES_DIR, to);

  if (!fs.existsSync(src)) {
    if (fs.existsSync(dest)) {
      skipped += 1;
      continue;
    }
    errors.push(`Manquant: ${from}`);
    continue;
  }

  if (fs.existsSync(dest)) {
    errors.push(`Cible déjà présente: ${to} (source: ${from})`);
    continue;
  }

  if (apply) {
    fs.renameSync(src, dest);
  }
  console.log(`${apply ? "✓" : "→"} ${from}  =>  ${to}`);
  renamed += 1;
}

const files = fs
  .readdirSync(IMAGES_DIR)
  .filter((file) => fs.statSync(path.join(IMAGES_DIR, file)).isFile() && !KEEP.has(file));

for (const file of files) {
  if (RENAME_MAP.has(file)) continue;
  if (isCorrectlyNamed(file)) continue;
  unmapped.push(file);
}

console.log(`\n${apply ? "Renommés" : "À renommer"}: ${renamed}`);
console.log(`Déjà OK / source absente: ${skipped}`);

if (errors.length > 0) {
  console.log(`\nProblèmes (${errors.length}):`);
  for (const msg of errors) console.log(`  - ${msg}`);
}

if (unmapped.length > 0) {
  console.log(`\nSans mapping (${unmapped.length}):`);
  for (const file of unmapped.sort()) console.log(`  - ${file}`);
}

const targetIds = new Set([...RENAME_MAP.values()].map((f) => path.parse(f).name));
const currentFiles = apply
  ? fs.readdirSync(IMAGES_DIR).filter((f) => !KEEP.has(f))
  : files;
const namedIds = new Set(
  currentFiles
    .filter(isCorrectlyNamed)
    .map((f) => path.parse(f).name),
);
for (const id of targetIds) namedIds.add(id);

const missing = [...validIds].filter((id) => !namedIds.has(id)).sort();
console.log(`\nLogos manquants (${missing.length}):`);
for (const id of missing) console.log(`  - ${id}`);

if (!apply && renamed > 0) {
  console.log("\nDry-run. Relancer avec --apply pour renommer.");
}
