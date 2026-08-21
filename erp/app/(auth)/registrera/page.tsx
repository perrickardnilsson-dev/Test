import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Skapa konto</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sedan skapar du ditt företag (organisation) på sekunder.
      </p>
      <div className="mt-8">
        <RegisterForm />
      </div>
    </main>
  );
}
