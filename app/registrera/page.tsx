import Link from "next/link";
import { Suspense } from "react";
import { GraduationCap } from "lucide-react";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 py-12">
      <Link
        href="/"
        className="flex items-center gap-2 font-semibold text-lg mb-8"
      >
        <GraduationCap className="h-6 w-6 text-primary" />
        NO-provplattform
      </Link>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
