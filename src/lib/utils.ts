import { format, formatDistanceStrict, isToday, isYesterday, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export function cn(...values: Array<string | undefined | false | null>) {
  return values.filter(Boolean).join(" ");
}

export function toNumber(value: number | undefined | null, fallback: number) {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

export function formatIso(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString();
}

export function formatDateLabel(value: string) {
  const date = parseISO(value);
  if (isToday(date)) return "今日";
  if (isYesterday(date)) return "昨日";
  return format(date, "M月d日");
}

export function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "yyyy/MM/dd HH:mm");
}

export function formatRelative(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return formatDistanceStrict(date, new Date(), { addSuffix: true, roundingMethod: "ceil", locale: ja });
}

export function hoursBetween(a: Date, b: Date) {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((acc, cur) => acc + cur, 0) / values.length;
}

export function sum(values: number[]) {
  return values.reduce((acc, cur) => acc + cur, 0);
}

export function scoreToHex(score: number) {
  if (score >= 85) return "#34D399";
  if (score >= 70) return "#86EFAC";
  if (score >= 40) return "#FCD34D";
  return "#FCA5A5";
}

export function formatScoreColor(score: number) {
  if (score >= 85) return "bg-[#34D399]";
  if (score >= 70) return "bg-[#86EFAC]";
  if (score >= 40) return "bg-[#FCD34D]";
  return "bg-[#FCA5A5]";
}

export function formatScoreRing(score: number) {
  const degree = Math.round((clamp(score, 0, 100) / 100) * 360);
  const hex = scoreToHex(score);
  return {
    background: "conic-gradient(" +
      hex +
      " " +
      degree +
      "deg, rgba(15, 15, 15, 0.08) " +
      degree +
      "deg)"
  };
}

