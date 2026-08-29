export type WatcherTriggerType = 'file_changed' | 'cron_schedule' | 'threshold_breach';

export interface WatcherScheduleConfig {
  id: string;
  name: string;
  triggerType: WatcherTriggerType;
  scheduleCron?: string; // e.g. "0 8 * * 1" (Every Monday at 8am)
  targetPath?: string; // e.g. "c:/Users/HP/Downloads/sales_weekly.csv"
  metricThreshold?: {
    metricName: string;
    operator: '>' | '<' | '==' | '!=' | 'anomaly_detected';
    thresholdValue?: number;
  };
  actionTaskGoal: string; // Goal passed to AutonomousExecutionLoop e.g. "Analyze weekly churn and generate executive presentation"
  isEnabled: boolean;
  lastTriggeredAt?: number;
}

export interface WatcherAlertNotification {
  notificationId: string;
  watcherId: string;
  watcherName: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  triggeredAt: number;
}
