type Props = {
  params: Promise<{ orgSlug: string }>;
  children?: never;
};

/** Placeholder för modulvyer innan Fas 2+. */
export default async function ComingSoonCatchAll({
  params,
}: {
  params: Promise<{ orgSlug: string; modulePath?: string[] }>;
}) {
  const { orgSlug } = await params;
  void orgSlug;
  return (
    <div>
      <h1 className="text-xl font-semibold">Kommer snart</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Den här vyn fylls i när respektive fas byggs. Modulregistret visar den
        redan i navigationen.
      </p>
    </div>
  );
}

// silence unused Props helper for now
void (null as unknown as Props);
