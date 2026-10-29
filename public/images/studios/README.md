# Logos studios

Dépose ici les logos des studios. Tant qu’un fichier est absent, la pastille texte (`MS`, `FOX`…) s’affiche.

## Nommage

Par défaut : `{id-studio}.(svg|webp|png)` où `id-studio` = champ `studio` dans `mcu.json`.

Exceptions (voir `STUDIO_LOGO_FILE` dans `src/lib/media.ts`) :

| Fichier | Studio (`mcu.json`) |
|---------|---------------------|
| `disney.png` | `marvel` (Marvel Studios) |
| `fox.png` | `fox` |
| `sony.png` | `sony` |
| `sony_animation.svg` | `sony-animation` |
| `netflix.png` | `netflix` |
| `abc.png` | `abc` |
| `freeform.png` | `freeform` |
| `hulu.webp` | `hulu` |
| `new_line.png` | `new-line` |
| `universal.png` | `universal` |
| `lionsgate.png` | `lionsgate` |

Extensions essayées dans l’ordre : `.svg` → `.webp` → `.png`

## Conseils

- Format carré ou paysage compact (idéalement ~64–128 px)
- Fond transparent recommandé (SVG / PNG)
- Contraste lisible sur fond sombre
- Éviter les PNG multi-Mo (pastille ~24–32 px à l’écran)
