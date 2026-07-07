# Prompt: Tranerås för Claude Code (realistisk grafik)

**Förberedelser:**
1. Skapa en mapp, t.ex. `traneras-spelet`, och lägg `traneras-garden.html` i den.
2. Öppna terminalen i mappen och kör `claude`.
3. Klistra in allt nedanför linjen.

---

I den här mappen ligger `traneras-garden.html` – en fungerande prototyp av ett förstapersons bondgårds- och överlevnadsspel i Three.js. Din uppgift är att bygga om den till ett riktigt webbprojekt med markant bättre, mer realistisk grafik, och behålla all spelmekanik.

## Plats (verklig – bygg troget)
Skogsfastighet vid Traneråsvägen 201, Trensum, Karlshamn, Blekinge (56.3078°N, 14.9441°Ö). Sjön Skärsjön ligger ca 400 m nordväst (56.3102°N, 14.9395°Ö). Tät blandskog av gran, tall och björk, kuperad terräng med berghällar, grusväg förbi tomten, faluröd gårdsbebyggelse.

## Projektstruktur
- Vite + Three.js (senaste versionen) som npm-projekt med ES-moduler.
- Dela upp koden i moduler: `terrain.js`, `vegetation.js`, `player.js`, `farming.js`, `animals.js`, `weather.js`, `economy.js`, `ui.js` osv.
- Skapa en `CLAUDE.md` med byggkommandon och arkitekturöversikt.
- `npm run dev` ska starta spelet, `npm run build` ska ge en statisk mapp som går att lägga på vilken webbserver som helst.

## Grafikuppgradering (viktigast!)
1. **PBR-texturer** från Poly Haven (CC0, hämta via deras API/nedladdningslänkar i ett setup-skript): skogsmark med mossa, barrmatta, gräs, grus till vägen, bark, granit. Använd color + normal + roughness, gärna AO. Blanda markmaterial med splatmap baserad på höjd/lutning (gräs, berg, strand, väg).
2. **3D-modeller (GLTF)**: gran, tall, björk, stenar, rådjur, hare, höna, får från Quaternius (CC0) eller liknande fria källor. Rendera skogen med InstancedMesh och LOD så det förblir 60 fps.
3. **Vatten**: Three.js `Water` (examples/jsm) på Skärsjön med reflektion, vågnormalmap och solglitter. Is med egen shader på vintern.
4. **Himmel & ljus**: `Sky` från examples/jsm med fysisk solspridning, dag/natt-cykel, månljus, stjärnor. Mjuka kaskadskuggor (CSM) från solen.
5. **Post-processing** med EffectComposer: bloom (diskret), SSAO, vinjett, färgtoning per årstid, djupdimma mellan trädstammarna. God rays genom skogen i gryningen om det håller prestandan.
6. **Väderpartiklar**: regn och snö som GPU-partiklar, dimbankar över sjön på morgonen.
7. **Detaljer nära marken**: gräs-billboards/instansierat gräs, mossa på stenar, vass vid stranden, fallna stockar.

## Terräng
Generera terrängen proceduralt som i prototypen, men med högre upplösning nära spelaren (chunk/LOD). **Bonus om du hinner**: hämta verklig höjddata för området från Lantmäteriets öppna geodata eller OpenTopography och använd som höjdkarta, så att Skärsjöns verkliga form och terrängen runt Tranerås stämmer.

## Spelmekanik – behåll allt från prototypen
Hunger/energi/hälsa, odling (potatis/morot/korn, vattning, årstidsregler), höns och får, jakt med pilbåge på rådjur och hare, fiske i Skärsjön (isfiske på vintern), byggande (staket, hönshus, förråd, växthus, rökeri), fyra årstider med snö och frysande sjö, handlare som kommer med bil var tredje dag, svenskt gränssnitt. Läs prototypen för exakta värden och flöden.

Lägg till:
- Sparfunktion med localStorage (fungerar i riktig webbläsare).
- Ljud: fågelkvitter, vind i träden, yxhugg, plask, regn (fria ljud från freesound/CC0).
- Inställningsmeny med grafiknivåer (låg/mellan/hög) så det går att köra på svagare datorer.

## Arbetssätt
Jobba i etapper och testa i webbläsaren mellan varje: (1) projektuppsättning + flytta in prototypens logik i moduler, (2) terräng + texturer, (3) modeller + skog, (4) vatten + himmel + post-processing, (5) väder + årstider, (6) ljud + spara + finputs. Håll 60 fps som krav på en vanlig laptop, mät med stats.js under utveckling.
