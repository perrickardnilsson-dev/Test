# Tranerås – Gården vid Skärsjön

Förstapersons bondgårds- och överlevnadsspel för webbläsaren, byggt med
[Three.js](https://threejs.org) och [Vite](https://vite.dev). Odla, jaga i
skogen, fiska i Skärsjön, bygg ut gården – och överlev vintern i Blekinge.

## Kom igång

```bash
npm install
npm run dev      # utvecklingsserver – öppna adressen som visas
npm run build    # produktionsbygge till dist/
npm run preview  # servera produktionsbygget lokalt
```

## Styrning

| Tangent | Funktion |
|---|---|
| W A S D | Gå |
| Shift | Spring |
| Mellanslag | Hoppa |
| Mus | Se dig omkring |
| Vänsterklick | Använd verktyg |
| 1–7 | Välj verktyg |
| E | Interagera |
| Tab | Inventarie |
| Q | Byt frö |
| Esc | Stäng panel |

## Projektet

- `src/` – spelet uppdelat i ES-moduler (se `CLAUDE.md` för arkitekturöversikt)
- `prototype/traneras-garden.html` – ursprungliga enfilsprototypen, facit för spellogiken
- `PROMPT.md` – måluppdraget med kvarvarande etapper (grafikuppgradering m.m.)
