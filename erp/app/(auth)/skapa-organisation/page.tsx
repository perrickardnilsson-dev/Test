import { redirect } from "next/navigation";
import { getSession } from "@/core/auth";
import { CreateOrganizationForm } from "./create-org-form";

export default async function CreateOrganizationPage() {
  const session = await getSession();
  if (!session) {
    redirect("/logga-in");
  }

  const activeSlug =
    session.session.activeOrganizationId &&
    // om aktiv org finns, låt användaren gå vidare via listan i nästa steg
    null;

  void activeSlug;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Skapa organisation</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ett nytt kundföretag ska kunna skapas på sekunder. Du är inloggad som{" "}
        {session.user.email}.
      </p>
      <div className="mt-8">
        <CreateOrganizationForm />
      </div>
    </main>
  );
}
