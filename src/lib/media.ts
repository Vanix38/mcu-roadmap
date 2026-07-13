export const MCU_POSTER_EXTENSIONS = ["webp", "jpg", "jpeg", "png"] as const;

export function getMcuPosterSrc(id: string, extension: (typeof MCU_POSTER_EXTENSIONS)[number]) {
  return `/images/mcu/${id}.${extension}`;
}
