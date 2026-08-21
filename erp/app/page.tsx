import Link from "next/link";
import { Button } from "@/core/ui/components/button";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(199_40%_92%)_0%,_transparent_55%),linear-gradient(160deg,_hsl(210_20%_98%)_0%,_hsl(210_16%_94%)_100%)]"
      />
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <p className="mb-3 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Pitch-prototyp · Fas 1
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Nordisk tillverknings-ERP
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Modulär monolit för lager, artiklar och nettobehov — byggd för
          produktionschefer som vill färre klick, inte fler skärmar.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/logga-in">Logga in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/registrera">Skapa konto</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/health">Systemstatus</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
