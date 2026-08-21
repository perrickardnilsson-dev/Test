import type { Subject } from "@/lib/types";

/**
 * Centralt innehåll för årskurs 7–9 enligt Lgr22 (förenklat urval av
 * arbetsområden som lärare kan välja mellan vid provgenerering).
 */
export const CENTRALT_INNEHALL: Record<Subject, string[]> = {
  biologi: [
    "Evolutionens mekanismer och organismers utveckling",
    "Ekosystem och ekologiska samband",
    "Biologisk mångfald och hållbar utveckling",
    "Kroppens organsystem och deras funktion",
    "Virus, bakterier och smittspridning",
    "Sexualitet, reproduktion och genetik",
    "Arvsmassans uppbyggnad och genteknik",
    "Naturvetenskapliga undersökningar och fältstudier",
  ],
  fysik: [
    "Krafter, rörelse och rörelseförändringar",
    "Tryck i vätskor och gaser",
    "Energiformer, energiomvandlingar och energikvalitet",
    "Elektricitet och magnetism",
    "Ljus, ljud och vågrörelser",
    "Värme och temperatur",
    "Universums uppbyggnad och utveckling",
    "Fysikaliska undersökningar, mätningar och systematiska observationer",
  ],
  kemi: [
    "Materiens uppbyggnad: atomer, molekyler och joner",
    "Partikelmodellen och aggregationsformer",
    "Kemiska reaktioner och reaktionsformler",
    "Syror, baser och pH",
    "Kolatomens kemi och organiska ämnen",
    "Kemin i vardagen och samhället: material och kretslopp",
    "Vatten och lösningar",
    "Kemiska undersökningar, laborationer och riskbedömning",
  ],
  teknik: [
    "Tekniska lösningar och deras funktion",
    "Mekanismer, hållfasta och stabila konstruktioner",
    "Styrning och reglering med programmering",
    "Tekniska system och deras komponenter",
    "Teknikutvecklingsarbetets faser",
    "Dokumentation med skisser, ritningar och modeller",
    "Teknikens konsekvenser för individ, samhälle och miljö",
    "Material, deras egenskaper och användning",
  ],
};
