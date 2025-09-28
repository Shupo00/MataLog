import { addHours, differenceInHours, parseISO } from "date-fns";

import { AkiItem, AkiLog, ThresholdSettings } from "@/lib/types";
import { average, clamp } from "@/lib/utils";

const DEFAULT_CADENCE_DAYS = 7;

export interface RiiComputation {
  score: number;
  sigmaDays: number;
  lastLog?: AkiLog;
  hoursSinceLast: number;
  noveltyFactor: number;
  nextPrimaryAt?: string;
  nextStrongAt?: string;
}

export function computeRii(
  item: AkiItem,
  logs: AkiLog[],
  now: Date = new Date()
): RiiComputation {
  const itemLogs = logs
    .filter((log) => log.itemId === item.id)
    .sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1));

  const lastLog = itemLogs[0];

  if (!lastLog) {
    return {
      score: 95,
      sigmaDays: determineSigmaDays(item),
      hoursSinceLast: 0,
      noveltyFactor: 1,
    };
  }

  const sigmaDays = determineSigmaDays(item);
  const sigmaHours = sigmaDays * 24;
  const hoursSinceLast = Math.max(
    0,
    differenceInHours(now, parseISO(lastLog.loggedAt))
  );
  const noveltyFactor = computeNoveltyFactor(itemLogs, sigmaHours);

  const baseScore = 100 * (1 - Math.exp(-hoursSinceLast / sigmaHours));
  const score = clamp(Math.round(baseScore * noveltyFactor), 0, 100);

  const nextPrimaryAt = predictNextFire(
    lastLog,
    sigmaHours,
    item.notifications.thresholds
  );

  return {
    score,
    sigmaDays,
    lastLog,
    hoursSinceLast,
    noveltyFactor,
    nextPrimaryAt: nextPrimaryAt.primary,
    nextStrongAt: nextPrimaryAt.strong,
  };
}

function determineSigmaDays(item: AkiItem): number {
  return Math.max(0.5, item.cadence.days ?? DEFAULT_CADENCE_DAYS);
}

function computeNoveltyFactor(itemLogs: AkiLog[], sigmaHours: number) {
  if (itemLogs.length < 3) return 1;
  const recent = itemLogs.slice(0, 3);
  const diffs: number[] = [];
  for (let i = 0; i < recent.length - 1; i += 1) {
    const current = parseISO(recent[i].loggedAt);
    const next = parseISO(recent[i + 1].loggedAt);
    diffs.push(Math.abs(differenceInHours(current, next)));
  }
  const avgGap = average(diffs);
  if (!avgGap) return 0.8;
  if (avgGap < sigmaHours / 3) return 0.82;
  if (avgGap < sigmaHours / 2) return 0.9;
  return 1;
}

function predictNextFire(
  lastLog: AkiLog,
  sigmaHours: number,
  thresholds: ThresholdSettings
) {
  const baseDate = parseISO(lastLog.loggedAt);
  const computeTime = (target: number) => {
    if (target >= 100) return undefined;
    const hours = -sigmaHours * Math.log(1 - target / 100);
    if (!Number.isFinite(hours)) return undefined;
    return addHours(baseDate, hours).toISOString();
  };

  return {
    primary: computeTime(thresholds.primary),
    strong: computeTime(thresholds.strong),
  };
}
