# Test-monorepo

Två appar lever **parallellt** i samma repo:

| App | Sökväg | Port (dev) | Beskrivning |
|---|---|---|---|
| **NO-lärarplattform** | repo-roten | `3000` | Befintlig plattform för NO-lärare (prov, frågebank, rättning) |
| **Nordisk tillverknings-ERP** | [`/erp`](./erp) | `3001` | Pitch-prototyp: modulär monolit med Lager & Artiklar på djupet |

## NO-lärarplattform (rot)

Se [README.md](./README.md) längre ned / den ursprungliga dokumentationen i detta repo.
Kort start:

```bash
npm install
npm run dev
```

## ERP (`/erp`)

Projektregler: [`.cursor/rules/project.md`](./.cursor/rules/project.md)  
Arkitektur: [`erp/ARCHITECTURE.md`](./erp/ARCHITECTURE.md)

```bash
cd erp
cp .env.example .env
npm install
npm run db:up    # Docker Compose → Postgres 16
npm run dev      # http://localhost:3001
```

**Viktigt:** ERP får inte ersätta lärarplattformen. Ändringar i `/erp` och i roten ska kunna samexistera.
