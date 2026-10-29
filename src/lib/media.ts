import posterManifest from "@/data/poster-manifest.json";

/** Préfixe GitHub Pages (ex. /mcu-roadmap) — vide en local */
export function withBasePath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
}

export const MCU_POSTER_EXTENSIONS = ["webp", "jpg", "jpeg", "png", "avif"] as const;

export type PosterManifestEntry = {
  ext: string;
  thumb: boolean;
};

export const POSTER_MANIFEST = posterManifest as Record<
  string,
  PosterManifestEntry
>;

export function getMcuPosterSrc(
  id: string,
  extension: (typeof MCU_POSTER_EXTENSIONS)[number],
) {
  return withBasePath(`/images/mcu-wiki/${id}.${extension}`);
}

export function getMcuPosterThumbSrc(id: string) {
  return withBasePath(`/images/mcu-thumbs/${id}.webp`);
}

/** URL affichage : vignette si dispo, sinon fichier wiki avec extension connue */
export function resolveMcuPosterSrc(
  id: string,
  quality: "thumb" | "full" = "thumb",
): string | null {
  const entry = POSTER_MANIFEST[id];
  if (!entry) return null;
  if (quality === "thumb" && entry.thumb) return getMcuPosterThumbSrc(id);
  return getMcuPosterSrc(
    id,
    entry.ext as (typeof MCU_POSTER_EXTENSIONS)[number],
  );
}

/** Logos studio — déposer dans `public/images/studios/{file}.(svg|webp|png)` */
export const STUDIO_LOGO_EXTENSIONS = ["svg", "webp", "png"] as const;

/**
 * Nom de fichier (sans extension) quand il diffère de l'id `studio`.
 * Ex. Marvel Studios → logo Disney ; ids kebab → fichiers underscore.
 */
export const STUDIO_LOGO_FILE: Record<string, string> = {
  marvel: "disney",
  "sony-animation": "sony_animation",
  "new-line": "new_line",
};

/** Extension réelle du logo (évite la cascade 404 svg→webp→png) */
export const STUDIO_LOGO_EXT: Record<
  string,
  (typeof STUDIO_LOGO_EXTENSIONS)[number]
> = {
  marvel: "png",
  fox: "png",
  sony: "png",
  "sony-animation": "svg",
  netflix: "png",
  abc: "png",
  freeform: "png",
  hulu: "webp",
  "new-line": "png",
  universal: "png",
  lionsgate: "png",
};

export function getStudioLogoFileBase(studio: string) {
  return STUDIO_LOGO_FILE[studio] ?? studio;
}

export function getStudioLogoSrc(
  studio: string,
  extension: (typeof STUDIO_LOGO_EXTENSIONS)[number],
) {
  const file = getStudioLogoFileBase(studio);
  return withBasePath(`/images/studios/${file}.${extension}`);
}

export function resolveStudioLogoSrc(studio: string): string | null {
  const ext = STUDIO_LOGO_EXT[studio];
  if (!ext) return null;
  return getStudioLogoSrc(studio, ext);
}
