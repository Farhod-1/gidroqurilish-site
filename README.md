# “Gidroquriliş buyurtmaçi xizmati” MÇJ — veb-sayt

Static site (HTML, CSS, vanilla JS). No build step.

## Run locally

```bash
python -m http.server 4310
```

Then open http://localhost:4310.

## Structure

- `index.html` — page markup; Uzbek text (new Latin alphabet) is the base language
- `js/i18n.js` — Russian and English translations, keyed by `data-i18n*` attributes
- `js/main.js` — language switch, accessibility tools, carousel, HPP map, photo viewer
- `css/style.css` — styles
- `assets/` — logo and photos

## Sources

- Region boundaries on the map: geoBoundaries (UZB ADM1), © OpenStreetMap contributors, ODbL
- Photos and plant data: “Özbekgidroenergo” AJ
