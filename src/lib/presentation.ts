import { AkiItem } from "@/lib/types";

export function describeCadence(item: AkiItem) {
  const days = item.cadence.days;
  if (days < 1) {
    const hours = Math.round(days * 24);
    return `${hours}時間ごと`;
  }
  if (Number.isInteger(days)) {
    if (days === 7) return "1週間ごと";
    if (days === 14) return "2週間ごと";
    if (days === 30) return "1か月ごと";
    return `${days}日ごと`;
  }
  return `${days.toFixed(1)}日ごと`;
}

export function describeThresholds(item: AkiItem) {
  const primary = item.notifications.thresholds.primary;
  const strong = item.notifications.thresholds.strong;
  if (!item.notifications.strongEnabled) {
    return `通知しきい値 ${primary}`;
  }
  return `通知しきい値 ${primary}/${strong}`;
}
