export const MCU_POSTER_EXTENSIONS = ["webp", "jpg", "jpeg", "png"] as const;

export function getMcuPosterSrc(id: string, extension: (typeof MCU_POSTER_EXTENSIONS)[number]) {
  return `/images/mcu/${id}.${extension}`;
}

/** Logos studio — déposer dans `public/images/studios/{studio}.(svg|webp|png)` */
export const STUDIO_LOGO_EXTENSIONS = ["svg", "webp", "png"] as const;

export function getStudioLogoSrc(
  studio: string,
  extension: (typeof STUDIO_LOGO_EXTENSIONS)[number],
) {
  return `/images/studios/${studio}.${extension}`;
}
