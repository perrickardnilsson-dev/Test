# Tranerås – Gården vid Skärsjön

Förstapersons bondgårds- och överlevnadsspel för webbläsaren, baserat på den
verkliga skogsfastigheten Traneråsvägen 201, Trensum, Karlshamn (56.3078N, 14.9441O)
med sjön Skärsjön ca 400 m nordväst (56.3102N, 14.9395O).

## Kommandon
- `npm install` – installera beroenden
- `npm run dev` – utvecklingsserver (Vite)
- `npm run build` – produktionsbygge till `dist/`
- `npm run preview` – servera produktionsbygget lokalt

## Nuläge
- **Etapp 1 klar**: prototypen (`prototype/traneras-garden.html`) är ombyggd till
  ett Vite-projekt med ES-moduler och three.js från npm. All spelmekanik och alla
  svenska texter är bevarade. Prototypen ligger kvar som facit för spellogiken.
- `PROMPT.md` beskriver måluppdraget: realistisk grafik (PBR-texturer, GLTF-modeller,
  vattenshader, Sky, post-processing). Nästa etapp är **etapp 2: terräng + texturer**.

## Arkitektur (src/)
Modulerna bildar en acyklisk importkedja, från grund till topp:

| Modul | Ansvar |
|---|---|
| `utils.js` | Matte-hjälpare och värdesbrus (`vnoise`) |
| `config.js` | Alla konstanter: värld, verktyg, priser, fröer, byggnader |
| `state.js` | Speltillståndet `S`, årstidshjälpare, `give()` |
| `scene.js` | Renderare, scen, kamera, ljus, stjärnor/måne/sol |
| `terrain.js` | `heightAt()`, marken med årstidsfärger, Skärsjöns vatten, vass |
| `vegetation.js` | Skogen (gran/tall/björk) och stenar som `InstancedMesh` |
| `farm.js` | Gårdsbebyggelsen: bostadshus, vedbod, brygga + `box()`-hjälparen |
| `player.js` | Spelarens rörelse, hopp, kamerastyrning, `keys` |
| `raycast.js` | Gemensam strålkastning från siktet (`rayHit`) |
| `farming.js` | Åkerrutor, sådd, vattning, tillväxt, `nearestPlot()` |
| `ui.js` | Meddelanden, paneler, hotbar, inventarie (importerar inga spelsystem) |
| `buildings.js` | Byggmeny, spökbygge, `makeBuilding()`, byggläget |
| `animals.js` | Vilt (rådjur/hare) och tamdjur (höna/får) |
| `hunting.js` | Pilbåge och pilar |
| `fishing.js` | Fiske i Skärsjön, isfiske på vintern |
| `economy.js` | Handlaren, bilen, köp/sälj |
| `weather.js` | Väder, himmel, dygnsljus, nederbördspartiklar |
| `days.js` | `sleep()`/`newDay()`: årstidsbyte, djurproduktion, handlarschema |
| `interactions.js` | Verktygsanvändning (vänsterklick) och interaktion (E) |
| `hud.js` | Mätare, klocka, pengar, kontextprompten |
| `input.js` | Tangentbord, mus, pekarlås, verktygsval |
| `main.js` | Spel-loopen, startskärmen, döden, stats.js i dev-läge |

Obs: `scene.js` stänger av `THREE.ColorManagement` för att behålla prototypens
utseende (byggd mot r128). Det tas bort i etapp 2+ när PBR-material införs.

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
2. ⬜ Terräng + texturer (PBR från Poly Haven, splatmap)
3. ⬜ Modeller + skog (GLTF från Quaternius, InstancedMesh + LOD)
4. ⬜ Vatten + himmel + post-processing
5. ⬜ Väder + årstider
6. ⬜ Ljud + spara (localStorage) + finputs, inställningsmeny med grafiknivåer
