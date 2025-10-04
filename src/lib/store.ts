"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { create } from "zustand";

import {
  AkiItem,
  AkiLog,
  AkiState,
  CadenceSettings,
  NotificationSettings,
  UserPreferences,
} from "@/lib/types";
import { formatIso } from "@/lib/utils";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseBrowserClient } from "@/lib/supabase/client";

export interface CreateItemPayload {
  name: string;
  category: string;
  icon?: string;
  cadence: CadenceSettings;
  notifications?: Partial<NotificationSettings>;
  notes?: string;
}

export interface UpdateItemPayload {
  name?: string;
  category?: string;
  icon?: string;
  cadence?: Partial<CadenceSettings>;
  notifications?: Partial<NotificationSettings>;
  notes?: string | null;
}

export interface CreateLogPayload {
  itemId: string;
  satisfaction?: number;
  note?: string;
  loggedAt?: Date;
}

type Supabase = SupabaseBrowserClient;
type TypedSupabase = SupabaseClient<Database, "public">;

interface AkiStoreState extends AkiState {
  hasHydrated: boolean;
  isLoading: boolean;
  hydrate: (client: Supabase, userId: string) => Promise<void>;
  addItem: (client: Supabase, userId: string, payload: CreateItemPayload) => Promise<string | null>;
  updateItem: (client: Supabase, id: string, payload: UpdateItemPayload) => Promise<void>;
  deleteItem: (client: Supabase, id: string) => Promise<void>;
  addLog: (client: Supabase, userId: string, payload: CreateLogPayload) => Promise<void>;
  deleteLog: (client: Supabase, logId: string) => Promise<void>;
  updatePreferencesRemote: (
    client: Supabase,
    userId: string,
    prefs: Partial<UserPreferences>
  ) => Promise<void>;
  setPreferencesLocal: (prefs: Partial<UserPreferences>) => void;
  clear: () => void;
}

const defaultPreferences: UserPreferences = {
  timezone:
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC",
  primaryThresholdDefault: 70,
  strongThresholdDefault: 85,
  notifyHourStart: 9,
  notifyHourEnd: 21,
  notifyChannel: "both",
  dndStart: null,
  dndEnd: null,
  weeklyDigestWeekday: null,
};

const initialState: AkiState = {
  items: [],
  logs: [],
  preferences: defaultPreferences,
};

function cast(client: Supabase): TypedSupabase {
  return client as unknown as TypedSupabase;
}

export const useAkiStore = create<AkiStoreState>((set, get) => ({
  ...initialState,
  hasHydrated: false,
  isLoading: false,
  async hydrate(client, userId) {
    if (!userId || get().isLoading) return;

    set({ isLoading: true });

    try {
      const supa = cast(client);
      const [itemsResult, logsResult, prefsResult] = await Promise.all([
        supa
          .from("items")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false }),
        supa
          .from("logs")
          .select("*")
          .eq("user_id", userId)
          .order("at", { ascending: false })
          .limit(500),
        supa
          .from("preferences")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (itemsResult.error) {
        console.error("Failed to fetch items", itemsResult.error);
      }
      if (logsResult.error) {
        console.error("Failed to fetch logs", logsResult.error);
      }
      if (prefsResult.error) {
        console.error("Failed to fetch preferences", prefsResult.error);
      }

      const itemsData =
        (itemsResult.data ?? []) as Database["public"]["Tables"]["items"]["Row"][];
      const logsData =
        (logsResult.data ?? []) as Database["public"]["Tables"]["logs"]["Row"][];
      const prefsRow =
        (prefsResult.data as Database["public"]["Tables"]["preferences"]["Row"] | null) ??
        null;

      const items = itemsData.map(mapDbItemToAkiItem);
      const logs = logsData.map(mapDbLogToAkiLog);

      const preferences = prefsRow
        ? {
            ...defaultPreferences,
            timezone: prefsRow.timezone ?? defaultPreferences.timezone,
            primaryThresholdDefault: prefsRow.primary_threshold_default,
            strongThresholdDefault: prefsRow.strong_threshold_default,
            notifyHourStart: prefsRow.notify_hour_start,
            notifyHourEnd: prefsRow.notify_hour_end,
            notifyChannel: prefsRow.notify_channel ?? defaultPreferences.notifyChannel,
            dndStart: prefsRow.dnd_start,
            dndEnd: prefsRow.dnd_end,
            weeklyDigestWeekday: prefsRow.weekly_digest_weekday,
          }
        : defaultPreferences;

      set({
        items,
        logs,
        preferences,
        hasHydrated: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },
  async addItem(client, userId, payload) {
    const supa = cast(client);
    const preferences = get().preferences;

    const icon = normalizeInsertableString(payload.icon);
    const notes = normalizeInsertableString(payload.notes);
    const cadenceDays = normalizeCadenceDays(payload.cadence.days);

    const insertPayload: Database["public"]["Tables"]["items"]["Insert"] = {
      user_id: userId,
      name: payload.name,
      category: payload.category,
      icon,
      cadence_days: cadenceDays,
      notifications_enabled: payload.notifications?.enabled ?? true,
      notify_web_push: payload.notifications?.channels?.webPush ?? true,
      notify_email: payload.notifications?.channels?.email ?? false,
      notify_strong: payload.notifications?.strongEnabled ?? false,
      threshold_primary:
        payload.notifications?.thresholds?.primary ??
        preferences.primaryThresholdDefault,
      threshold_strong:
        payload.notifications?.thresholds?.strong ??
        preferences.strongThresholdDefault,
      notes,
    };

    const { data, error } = await supa
      .from("items")
      .insert(insertPayload)
      .select()
      .single();

    if (error || !data) {
      console.error("Failed to insert item", error);
      return null;
    }

    const itemRow = data as Database["public"]["Tables"]["items"]["Row"];
    set((state) => ({ items: [mapDbItemToAkiItem(itemRow), ...state.items] }));
    return data.id;
  },
  async updateItem(client, id, payload) {
    const supa = cast(client);
    const existing = get().items.find((item) => item.id === id);
    if (!existing) return;

    const notificationSettings = payload.notifications
      ? mergeNotificationSettings(
          payload.notifications,
          get().preferences,
          existing.notifications
        )
      : existing.notifications;

    const cadenceDays = normalizeCadenceDays(
      payload.cadence?.days ?? existing.cadence.days
    );

    const icon =
      payload.icon === undefined
        ? existing.icon ?? null
        : normalizeInsertableString(payload.icon);
    const notes =
      payload.notes === undefined
        ? existing.notes ?? null
        : normalizeInsertableString(payload.notes);

    const updatePayload: Database["public"]["Tables"]["items"]["Update"] = {
      name: payload.name ?? existing.name,
      category: payload.category ?? existing.category,
      icon,
      notes,
      cadence_days: cadenceDays,
      notifications_enabled: notificationSettings.enabled,
      notify_web_push: notificationSettings.channels.webPush,
      notify_email: notificationSettings.channels.email,
      notify_strong: notificationSettings.strongEnabled,
      threshold_primary: notificationSettings.thresholds.primary,
      threshold_strong: notificationSettings.thresholds.strong,
    };

    const { data, error } = await supa
      .from("items")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      console.error("Failed to update item", error);
      return;
    }

    const updatedItem = mapDbItemToAkiItem(
      data as Database["public"]["Tables"]["items"]["Row"]
    );

    set((state) => ({
      items: state.items.map((item) => (item.id === id ? updatedItem : item)),
    }));

    await invokeRecalcNextFire(client, id);
  },
  async deleteItem(client, id) {
    const supa = cast(client);
    const { error } = await supa.from("items").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete item", error);
      return;
    }

    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      logs: state.logs.filter((log) => log.itemId !== id),
    }));
  },
  async addLog(client, userId, payload) {
    const supa = cast(client);
    const baseDate = payload.loggedAt ?? new Date();
    const timestamp = formatIso(baseDate);

    const insertPayload: Database["public"]["Tables"]["logs"]["Insert"] = {
      user_id: userId,
      item_id: payload.itemId,
      at: timestamp,
      satisfaction:
        typeof payload.satisfaction === "number" ? payload.satisfaction : null,
      note: normalizeInsertableString(payload.note),
    };

    const { data, error } = await supa
      .from("logs")
      .insert(insertPayload)
      .select()
      .single();

    if (error || !data) {
      console.error("Failed to insert log", error);
      return;
    }

    const logRow = data as Database["public"]["Tables"]["logs"]["Row"];

    set((state) => {
      const newLog = mapDbLogToAkiLog(logRow);
      const logs = [newLog, ...state.logs].sort(
        (a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
      );

      const items = state.items.map((item) =>
        item.id === payload.itemId ? { ...item, updatedAt: timestamp } : item
      );

      return { logs, items };
    });

    await invokeRecalcNextFire(client, payload.itemId);
  },
  async deleteLog(client, logId) {
    const supa = cast(client);
    const targetLog = get().logs.find((log) => log.id === logId);
    const { error } = await supa.from("logs").delete().eq("id", logId);

    if (error) {
      console.error("Failed to delete log", error);
      return;
    }

    set((state) => ({ logs: state.logs.filter((log) => log.id !== logId) }));

    if (targetLog) {
      await invokeRecalcNextFire(client, targetLog.itemId);
    }
  },
  async updatePreferencesRemote(client, userId, prefs) {
    const supa = cast(client);
    const currentPrefs = get().preferences;
    const payload: Database["public"]["Tables"]["preferences"]["Insert"] = {
      user_id: userId,
      primary_threshold_default:
        prefs.primaryThresholdDefault ?? currentPrefs.primaryThresholdDefault,
      strong_threshold_default:
        prefs.strongThresholdDefault ?? currentPrefs.strongThresholdDefault,
      notify_hour_start: prefs.notifyHourStart ?? currentPrefs.notifyHourStart,
      notify_hour_end: prefs.notifyHourEnd ?? currentPrefs.notifyHourEnd,
      timezone: prefs.timezone ?? currentPrefs.timezone,
      notify_channel: prefs.notifyChannel ?? currentPrefs.notifyChannel,
      dnd_start:
        Object.prototype.hasOwnProperty.call(prefs, "dndStart")
          ? prefs.dndStart ?? null
          : currentPrefs.dndStart,
      dnd_end:
        Object.prototype.hasOwnProperty.call(prefs, "dndEnd")
          ? prefs.dndEnd ?? null
          : currentPrefs.dndEnd,
      weekly_digest_weekday:
        Object.prototype.hasOwnProperty.call(prefs, "weeklyDigestWeekday")
          ? prefs.weeklyDigestWeekday ?? null
          : currentPrefs.weeklyDigestWeekday,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supa as any)
      .from("preferences")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      console.error("Failed to update preferences", error);
      return;
    }

    set((state) => ({
      preferences: {
        ...state.preferences,
        primaryThresholdDefault:
          payload.primary_threshold_default ?? state.preferences.primaryThresholdDefault,
        strongThresholdDefault:
          payload.strong_threshold_default ?? state.preferences.strongThresholdDefault,
        notifyHourStart:
          payload.notify_hour_start ?? state.preferences.notifyHourStart,
        notifyHourEnd:
          payload.notify_hour_end ?? state.preferences.notifyHourEnd,
      },
    }));
  },
  setPreferencesLocal(prefs) {
    set((state) => ({ preferences: { ...state.preferences, ...prefs } }));
  },
  clear() {
    set({ ...initialState, hasHydrated: false, isLoading: false });
  },
}));

function mapDbItemToAkiItem(row: Database["public"]["Tables"]["items"]["Row"]): AkiItem {
  const cadenceDays = normalizeCadenceDays(
    row.cadence_days
  );

  const notifications: NotificationSettings = {
    enabled: row.notifications_enabled,
    channels: {
      webPush: row.notify_web_push,
      email: row.notify_email,
    },
    strongEnabled: row.notify_strong,
    thresholds: {
      primary: row.threshold_primary,
      strong: row.threshold_strong,
    },
  };

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    icon: row.icon ?? undefined,
    cadence: { days: cadenceDays },
    notifications,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDbLogToAkiLog(row: Database["public"]["Tables"]["logs"]["Row"]): AkiLog {
  return {
    id: row.id,
    itemId: row.item_id,
    loggedAt: row.at,
    satisfaction: row.satisfaction ?? undefined,
    note: row.note ?? undefined,
  };
}

function mergeNotificationSettings(
  overrides: Partial<NotificationSettings> | undefined,
  prefs: UserPreferences,
  current?: NotificationSettings
): NotificationSettings {
  const base: NotificationSettings = current ?? {
    enabled: true,
    channels: { webPush: true, email: false },
    strongEnabled: false,
    thresholds: {
      primary: prefs.primaryThresholdDefault,
      strong: prefs.strongThresholdDefault,
    },
  };

  if (!overrides) return base;

  return {
    enabled: overrides.enabled ?? base.enabled,
    channels: {
      webPush: overrides.channels?.webPush ?? base.channels.webPush,
      email: overrides.channels?.email ?? base.channels.email,
    },
    strongEnabled: overrides.strongEnabled ?? base.strongEnabled,
    thresholds: {
      primary: overrides.thresholds?.primary ?? base.thresholds.primary,
      strong: overrides.thresholds?.strong ?? base.thresholds.strong,
    },
  };
}

async function invokeRecalcNextFire(client: Supabase, itemId: string) {
  try {
    await cast(client)
      .functions.invoke("recalc_next_fire", { body: { itemId } });
  } catch (error) {
    console.error("Failed to invoke recalc_next_fire", error);
  }
}

function normalizeInsertableString(value?: string | null) {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCadenceDays(value?: number | null, fallback = 7) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  return fallback;
}


