# Lager & Artiklar

Modulen som byggs på djupet. Datamodell och publikt kontrakt fylls i från Fas 2.

## Publikt kontrakt (planerat)

- Artikelregister (CRUD)
- Lagerställen och lagerplatser
- Transaktionsbokföring via `postStockTransaction`
- Spårbarhet (batch/individ + genealogi)
- Nettobehovskörning (MRP)
- Inventering

## Schema

Ägs av denna modul. Övriga moduler får inte importera tabellerna direkt —
använd events eller publika service-funktioner.
