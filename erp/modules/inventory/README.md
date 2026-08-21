# Lager & Artiklar

Modulen som byggs på djupet.

## Publikt kontrakt (Fas 2)

- `listParts` / `getPart` / `createPart` / `updatePart`
- `listPartGroups` / `createPartGroup`
- `listSavedPartViews` / `savePartView` / `deleteSavedPartView`
- `createPartsBulk` + CSV-parser i `domain/csv.ts`
- Server actions i `actions.ts` (anropas från UI)

## Schema

Ägs av denna modul (`schema.ts`):

| Tabell | Syfte |
|---|---|
| `part` | Artikelregister |
| `part_group` | Hierarkiska varugrupper |
| `saved_part_view` | Sparade listvyer per användare |

Övriga moduler får **inte** importera tabellerna direkt — använd events eller
publika service-funktioner.

## UI

- `/{org}/artiklar` — listvy med sök, filter, sparade vyer, CSV-import
- `/{org}/artiklar/ny` — skapa med progressiv avslöjning
- `/{org}/artiklar/[id]` — redigera
- `/{org}/varugrupper` — varugruppsregister
