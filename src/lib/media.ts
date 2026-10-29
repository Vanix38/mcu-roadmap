/** Préfixe GitHub Pages (ex. /mcu-roadmap) — vide en local */
export function withBasePath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!path.startsWith("/")) return `${base}/${path}`;
  return `${base}${path}`;
}

export const MCU_POSTER_EXTENSIONS = ["webp", "jpg", "jpeg", "png", "avif"] as const;

export function getMcuPosterSrc(id: string, extension: (typeof MCU_POSTER_EXTENSIONS)[number]) {
  return withBasePath(`/images/mcu-wiki/${id}.${extension}`);
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
