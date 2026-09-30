# Affiches MCU (UI)

Assets canoniques de l’interface — format portrait ~2:3.

## Nommage

Utilise l'`id` depuis `src/data/mcu.json` :

- `iron-man-2008.webp`
- `the-avengers-2012.jpg`
- `spider-noir-2026.webp`

Extensions supportées : `.webp`, `.jpg`, `.jpeg`, `.png`, `.avif`

## Téléchargement auto (wiki Fandom)

```bash
npm run images:fetch                 # dry-run (manquants)
npm run images:fetch:apply           # télécharge les manquants
node scripts/fetch-mcu-posters.mjs --apply --force   # écrase tout
node scripts/fetch-mcu-posters.mjs --only=iron-man-2008 --apply
```

Source : [MCU Wiki](https://marvelcinematicuniverse.fandom.com/) (Marvel Studios) + [Marvel Database](https://marvel.fandom.com/) (hors MCU). Images sous copyright — usage perso/dev uniquement.
