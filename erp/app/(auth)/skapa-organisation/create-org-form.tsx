"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/core/auth/client";
import { Button } from "@/core/ui/components/button";
import { Input } from "@/core/ui/components/input";
import { Label } from "@/core/ui/components/label";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function CreateOrganizationForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const finalSlug = slug || slugify(name);
    const { data, error: err } = await authClient.organization.create({
      name,
      slug: finalSlug,
    });
    setPending(false);
    if (err || !data) {
      setError(err?.message ?? "Kunde inte skapa organisation");
      return;
    }
    await authClient.organization.setActive({
      organizationId: data.id,
    });
    router.push(`/${data.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org-name">Företagsnamn</Label>
        <Input
          id="org-name"
          required
          placeholder="t.ex. Nordverk AB"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="org-slug">URL-slug</Label>
        <Input
          id="org-slug"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
        />
        <p className="text-xs text-muted-foreground">
          Appen nås på /{slug || "ditt-foretag"}
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending || !name || !slug}>
        {pending ? "Skapar…" : "Skapa organisation"}
      </Button>
    </form>
  );
}
