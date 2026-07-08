# Tranerås – Gården vid Skärsjön

Förstapersons bondgårds- och överlevnadsspel för webbläsaren, baserat på den
verkliga skogsfastigheten Traneråsvägen 201, Trensum, Karlshamn (56.3078N, 14.9441O)
med sjön Skärsjön ca 400 m nordväst (56.3102N, 14.9395O).

## Kommandon
- `npm install` – installera beroenden
- `npm run setup` – ladda ner PBR-texturer (CC0) från Poly Haven till `public/textures/`
- `npm run setup:models` – instruktioner för GLTF-modeller + uppdatera `public/models/manifest.json`
- `npm run dev` – utvecklingsserver (Vite)
- `npm run build` – produktionsbygge till `dist/`
- `npm run preview` – servera produktionsbygget lokalt

## Nuläge
- **Etapp 1 klar**: prototypen (`prototype/traneras-garden.html`) är ombyggd till
  ett Vite-projekt med ES-moduler och three.js från npm. All spelmekanik och alla
  svenska texter är bevarade. Prototypen ligger kvar som facit för spellogiken.
- **Etapp 2 klar**: terrängen är chunkad med LOD (48/16/6 segment per 50 m-chunk,
  kjolar döljer springor) och har ett PBR-splatmaterial: gräs, skogsmark, berg och
  grus blandas per fragment efter höjd/lutning/väg/sjö – samma regler som
  prototypens vertexfärger. Årstider (höstton, snö) sätts via shader-uniforms.
  Texturer hämtas från Poly Haven med `npm run setup`; saknas de genereras
  procedurella reservtexturer i koden, så spelet fungerar utan nedladdning.
- **Etapp 3 klar**: skogen är tätare (800 träd) med detaljerade procedurella
  modeller i två LOD-nivåer (hög geometri inom 70 m, enkel bortom) som
  ombucketeras när spelaren rör sig. Stammar och stenar har PBR-texturer via
  texturregistret (`textures.js`). Djuren har bättre modeller med enkel gång-,
  hopp- och gunganimation; fårens ull växer synligt. Läggs GLTF-modeller
  (Quaternius CC0) i `public/models/` används de i stället – kör
  `npm run setup:models` för instruktioner och manifestuppdatering.
- **Etapp 4 klar**: Skärsjön har three:s Water-shader (planar reflektion,
  procedurell vågnormalkarta, solglitter) som byts mot en ismesh på vintern.
  Himlen är three:s Sky (Preetham-spridning + procedurella moln styrda av
  vädret) med ACES-tonmappning, månljus nattetid och kvarvarande stjärnor/måne.
  Post-processing via EffectComposer: MSAA, HDR-klämning, diskret bloom,
  vinjett och färgtoning per årstid. OBS: Sky-boxen är utbytt mot en sfär –
  boxens jättetrianglar klipps trasigt (vit kil). SSAO/CSM medvetet bortvalda
  tills grafikinställningarna i etapp 6.
- `PROMPT.md` beskriver måluppdraget. Nästa etapp är **etapp 5: väder +
  årstider** (finputs – grunderna finns redan).

## Arkitektur (src/)
Modulerna bildar en acyklisk importkedja, från grund till topp:

| Modul | Ansvar |
|---|---|
| `utils.js` | Matte-hjälpare och värdesbrus (`vnoise`) |
| `config.js` | Alla konstanter: värld, verktyg, priser, fröer, byggnader |
| `state.js` | Speltillståndet `S`, årstidshjälpare, `give()` |
| `scene.js` | Renderare, scen, kamera, ljus, stjärnor/måne/sol |
| `terrain.js` | `heightAt()`, chunkad LOD-terräng (`updateTerrain`), vassen |
| `water.js` | Skärsjöns vatten (Water-shader) och vinterns is, `setLakeWinter()` |
| `sky.js` | Fysisk himmel (Sky) med moln, månljus, `setSkyState()` |
| `post.js` | EffectComposer: bloom, vinjett, årstidston, `setSeasonGrade()` |
| `terrain-material.js` | PBR-splatshader (gräs/skog/berg/grus) + årstids-uniforms |
| `fallback-textures.js` | Procedurella reservtexturer när Poly Haven-filer saknas |
| `textures.js` | Texturregister: reservtextur först, Poly Haven-fil när den finns |
| `models.js` | GLTF-register: läser `/models/manifest.json`, `cloneNormalized()` |
| `vegetation.js` | Skogen (gran/tall/björk) och stenar: `InstancedMesh` i två LOD-nivåer |
| `farm.js` | Gårdsbebyggelsen: bostadshus, vedbod, brygga + `box()`-hjälparen |
| `player.js` | Spelarens rörelse, hopp, kamerastyrning, `keys` |
| `raycast.js` | Gemensam strålkastning från siktet (`rayHit`) |
| `farming.js` | Åkerrutor, sådd, vattning, tillväxt, `nearestPlot()` |
| `ui.js` | Meddelanden, paneler, hotbar, inventarie (importerar inga spelsystem) |
| `buildings.js` | Byggmeny, spökbygge, `makeBuilding()`, byggläget |
| `animals.js` | Vilt (rådjur/hare) och tamdjur (höna/får), gång-/hoppanimation |
| `hunting.js` | Pilbåge och pilar |
| `fishing.js` | Fiske i Skärsjön, isfiske på vintern |
| `economy.js` | Handlaren, bilen, köp/sälj |
| `weather.js` | Väder, himmel, dygnsljus, nederbördspartiklar |
| `days.js` | `sleep()`/`newDay()`: årstidsbyte, djurproduktion, handlarschema |
| `interactions.js` | Verktygsanvändning (vänsterklick) och interaktion (E) |
| `hud.js` | Mätare, klocka, pengar, kontextprompten |
| `input.js` | Tangentbord, mus, pekarlås, verktygsval |
| `main.js` | Spel-loopen, startskärmen, döden, stats.js i dev-läge |

I dev-läge finns `window.__traneras` med debughandtag (S, newDay, setWeather,
player m.m.) – praktiskt för att testa årstider och väder från konsolen och
för automatiska webbläsartester.

## Arbetsregler
- Jobba i etapperna som listas sist i PROMPT.md, en i taget. Testa i webbläsaren
  (npm run dev) innan nästa etapp påbörjas.
- Behåll ALL spelmekanik och alla svenska texter från prototypen.
- Prestandakrav: 60 fps på en vanlig laptop. Använd InstancedMesh, LOD och stats.js
  (stats.js visas automatiskt i dev-läge, uppe till höger).
- Endast fria tillgångar: Poly Haven (CC0) för texturer, Quaternius (CC0) för modeller,
  CC0-ljud. Lägg nedladdning i ett setup-skript, checka inte in stora binärer utan tanke.
- Ingen localStorage-varning gäller här (det var en begränsning i prototypmiljön) –
  sparfunktion med localStorage SKA läggas till (etapp 6).

## Etapper (från PROMPT.md)
1. ✅ Projektuppsättning + flytta in prototypens logik i moduler
2. ✅ Terräng + texturer (PBR från Poly Haven, splatmap, chunk/LOD)
3. ✅ Modeller + skog (InstancedMesh + LOD; GLTF från Quaternius via `public/models/`)
4. ✅ Vatten + himmel + post-processing (Water, Sky+moln, ACES, bloom/vinjett/årstidston)
5. ⬜ Väder + årstider
6. ⬜ Ljud + spara (localStorage) + finputs, inställningsmeny med grafiknivåer
