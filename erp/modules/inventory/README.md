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
