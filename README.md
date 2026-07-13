# Tranerås – Gården vid Skärsjön

Förstapersons bondgårds- och överlevnadsspel för webbläsaren, byggt med
[Three.js](https://threejs.org) och [Vite](https://vite.dev). Odla, jaga i
skogen, fiska i Skärsjön, bygg ut gården – och överlev vintern i Blekinge.

## Kom igång

```bash
npm install
npm run setup      # hämta PBR-texturer (CC0) från Poly Haven – valfritt men rekommenderat
npm run setup:map  # hämta verklig höjddata + Skärsjöns/Traneråsvägens geometri – valfritt
npm run dev        # utvecklingsserver – öppna adressen som visas
npm run build      # produktionsbygge till dist/
npm run preview    # servera produktionsbygget lokalt
```

Kartan följer den verkliga platsen: gården på Traneråsvägen 201 med Skärsjön
mot nordväst och grusvägen förbi gårdens östsida. Verklig höjddata ingår
(`public/map/mapdata.json`); `npm run setup:map` kan dessutom hämta sjöns och
vägens exakta form från OpenStreetMap.

Höjddata: [Mapzen/AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
(öppna data, bl.a. Copernicus EU-DEM). Sjö-/väggeometri: © OpenStreetMap-bidragsgivare.

## Spela på mobilen (iPhone/iPad/Android)

Spelet har touchkontroller (virtuell joystick, dra för att titta, knappar för
verktyg och interaktion) och är en installerbar PWA.

**Spela direkt: https://perrickardnilsson-dev.github.io/Test/**

Öppna adressen i Safari på din iPhone och välj **Dela → Lägg till på
hemskärmen** – spelet får egen ikon, kör i helskärm och fungerar offline.
Workflowen `deploy.yml` bygger och publicerar automatiskt till gh-pages-grenen
vid varje push. Vill du senare till App Store wrappar du `dist/` med
Capacitor – kontrollerna återanvänds som de är.

Utan `npm run setup` används procedurellt genererade reservtexturer, så spelet
fungerar även offline. Vill du ha finare 3D-modeller (Quaternius, CC0) kör du
`npm run setup:models` och följer instruktionerna.

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
| Esc | Inställningar / stäng panel |

Spelet autosparas varje morgon (localStorage) – klicka **Fortsätt** på
startskärmen för att spela vidare. I inställningsmenyn (Esc) finns
grafiknivåer (låg/mellan/hög) och ljudvolym. Ljudet är procedurellt
syntetiserat med WebAudio och kräver inga nedladdningar.

## Projektet

- `src/` – spelet uppdelat i ES-moduler (se `CLAUDE.md` för arkitekturöversikt)
- `prototype/traneras-garden.html` – ursprungliga enfilsprototypen, facit för spellogiken
- `PROMPT.md` – måluppdraget med kvarvarande etapper (grafikuppgradering m.m.)
