# Nordisk tillverknings-ERP

Pitch-prototyp under `/erp` i monorepot (NO-lärarplattformen äger repots rot —
se [`../MONOREPO.md`](../MONOREPO.md)).

Modulär monolit med **Lager & Artiklar** byggt på djupet.

Projektregler: [`../.cursor/rules/project.md`](../.cursor/rules/project.md)  
Arkitektur: [`ARCHITECTURE.md`](./ARCHITECTURE.md)  
**Deploy (Railway/Fly, alltid på):** [`DEPLOY.md`](./DEPLOY.md)

## Stack

- Next.js 15 (App Router), TypeScript strict
- PostgreSQL 16 + Drizzle ORM
- Better Auth + organization-plugin (Fas 1)
- Tailwind CSS + shadcn/ui-bas
- Vitest + Playwright (senare faser)

## Kom igång

```bash
cd erp
cp .env.example .env
npm install
npm run db:up          # Docker Compose → Postgres 16
npm run db:migrate
npm run dev            # http://localhost:3001
```

- App: http://localhost:3001
- Health: http://localhost:3001/health
- API: http://localhost:3001/api/health

## Skript

| Kommando | Beskrivning |
|---|---|
| `npm run dev` | Utvecklingsserver på port 3001 |
| `npm run lint` | ESLint (inkl. förbud mot rå db-import i modules) |
| `npm run test` | Vitest |
| `npm run db:up` | Starta Postgres |
| `npm run db:generate` | Generera migrationer |
| `npm run db:migrate` | Kör migrationer |

## Fasstatus

- [x] **Fas 0** — Skelett
- [x] **Fas 1** — Plattform (Better Auth, RLS, modulregister, layout, skapa-org)
- [x] **Fas 2** — Artikelregister (CRUD, varugrupper, listvy, CSV)
- [x] **Fas 3** — Lagerstruktur och saldon (lagerställen, platser, bokföring, rörelser)
- [x] **Fas 4** — Batch och individ (spårbarhet, genealogi, återkallningsdemo)
- [ ] Fas 5–8 — se project rules
