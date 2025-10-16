export interface CadenceSettings {
  /** Interval in days the user wants to wait before being reminded. */
  days: number;
}

export interface ThresholdSettings {
  /** Standard notification threshold (e.g. 70). */
  primary: number;
  /** Strong notification threshold (e.g. 85). */
  strong: number;
}

export interface NotificationSettings {
  enabled: boolean;
  channels: {
    email: boolean;
  };
  strongEnabled: boolean;
  thresholds: ThresholdSettings;
}

export interface AkiItem {
  id: string;
  name: string;
  category: string;
  icon?: string;
  cadence: CadenceSettings;
  notifications: NotificationSettings;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AkiLog {
  id: string;
  itemId: string;
  loggedAt: string; // ISO string
  satisfaction?: number; // 0-100
  note?: string;
}

export interface UserPreferences {
  primaryThresholdDefault: number;
  strongThresholdDefault: number;
}

export interface AkiState {
  items: AkiItem[];
  logs: AkiLog[];
  preferences: UserPreferences;
}

export interface DashboardStats {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  byCategory: Record<string, number>;
}
