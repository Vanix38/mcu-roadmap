# Logos / titres MCU

Dépose ici les images de titres (format paysage).

## Nommage

Utilise l'`id` depuis `src/data/mcu.json` :

- `iron-man-2008.png`
- `the-avengers-2012.jpg`
- `captain-america-civil-war-2016.webp`

Extensions supportées : `.webp`, `.jpg`, `.jpeg`, `.png`

## Téléchargement auto (wiki Fandom)

Les fichiers sont écrits dans `public/images/mcu-wiki/` (séparé des logos paysage de ce dossier).

```bash
npm run images:fetch                 # dry-run (manquants)
npm run images:fetch:apply           # télécharge les manquants
node scripts/fetch-mcu-posters.mjs --apply --force   # écrase tout
node scripts/fetch-mcu-posters.mjs --only=iron-man-2008 --apply
node scripts/fetch-mcu-posters.mjs --prefer=logo --apply
```

Source : [MCU Wiki](https://marvelcinematicuniverse.fandom.com/). Images sous copyright — usage perso/dev uniquement.
