# Nordisk tillverknings-ERP

Pitch-prototyp: molnbaserat affärssystem för små och medelstora tillverkande
företag i Norden. Modulär monolit med **Lager & Artiklar** byggt på djupet.

Projektregler och fasplan: [`.cursor/rules/project.md`](.cursor/rules/project.md).
Arkitektur: [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Stack

- Next.js 15 (App Router), TypeScript strict
- PostgreSQL 16 + Drizzle ORM
- Better Auth (Fas 1)
- Tailwind CSS + shadcn/ui-bas
- Vitest + Playwright (senare faser)

## Kom igång

```bash
cp .env.example .env
npm install
npm run db:up          # Docker Compose → Postgres 16
npm run dev
```

- App: http://localhost:3000
- Health: http://localhost:3000/health
- API: http://localhost:3000/api/health

## Skript

| Kommando | Beskrivning |
|---|---|
| `npm run dev` | Utvecklingsserver |
| `npm run lint` | ESLint (inkl. förbud mot rå db-import i modules) |
| `npm run test` | Vitest |
| `npm run db:up` | Starta Postgres |
| `npm run db:generate` | Generera migrationer |
| `npm run db:migrate` | Kör migrationer |

## Fasstatus

- [x] **Fas 0** — Skelett
- [ ] Fas 1 — Plattform (auth, RLS, modulregister, layout)
- [ ] Fas 2 — Artikelregister
- [ ] Fas 3–8 — se project rules
