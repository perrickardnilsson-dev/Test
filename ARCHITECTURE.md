# Architecture

## Översikt

Modulär monolit för ett nordiskt tillverknings-ERP. En Next.js-process, en
PostgreSQL-databas, ingen event-buss över nätverk.

```
/app          Tunna routes — bara komposition
/core         Plattform (db, auth, modulregister, events, ui)
/modules      Affärsmoduler (inventory byggs på djupet; övriga stubbar)
/tests        Tvärgående tester (t.ex. tenant-isolering)
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

Varje kundföretag är en **organisation**. Alla affärstabeller har
`organizationId`. Databasåtkomst går via `getTenantDb(orgId)`, som sätter
`app.current_org` i en transaktion. PostgreSQL RLS (Fas 1) filtrerar på den
sessionvariabeln — säkerhetsnät om appkoden glömmer en `where`.

**ESLint:** direkt import av den råa db-klienten (`@/core/db/client`) i
`/modules` är förbjuden.

## Lagerbokföring (kommande)

All saldoförändring går genom `postStockTransaction()`. `stockBalance`
uppdateras aldrig direkt. Transaktioner är oföränderliga.

## Faser

Se `.cursor/rules/project.md` för fasordning (0–8). Detta dokument uppdateras
när plattformen växer.
