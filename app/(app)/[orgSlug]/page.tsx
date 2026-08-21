type Props = {
  params: Promise<{ orgSlug: string }>;
};

/**
 * Tenant-app under /[orgSlug] — layout och kommandopalett byggs i Fas 1.
 */
export default async function OrgHomePage({ params }: Props) {
  const { orgSlug } = await params;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-xl font-semibold">Organisation</h1>
      <p className="mt-2 font-mono text-sm text-muted-foreground">{orgSlug}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        App-shell, sidomeny och kommandopalett kommer i Fas 1.
      </p>
    </main>
  );
}
