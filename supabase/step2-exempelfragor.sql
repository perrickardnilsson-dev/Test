-- =============================================================
-- STEG 2 av 2 – Lägg in 16 exempelfrågor
-- Kör ENDAST efter att step1-tabeller.sql lyckats!
-- Om du får "question_bank does not exist" har du hoppat över steg 1.
-- =============================================================

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'question_bank'
  ) then
    raise exception 'Kör step1-tabeller.sql först!';
  end if;
end $$;

insert into public.question_bank
  (owner_id, amne, arskurs, centralt_innehall, fragetyp, fragetext,
   alternativ, facit, bedomningsanvisning, niva, kalla, poang)
select * from (values

-- ---------------- BIOLOGI ----------------
(null::uuid, 'biologi', 9, 'Evolutionens mekanismer och organismers utveckling',
 'flerval_ett',
 'Vilken av följande är den viktigaste drivkraften bakom evolutionen enligt Darwins teori?',
 '["Naturligt urval", "Slumpmässiga miljöförändringar", "Att organismer anstränger sig för att utvecklas", "Att alla individer i en art förändras samtidigt"]'::jsonb,
 '{"typ": "flerval_ett", "korrekt_index": 0}'::jsonb,
 null, 'E', 'egen', 1),

(null, 'biologi', 8, 'Ekosystem och ekologiska samband',
 'flerval_flera',
 'Vilka av följande är exempel på abiotiska faktorer i ett ekosystem? Välj alla som stämmer.',
 '["Solljus", "Nedbrytare", "Vattentillgång", "Temperatur", "Växtätare"]'::jsonb,
 '{"typ": "flerval_flera", "korrekta_index": [0, 2, 3]}'::jsonb,
 null, 'E', 'egen', 2),

(null, 'biologi', 9, 'Arvsmassans uppbyggnad och genteknik',
 'kortsvar',
 'Vad kallas den molekyl som bär den genetiska informationen i våra celler?',
 null,
 '{"typ": "kortsvar", "godkanda_svar": ["DNA", "dna", "deoxiribonukleinsyra"]}'::jsonb,
 'Godkänt svar är DNA (deoxiribonukleinsyra).',
 'E', 'egen', 1),

(null, 'biologi', 9, 'Biologisk mångfald och hållbar utveckling',
 'fritext',
 'Förklara hur minskad biologisk mångfald kan påverka ett ekosystems förmåga att stå emot förändringar. Ge exempel i ditt resonemang.',
 null,
 '{"typ": "fritext", "exempelsvar": "Ett ekosystem med hög biologisk mångfald har fler arter som kan fylla liknande funktioner. Om en art försvinner kan andra ta över dess roll, vilket gör systemet motståndskraftigt. Vid låg mångfald blir ekosystemet känsligare, t.ex. om en pollinatör försvinner och inga andra kan pollinera växterna."}'::jsonb,
 'E: Eleven ger ett enkelt samband mellan mångfald och stabilitet. C: Eleven förklarar sambandet med relevant exempel och begreppet motståndskraft. A: Eleven resonerar nyanserat med flera exempel och kopplar till funktioner/nischer i ekosystemet.',
 'C', 'egen', 4),

-- ---------------- FYSIK ----------------
(null, 'fysik', 8, 'Krafter, rörelse och rörelseförändringar',
 'flerval_ett',
 'En bil kör med konstant hastighet på en rak väg. Vad gäller för de krafter som verkar på bilen?',
 '["Den resulterande kraften är noll", "Framåtkraften är större än friktionen", "Det verkar inga krafter alls på bilen", "Tyngdkraften är större än normalkraften"]'::jsonb,
 '{"typ": "flerval_ett", "korrekt_index": 0}'::jsonb,
 null, 'C', 'egen', 1),

(null, 'fysik', 9, 'Energiformer, energiomvandlingar och energikvalitet',
 'kortsvar',
 'Vilken enhet mäts energi i enligt SI-systemet?',
 null,
 '{"typ": "kortsvar", "godkanda_svar": ["joule", "J", "Joule"]}'::jsonb,
 'Godkänt svar är joule (J).',
 'E', 'egen', 1),

(null, 'fysik', 8, 'Elektricitet och magnetism',
 'flerval_flera',
 'Vilka av följande material leder elektrisk ström bra? Välj alla som stämmer.',
 '["Koppar", "Glas", "Aluminium", "Gummi", "Silver"]'::jsonb,
 '{"typ": "flerval_flera", "korrekta_index": [0, 2, 4]}'::jsonb,
 null, 'E', 'egen', 2),

(null, 'fysik', 9, 'Energiformer, energiomvandlingar och energikvalitet',
 'fritext',
 'Beskriv energiomvandlingarna som sker när du åker rutschkana från toppen till botten. Använd begreppen lägesenergi och rörelseenergi.',
 null,
 '{"typ": "fritext", "exempelsvar": "På toppen har du hög lägesenergi och låg rörelseenergi. När du åker nedåt omvandlas lägesenergin till rörelseenergi, så farten ökar. En del energi omvandlas också till värme på grund av friktion mellan kroppen och rutschkanan."}'::jsonb,
 'E: Eleven nämner att lägesenergi omvandlas till rörelseenergi. C: Eleven beskriver omvandlingen tydligt och kopplar till fartökningen. A: Eleven inkluderar även friktion/värme och resonerar om energins bevarande.',
 'C', 'egen', 4),

-- ---------------- KEMI ----------------
(null, 'kemi', 8, 'Materiens uppbyggnad: atomer, molekyler och joner',
 'flerval_ett',
 'Hur många protoner har en syreatom (O), som har atomnummer 8?',
 '["6", "8", "16", "2"]'::jsonb,
 '{"typ": "flerval_ett", "korrekt_index": 1}'::jsonb,
 null, 'E', 'egen', 1),

(null, 'kemi', 9, 'Syror, baser och pH',
 'flerval_ett',
 'Vilket pH-värde har en neutral lösning vid rumstemperatur?',
 '["0", "7", "14", "1"]'::jsonb,
 '{"typ": "flerval_ett", "korrekt_index": 1}'::jsonb,
 null, 'E', 'egen', 1),

(null, 'kemi', 9, 'Kemiska reaktioner och reaktionsformler',
 'kortsvar',
 'Vad bildas när ett ämne reagerar med syre vid en förbränning? Ange den generella typen av ämne.',
 null,
 '{"typ": "kortsvar", "godkanda_svar": ["oxider", "oxid", "en oxid", "metalloxider"]}'::jsonb,
 'Godkänt svar beskriver att det bildas oxider.',
 'C', 'egen', 1),

(null, 'kemi', 9, 'Kemin i vardagen och samhället: material och kretslopp',
 'fritext',
 'Förklara varför det är viktigt att sortera och återvinna metaller. Resonera om både resurser och miljö.',
 null,
 '{"typ": "fritext", "exempelsvar": "Metaller är en ändlig resurs som bryts ur malm. Genom att återvinna sparar vi råvaror och behöver bryta mindre malm, vilket minskar miljöpåverkan. Att smälta om återvunnen metall kräver dessutom mindre energi än att framställa ny metall, vilket minskar utsläppen."}'::jsonb,
 'E: Eleven nämner att metaller är en begränsad resurs eller att återvinning sparar råvaror. C: Eleven kopplar återvinning till både resurser och energi/miljö. A: Eleven resonerar utvecklat om kretslopp, energiåtgång och långsiktig hållbarhet.',
 'C', 'egen', 4),

-- ---------------- TEKNIK ----------------
(null, 'teknik', 7, 'Mekanismer, hållfasta och stabila konstruktioner',
 'flerval_ett',
 'Vilken geometrisk form ger störst stabilitet i en konstruktion, t.ex. i en bro eller en byggnadsställning?',
 '["Fyrkanten", "Triangeln", "Cirkeln", "Rektangeln"]'::jsonb,
 '{"typ": "flerval_ett", "korrekt_index": 1}'::jsonb,
 null, 'E', 'egen', 1),

(null, 'teknik', 8, 'Tekniska system och deras komponenter',
 'flerval_flera',
 'Vilka av följande är exempel på tekniska system i ett samhälle? Välj alla som stämmer.',
 '["Elnätet", "Vattenreningssystemet", "En regnbåge", "Vägnätet", "Solsystemet"]'::jsonb,
 '{"typ": "flerval_flera", "korrekta_index": [0, 1, 3]}'::jsonb,
 null, 'E', 'egen', 2),

(null, 'teknik', 9, 'Styrning och reglering med programmering',
 'kortsvar',
 'Vad kallas en komponent som känner av något i omgivningen, t.ex. temperatur eller ljus, och skickar en signal till ett tekniskt system?',
 null,
 '{"typ": "kortsvar", "godkanda_svar": ["sensor", "givare", "en sensor", "en givare"]}'::jsonb,
 'Godkänt svar är sensor eller givare.',
 'C', 'egen', 1),

(null, 'teknik', 9, 'Teknikens konsekvenser för individ, samhälle och miljö',
 'fritext',
 'Diskutera fördelar och nackdelar med ökad automatisering och robotisering i arbetslivet. Väg olika perspektiv mot varandra.',
 null,
 '{"typ": "fritext", "exempelsvar": "Fördelar är att robotar kan utföra tunga, farliga eller repetitiva arbeten, öka produktiviteten och sänka priser. Nackdelar är att jobb kan försvinna och att människor behöver omskolas. Ur ett miljöperspektiv kan tillverkning av robotar kräva resurser, men de kan också effektivisera och minska svinn."}'::jsonb,
 'E: Eleven ger minst en fördel och en nackdel. C: Eleven väger fördelar och nackdelar mot varandra med exempel. A: Eleven resonerar nyanserat ur flera perspektiv (individ, samhälle, miljö) och drar en underbyggd slutsats.',
 'A', 'egen', 4)

) as seed(owner_id, amne, arskurs, centralt_innehall, fragetyp, fragetext,
          alternativ, facit, bedomningsanvisning, niva, kalla, poang)
where not exists (
  select 1 from public.question_bank where owner_id is null
);

-- Klart! Kontrollera gärna under Database → Tables att tabellerna finns.
