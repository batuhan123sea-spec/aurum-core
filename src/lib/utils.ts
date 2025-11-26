import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Yerel tarihi YYYY-MM-DD formatında döndür (Türkiye timezone'ı ile)
export const formatLocalDate = (date: Date): string => {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
};
