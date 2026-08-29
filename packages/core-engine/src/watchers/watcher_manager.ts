import { WatcherScheduleConfig, WatcherAlertNotification } from './types.js';
import { WatcherError } from './errors.js';

export class WatcherManagerTool {
  private watchers: Map<string, WatcherScheduleConfig> = new Map();
  private notificationHistory: WatcherAlertNotification[] = [];

  public registerWatcher(config: WatcherScheduleConfig): void {
    if (!config.id || !config.name || !config.actionTaskGoal) {
      throw new WatcherError('Watcher ID, name, and action task goal are required', 'INVALID_CONFIG');
    }
    this.watchers.set(config.id, { ...config });
  }

  public getWatcher(id: string): WatcherScheduleConfig | undefined {
    return this.watchers.get(id);
  }

  public listWatchers(): WatcherScheduleConfig[] {
    return Array.from(this.watchers.values());
  }

  public toggleWatcher(id: string, isEnabled: boolean): void {
    const watcher = this.watchers.get(id);
    if (!watcher) {
      throw new WatcherError(`Watcher '${id}' not found`, 'NOT_FOUND');
    }
    watcher.isEnabled = isEnabled;
  }

  public evaluateThreshold(watcherId: string, metricValue: number): WatcherAlertNotification | null {
    const watcher = this.watchers.get(watcherId);
    if (!watcher || !watcher.isEnabled || !watcher.metricThreshold) {
      return null;
    }

    const { metricName, operator, thresholdValue = 0 } = watcher.metricThreshold;
    let isBreached = false;

    switch (operator) {
      case '>':
        isBreached = metricValue > thresholdValue;
        break;
      case '<':
        isBreached = metricValue < thresholdValue;
        break;
      case '==':
        isBreached = metricValue === thresholdValue;
        break;
      case '!=':
        isBreached = metricValue !== thresholdValue;
        break;
      case 'anomaly_detected':
        isBreached = Boolean(metricValue);
        break;
    }

    if (isBreached) {
      watcher.lastTriggeredAt = Date.now();
      const notification: WatcherAlertNotification = {
        notificationId: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        watcherId,
        watcherName: watcher.name,
        severity: operator === 'anomaly_detected' || Math.abs(metricValue - thresholdValue) > thresholdValue * 0.5 ? 'critical' : 'warning',
        title: `⚠️ Alert: ${watcher.name} Triggered`,
        message: `Metric '${metricName}' breached threshold (${metricValue} ${operator} ${thresholdValue}). Automated Goal: "${watcher.actionTaskGoal}"`,
        triggeredAt: Date.now(),
      };

      this.notificationHistory.push(notification);
      return notification;
    }

    return null;
  }

  public getNotifications(): WatcherAlertNotification[] {
    return [...this.notificationHistory];
  }
}
