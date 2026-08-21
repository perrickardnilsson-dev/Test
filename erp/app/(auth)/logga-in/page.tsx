import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Logga in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Nordisk tillverknings-ERP — pitch-prototyp.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </main>
  );
}
