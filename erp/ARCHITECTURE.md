# Architecture

## Översikt

Modulär monolit för ett nordiskt tillverknings-ERP. Bor i `/erp` i monorepot
(NO-lärarplattformen lever parallellt i roten). En Next.js-process, en
PostgreSQL-databas, ingen event-buss över nätverk.

```
/erp/app          Tunna routes — bara komposition
/erp/core         Plattform (db, auth, modulregister, events, ui)
/erp/modules      Affärsmoduler (inventory byggs på djupet; övriga stubbar)
/erp/tests        Tvärgående tester (t.ex. tenant-isolering)
```

## Modulregister

Varje modul exporterar ett `ModuleManifest` (`id`, `name`, `nav`,
`permissions`, `schema`, valfri `seed` / `onEvent`). `/core` känner inte till
någon modul vid namn — registret läser manifests och bygger navigation och
behörigheter.

Regler:

- Moduler pratar via **events** eller publika service-funktioner.
- Ingen modul importerar en annan moduls databastabeller.
- Att lägga till en modul ska inte kräva ändringar i `/core`.

## Multi-tenancy

Varje kundföretag är en **organisation** (Better Auth organization-plugin).
Alla affärstabeller har `organizationId`. Databasåtkomst går via
`getTenantDb(orgId)`, som sätter `app.current_org` i en transaktion.
PostgreSQL RLS filtrerar på den sessionvariabeln — säkerhetsnät om appkoden
glömmer en `where`. Isolering bevisas av `tests/tenant-isolation.test.ts`
(kräver Postgres).

**ESLint:** direkt import av den råa db-klienten (`@/core/db/client`) i
`/modules` är förbjuden.

## Auth & app-shell (Fas 1)

- Better Auth med e-post/lösenord + organisationer
- Routes: `/logga-in`, `/registrera`, `/skapa-organisation`, `/{orgSlug}/…`
- Modulregistret (`bootstrapModules`) bygger sidomeny och ⌘K-kommandopalett
- Stubbmoduler syns som "Kommer snart"

## Lagerbokföring (kommande Fas 3)

All saldoförändring går genom `postStockTransaction()`. `stockBalance`
uppdateras aldrig direkt. Transaktioner är oföränderliga.

## Artikelregister (Fas 2)

- CRUD med progressiv avslöjning (fyra basfält + "Fler inställningar")
- Varugrupper (hierarkiska)
- Listvy med sök, filter, sparade vyer (TanStack Table)
- CSV-import (`partNumber,description,unit,type,...`)
- Schema och services i `/modules/inventory` — övriga moduler importerar inte tabellerna

## Faser

Se `.cursor/rules/project.md` för fasordning (0–8). Detta dokument uppdateras
när plattformen växer.
