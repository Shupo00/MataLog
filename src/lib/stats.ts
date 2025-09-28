import {
  eachDayOfInterval,
  isSameDay,
  parseISO,
  startOfDay,
  subDays
} from "date-fns";

import { AkiItem, AkiLog, DashboardStats } from "@/lib/types";
import { computeRii } from "@/lib/rii";
import { average } from "@/lib/utils";

export interface HeatmapCell {
  date: string;
  count: number;
}

export interface CadenceDriftRow {
  itemId: string;
  name: string;
  targetDays: number;
  averageGapDays: number;
  deltaDays: number;
}

export function calculateDashboardStats(
  items: AkiItem[],
  logs: AkiLog[]
): DashboardStats {
  const today = startOfDay(new Date());
  const weekAgo = subDays(today, 6);
  const monthAgo = subDays(today, 29);

  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;
  const byCategory: Record<string, number> = {};

  logs.forEach((log) => {
    const date = parseISO(log.loggedAt);
    if (isSameDay(date, today)) todayCount += 1;
    if (date >= weekAgo) weekCount += 1;
    if (date >= monthAgo) monthCount += 1;
  });

  items.forEach((item) => {
    const itemLogs = logs.filter((log) => log.itemId === item.id);
    byCategory[item.category] = (byCategory[item.category] ?? 0) + itemLogs.length;
  });

  return {
    todayCount,
    weekCount,
    monthCount,
    byCategory
  };
}

export function buildHeatmapData(logs: AkiLog[], days = 30): HeatmapCell[] {
  const today = startOfDay(new Date());
  const interval = { start: subDays(today, days - 1), end: today };
  const range = eachDayOfInterval(interval);

  return range.map((date) => {
    const count = logs.filter((log) =>
      isSameDay(parseISO(log.loggedAt), date)
    ).length;
    return { date: date.toISOString(), count };
  });
}

export function calculateCadenceDrift(
  items: AkiItem[],
  logs: AkiLog[]
): CadenceDriftRow[] {
  return items.map((item) => {
    const itemLogs = logs
      .filter((log) => log.itemId === item.id)
      .sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1));

    const targetDays = targetIntervalDays(item);

    if (itemLogs.length < 2) {
      return {
        itemId: item.id,
        name: item.name,
        targetDays,
        averageGapDays: 0,
        deltaDays: targetDays
      };
    }

    const gaps: number[] = [];
    for (let i = 0; i < itemLogs.length - 1 && i < 5; i += 1) {
      const current = parseISO(itemLogs[i].loggedAt);
      const next = parseISO(itemLogs[i + 1].loggedAt);
      const gap = Math.abs(current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }

    const avgGap = gaps.length ? average(gaps) : 0;
    return {
      itemId: item.id,
      name: item.name,
      targetDays,
      averageGapDays: avgGap,
      deltaDays: avgGap ? avgGap - targetDays : targetDays
    };
  });
}

export function selectItemRii(
  item: AkiItem,
  logs: AkiLog[],
  now: Date = new Date()
) {
  return computeRii(item, logs, now);
}

function targetIntervalDays(item: AkiItem) {
  return Math.max(0.5, item.cadence.days);
}

