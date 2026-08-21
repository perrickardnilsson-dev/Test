# Lager & Artiklar

Modulen som byggs på djupet.

## Publikt kontrakt

### Fas 2 — Artiklar
- `listParts` / `getPart` / `createPart` / `updatePart`
- `listPartGroups` / `createPartGroup`
- `listSavedPartViews` / `savePartView` / `deleteSavedPartView`
- `createPartsBulk` + CSV-parser i `domain/csv.ts`

### Fas 3 — Lager
- `listWarehouses` / `createWarehouse` / `updateWarehouse`
- `listStockLocations` / `createStockLocation` / `updateStockLocation`
- `postStockTransaction` (enda vägen till saldoändring)
- `listStockBalances` / `listStockTransactions`
- Domän: `planStockPosting`, `weightedAverageCost`, `applyReservation`

### Fas 4 — Spårbarhet
- `listBatches` / `createBatch`
- `listSerialUnits` / `createSerialUnit`
- `createGenealogyEdge` / `traceGenealogy`
- `seedRecallDemo`
- Domän: `assertTraceabilityRequirement`, `buildGenealogyTree`, `summarizeTraceImpact`

Server actions i `actions.ts` (anropas från UI).

### Fas 5 — BOM & nettobehov
- `listBoms` / `getBomWithLines` / `getBomTree` / `createBom` / `updateBom`
- `upsertBomLine` / `deleteBomLine` / `recalculateLowLevelCodes`
- `listDemandLines` / `listSupplyLines` / `createDemandLine` / `createSupplyLine`
- `executeNetRequirementRun` / `listNetRequirementRuns` / `listPlanningSuggestions`
- `updateSuggestionStatuses` / `seedMrpDemo`
- Domän: `calculateLowLevelCodes`, `buildBomTree`, `explodeBomLevel`, `runMrp`, `applyLotSizing`

### Fas 6 — Inventering
- `listInventoryCounts` / `getInventoryCount` / `createInventoryCount`
- `recordCountLine` / `recordCountByPartNumber` (streckkod/mobil)
- `submitInventoryCount` / `approveAndPostInventoryCount` / `cancelInventoryCount`
- Domän: `computeLineVariance`, `summarizeCount`, `assertCountTransition`, `adjustmentQuantity`
- Justeringar bokförs via `planStockPosting({ type: "count", … })` med `referenceType: "count"`

### Fas 7 — Mobilt lager
- UI: `/{org}/mobilt` — inleverans / utleverans / räkning
- `BarcodeScanner` — `BarcodeDetector` om tillgänglig, annars `@zxing/browser`
- Använder `postManualReceiptAction` / `postManualIssueAction` / `recordCountByPartAction`

### Fas 8 — Pitch
- `seedPitchDemo` — MAIN + A-01/A-02/B-01, ~90 artiklar, ~25 BOM, 6 mån behov, saldon, öppen inventering
- `getPitchDashboard` — bristlista, behov 14 dagar, lagervärde, död lager
- Startsida `/{org}` visar pitch-dashboard + seed-knapp

Server actions i `actions.ts` (anropas från UI).

## Schema

Ägs av denna modul (`schema.ts`):

| Tabell | Syfte |
|---|---|
| `part` | Artikelregister |
| `part_group` | Hierarkiska varugrupper |
| `saved_part_view` | Sparade listvyer per användare |
| `warehouse` | Lagerställe |
| `stock_location` | Lagerplats |
| `batch` | Batch / charge |
| `serial_unit` | Individ / serienummer |
| `genealogy_edge` | Spårbarhetsgraf |
| `stock_balance` | Materialiserat saldo (endast via bokföring) |
| `stock_transaction` | Oföränderlig huvudbok |
| `bom` | Artikelstruktur (revision/status) |
| `bom_line` | BOM-komponentrader |
| `demand_line` | Tidsatta behov för MRP |
| `supply_line` | Tidsatt tillgång för MRP |
| `net_requirement_run` | NBK-/MRP-körning |
| `planning_suggestion` | Förslag med pegging |
| `inventory_count` | Inventeringshuvud |
| `inventory_count_line` | Inventeringsrad (förväntat vs räknat) |

Övriga moduler får **inte** importera tabellerna direkt — använd events eller
publika service-funktioner.

## Värdering

Vägt genomsnittspris. Vid inleverans:
`nyttSnitt = (gammaltVärde + inlevereratVärde) / nyttAntal`.
Uttag sker till aktuellt snittpris. FIFO kan komma senare.

## UI

- `/{org}/artiklar` — listvy med sök, filter, sparade vyer, CSV-import
- `/{org}/artiklar/ny` — skapa med progressiv avslöjning
- `/{org}/artiklar/[id]` — redigera
- `/{org}/varugrupper` — varugruppsregister
- `/{org}/lagerstallen` — lagerställen
- `/{org}/lagerplatser` — lagerplatser
- `/{org}/lager` — lagersaldo
- `/{org}/lager/rorelse` — manuell in/ut/flytt (batch/serie när krävt)
- `/{org}/lager/historik` — transaktionshistorik
- `/{org}/batcher` — batchregister
- `/{org}/individer` — serienummer
- `/{org}/sparbarhet` — spårning bakåt/framåt + återkallningsdemo
- `/{org}/strukturer` — BOM-redigerare med trädvy
- `/{org}/planering` — NBK, förslag, pegging, bulk acceptera/förkasta
- `/{org}/inventering` — inventeringslista och detalj (godkänn & bokför)
- `/{org}/inventering/[id]/mobil` — touch-vänlig räkning
- `/{org}/mobilt` — mobilt lager (in/ut/räkna + streckkod)
- `/{org}` — pitch-dashboard
