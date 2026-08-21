import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: string | null): string {
  if (!value) return "–";
  return new Date(value).toLocaleString("sv-SE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatDate(value: string | null): string {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("sv-SE");
}
