import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Bot,
  FileCheck2,
  GraduationCap,
  Upload,
  Users,
} from "lucide-react";

export default async function HomePage() {
  const profile = await getProfile();
  if (profile) {
    redirect(profile.role === "teacher" ? "/larare" : "/elev");
  }

  const features = [
    {
      icon: Upload,
      title: "Tolka nationella prov",
      text: "Ladda upp frisläppta NP-PDF:er och låt AI extrahera frågor, alternativ och facit till din frågebank.",
    },
    {
      icon: Bot,
      title: "Generera prov i NP-stil",
      text: "Blanda riktiga frågor med AI-genererade i samma stil, för ämne, årskurs och centralt innehåll enligt Lgr22.",
    },
    {
      icon: FileCheck2,
      title: "AI-stödd rättning",
      text: "Flerval rättas automatiskt, fritext får AI-förslag med motivering som du granskar och godkänner.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <GraduationCap className="h-6 w-6 text-primary" />
          NO-provplattform
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link href="/logga-in">Logga in</Link>
          </Button>
          <Button asChild>
            <Link href="/registrera">Kom igång</Link>
          </Button>
        </div>
      </header>

      <main className="container">
        <section className="py-16 md:py-24 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mb-6">
            <BookOpen className="h-4 w-4" />
            För NO-lärare i biologi, fysik, kemi och teknik
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            Skapa, genomför och rätta NO-prov – med stöd av AI
          </h1>
          <p className="mt-6 text-lg text-slate-600">
            Bygg digitala prov baserade på gamla frisläppta nationella prov.
            Eleverna gör proven i ett rent provläge, och du rättar snabbare med
            AI-förslag som du alltid har sista ordet om.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/registrera">Skapa lärarkonto</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/logga-in">Jag har redan ett konto</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3 pb-20">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-white p-6 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.text}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border bg-white p-8 md:p-12 mb-20 flex flex-col md:flex-row items-start gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-primary mb-3">
              <Users className="h-5 w-5" />
              <span className="font-medium">Elever</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Enkelt för eleverna att delta
            </h2>
            <p className="mt-3 text-slate-600">
              Eleverna registrerar sig med en klasskod eller en inbjudningslänk,
              gör tilldelade prov med autosparande svar, och ser resultat och
              motiveringar först när du publicerat rättningen.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/registrera?roll=student">Registrera dig som elev</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container text-sm text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
          <span>NO-provplattform · Byggd för svensk grundskola</span>
          <span>
            GDPR-anpassad · endast namn och e-post lagras om eleverna
          </span>
        </div>
      </footer>
    </div>
  );
}
