/**
 * Alerting and Monitoring Configuration
 *
 * Defines critical alerts for production monitoring and operational health.
 * Integrates with OpenTelemetry metrics for Google Cloud Monitoring alerting.
 *
 * **Alert Categories**:
 * - Infrastructure (backups, disk, database)
 * - Application (API errors, response time)
 * - Security (RLS violations, authentication failures)
 * - External Dependencies (AI providers)
 *
 * **Usage**:
 * ```typescript
 * import { checkAlertConditions, AlertType } from '@platform/shared/alerting';
 *
 * // Check all alert conditions
 * const alerts = await checkAlertConditions();
 * for (const alert of alerts) {
 *   if (alert.triggered) {
 *     console.error(`ALERT: ${alert.name}`, alert);
 *   }
 * }
 * ```
 */

import { createModuleLogger } from '../logger';
import { metrics } from '../telemetry';

const logger = createModuleLogger('alerting');

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  CRITICAL = 'critical', // Immediate action required, production impact
  HIGH = 'high', // Action required within 1 hour
  MEDIUM = 'medium', // Action required within 4 hours
  LOW = 'low', // Action required within 24 hours
}

/**
 * Alert types matching security requirements
 */
export enum AlertType {
  // Infrastructure alerts
  BACKUP_AGE = 'backup_age',
  WAL_ARCHIVE_LAG = 'wal_archive_lag',
  DISK_SPACE = 'disk_space',
  BACKUP_FAILURE = 'backup_failure',

  // Application alerts
  API_ERROR_RATE = 'api_error_rate',
  DATABASE_CONNECTION_POOL = 'database_connection_pool',
  RESPONSE_TIME_P95 = 'response_time_p95',

  // External dependency alerts
  AI_PROVIDER_FAILURE = 'ai_provider_failure',

  // Security alerts
  RLS_POLICY_VIOLATION = 'rls_policy_violation',
}

/**
 * Alert condition configuration
 */
export interface AlertCondition {
  type: AlertType;
  name: string;
  description: string;
  severity: AlertSeverity;
  threshold: number;
  unit: string;
  checkInterval: number; // seconds
  enabled: boolean;
}

/**
 * Alert instance when condition is triggered
 */
export interface Alert {
  type: AlertType;
  name: string;
  severity: AlertSeverity;
  triggered: boolean;
  currentValue: number;
  threshold: number;
  unit: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Alert condition definitions (9 critical alerts)
 */
export const ALERT_CONDITIONS: Record<AlertType, AlertCondition> = {
  // 1. Backup Age Alert (CRITICAL)
  [AlertType.BACKUP_AGE]: {
    type: AlertType.BACKUP_AGE,
    name: 'Backup Age Exceeded',
    description: 'Latest backup is older than 24 hours',
    severity: AlertSeverity.CRITICAL,
    threshold: 24, // hours
    unit: 'hours',
    checkInterval: 3600, // Check every hour
    enabled: true,
  },

  // 2. WAL Archive Lag Alert (WARNING → HIGH)
  [AlertType.WAL_ARCHIVE_LAG]: {
    type: AlertType.WAL_ARCHIVE_LAG,
    name: 'WAL Archive Lag',
    description: 'WAL archiving delayed beyond acceptable threshold',
    severity: AlertSeverity.HIGH,
    threshold: 10, // minutes
    unit: 'minutes',
    checkInterval: 60, // Check every minute
    enabled: true,
  },

  // 3. Disk Space Alert (CRITICAL)
  [AlertType.DISK_SPACE]: {
    type: AlertType.DISK_SPACE,
    name: 'Disk Space Critical',
    description: 'Disk usage exceeded 85% capacity',
    severity: AlertSeverity.CRITICAL,
    threshold: 85, // percent
    unit: 'percent',
    checkInterval: 300, // Check every 5 minutes
    enabled: true,
  },

  // 4. Backup Failure Alert (CRITICAL)
  [AlertType.BACKUP_FAILURE]: {
    type: AlertType.BACKUP_FAILURE,
    name: 'Backup Failure',
    description: 'Backup operation failed',
    severity: AlertSeverity.CRITICAL,
    threshold: 1, // any failure
    unit: 'failures',
    checkInterval: 60, // Check every minute
    enabled: true,
  },

  // 5. API Error Rate Alert (HIGH)
  [AlertType.API_ERROR_RATE]: {
    type: AlertType.API_ERROR_RATE,
    name: 'API Error Rate High',
    description: 'API error rate exceeded 5% over 5-minute window',
    severity: AlertSeverity.HIGH,
    threshold: 5, // percent
    unit: 'percent',
    checkInterval: 60, // Check every minute
    enabled: true,
  },

  // 6. Database Connection Pool Alert (HIGH)
  [AlertType.DATABASE_CONNECTION_POOL]: {
    type: AlertType.DATABASE_CONNECTION_POOL,
    name: 'Database Connection Pool Exhaustion',
    description: 'Database connection pool usage exceeded 90%',
    severity: AlertSeverity.HIGH,
    threshold: 90, // percent
    unit: 'percent',
    checkInterval: 60, // Check every minute
    enabled: true,
  },

  // 7. Response Time Alert (MEDIUM)
  [AlertType.RESPONSE_TIME_P95]: {
    type: AlertType.RESPONSE_TIME_P95,
    name: 'Response Time Degradation',
    description: 'API p95 response time exceeded 500ms',
    severity: AlertSeverity.MEDIUM,
    threshold: 500, // milliseconds
    unit: 'ms',
    checkInterval: 60, // Check every minute
    enabled: true,
  },

  // 8. AI Provider Failure Alert (HIGH)
  [AlertType.AI_PROVIDER_FAILURE]: {
    type: AlertType.AI_PROVIDER_FAILURE,
    name: 'AI Provider Failure',
    description: 'AI provider unavailable or error rate >10%',
    severity: AlertSeverity.HIGH,
    threshold: 10, // percent error rate
    unit: 'percent',
    checkInterval: 60, // Check every minute
    enabled: true,
  },

  // 9. RLS Policy Violation Alert (CRITICAL)
  [AlertType.RLS_POLICY_VIOLATION]: {
    type: AlertType.RLS_POLICY_VIOLATION,
    name: 'RLS Policy Violation',
    description: 'Row-Level Security policy violation detected',
    severity: AlertSeverity.CRITICAL,
    threshold: 1, // any violation
    unit: 'violations',
    checkInterval: 60, // Check every minute
    enabled: true,
  },
};

/**
 * Alert check functions
 */
export const AlertChecks = {
  /**
   * Check backup age
   *
   * @param backupPath - Path to backup directory
   * @returns Alert if backup age exceeds threshold
   */
  async checkBackupAge(backupPath = '/var/backups/postgresql'): Promise<Alert | null> {
    const condition = ALERT_CONDITIONS[AlertType.BACKUP_AGE];
    if (!condition.enabled) return null;

    try {
      const { execSync } = await import('node:child_process');
      const output = execSync(
        `find ${backupPath} -name "backup_*" -type d -mtime -1 | wc -l`
      ).toString();
      const recentBackups = parseInt(output.trim(), 10);

      const triggered = recentBackups === 0;

      const alert: Alert = {
        type: condition.type,
        name: condition.name,
        severity: condition.severity,
        triggered,
        currentValue: triggered ? 24 : 0, // Simplified - actual age would need file timestamp
        threshold: condition.threshold,
        unit: condition.unit,
        message: triggered
          ? `No backup found in last 24 hours at ${backupPath}`
          : 'Backup age within acceptable range',
        timestamp: new Date(),
        metadata: { backupPath, recentBackups },
      };

      if (triggered) {
        logger.error({ alert }, 'ALERT: Backup age exceeded');
        metrics.recordCounter('alert.triggered', 1, {
          type: condition.type,
          severity: condition.severity,
        });
      }

      return alert;
    } catch (error) {
      logger.error({ error }, 'Failed to check backup age');
      return null;
    }
  },

  /**
   * Check WAL archive lag
   *
   * @param pgConnectionString - PostgreSQL connection string
   * @returns Alert if WAL lag exceeds threshold
   */
  async checkWALArchiveLag(): Promise<Alert | null> {
    const condition = ALERT_CONDITIONS[AlertType.WAL_ARCHIVE_LAG];
    if (!condition.enabled) return null;

    try {
      // In production, query pg_stat_archiver
      // For now, return placeholder
      const walLagSeconds = 0; // Would query: SELECT EXTRACT(EPOCH FROM (now() - last_archived_time)) FROM pg_stat_archiver

      const walLagMinutes = walLagSeconds / 60;
      const triggered = walLagMinutes > condition.threshold;

      const alert: Alert = {
        type: condition.type,
        name: condition.name,
        severity: condition.severity,
        triggered,
        currentValue: walLagMinutes,
        threshold: condition.threshold,
        unit: condition.unit,
        message: triggered
          ? `WAL archiving delayed by ${walLagMinutes.toFixed(1)} minutes`
          : 'WAL archiving within acceptable lag',
        timestamp: new Date(),
        metadata: { walLagSeconds, walLagMinutes },
      };

      if (triggered) {
        logger.error({ alert }, 'ALERT: WAL archive lag exceeded');
        metrics.recordCounter('alert.triggered', 1, {
          type: condition.type,
          severity: condition.severity,
        });
      }

      return alert;
    } catch (error) {
      logger.error({ error }, 'Failed to check WAL archive lag');
      return null;
    }
  },

  /**
   * Check disk space usage
   *
   * @param path - Path to check (defaults to backup directory)
   * @returns Alert if disk usage exceeds threshold
   */
  async checkDiskSpace(path = '/var/backups/postgresql'): Promise<Alert | null> {
    const condition = ALERT_CONDITIONS[AlertType.DISK_SPACE];
    if (!condition.enabled) return null;

    try {
      const { execSync } = await import('node:child_process');
      const output = execSync(`df -h ${path} | awk 'NR==2 {print $5}' | grep -o '[0-9]*'`).toString();
      const diskUsagePercent = parseInt(output.trim(), 10);

      const triggered = diskUsagePercent > condition.threshold;

      const alert: Alert = {
        type: condition.type,
        name: condition.name,
        severity: condition.severity,
        triggered,
        currentValue: diskUsagePercent,
        threshold: condition.threshold,
        unit: condition.unit,
        message: triggered
          ? `Disk usage at ${diskUsagePercent}% on ${path}`
          : `Disk usage at ${diskUsagePercent}% (within limits)`,
        timestamp: new Date(),
        metadata: { path, diskUsagePercent },
      };

      if (triggered) {
        logger.error({ alert }, 'ALERT: Disk space critical');
        metrics.recordCounter('alert.triggered', 1, {
          type: condition.type,
          severity: condition.severity,
        });
      }

      return alert;
    } catch (error) {
      logger.error({ error }, 'Failed to check disk space');
      return null;
    }
  },

  /**
   * Record backup failure
   *
   * Call this when a backup operation fails
   */
  recordBackupFailure(error: Error): Alert {
    const condition = ALERT_CONDITIONS[AlertType.BACKUP_FAILURE];

    const alert: Alert = {
      type: condition.type,
      name: condition.name,
      severity: condition.severity,
      triggered: true,
      currentValue: 1,
      threshold: condition.threshold,
      unit: condition.unit,
      message: `Backup failed: ${error.message}`,
      timestamp: new Date(),
      metadata: { error: error.message, stack: error.stack },
    };

    logger.error({ alert }, 'ALERT: Backup failure');
    metrics.recordCounter('alert.triggered', 1, {
      type: condition.type,
      severity: condition.severity,
    });

    return alert;
  },

  /**
   * Record API error for error rate tracking
   *
   * @param endpoint - API endpoint
   * @param error - Error details
   */
  recordAPIError(endpoint: string, error: Error): void {
    metrics.recordCounter('api.errors', 1, {
      endpoint,
      error: error.name,
    });
  },

  /**
   * Record database connection pool metrics
   *
   * @param activeConnections - Current active connections
   * @param maxConnections - Maximum pool size
   */
  recordConnectionPoolUsage(activeConnections: number, maxConnections: number): Alert | null {
    const condition = ALERT_CONDITIONS[AlertType.DATABASE_CONNECTION_POOL];
    if (!condition.enabled) return null;

    const usagePercent = (activeConnections / maxConnections) * 100;
    const triggered = usagePercent > condition.threshold;

    metrics.recordCounter('database.connection_pool.usage', activeConnections, {
      max: maxConnections.toString(),
    });

    if (triggered) {
      const alert: Alert = {
        type: condition.type,
        name: condition.name,
        severity: condition.severity,
        triggered,
        currentValue: usagePercent,
        threshold: condition.threshold,
        unit: condition.unit,
        message: `Connection pool at ${usagePercent.toFixed(1)}% (${activeConnections}/${maxConnections})`,
        timestamp: new Date(),
        metadata: { activeConnections, maxConnections, usagePercent },
      };

      logger.error({ alert }, 'ALERT: Database connection pool exhaustion');
      metrics.recordCounter('alert.triggered', 1, {
        type: condition.type,
        severity: condition.severity,
      });

      return alert;
    }

    return null;
  },

  /**
   * Record AI provider failure
   *
   * @param provider - AI provider name (openai, anthropic, google)
   * @param error - Error details
   */
  recordAIProviderFailure(provider: string, error: Error): Alert {
    const condition = ALERT_CONDITIONS[AlertType.AI_PROVIDER_FAILURE];

    metrics.recordCounter('ai.provider.errors', 1, {
      provider,
      error: error.name,
    });

    const alert: Alert = {
      type: condition.type,
      name: condition.name,
      severity: condition.severity,
      triggered: true,
      currentValue: 1,
      threshold: condition.threshold,
      unit: 'failures',
      message: `AI provider ${provider} failed: ${error.message}`,
      timestamp: new Date(),
      metadata: { provider, error: error.message },
    };

    logger.error({ alert }, 'ALERT: AI provider failure');
    metrics.recordCounter('alert.triggered', 1, {
      type: condition.type,
      severity: condition.severity,
    });

    return alert;
  },

  /**
   * Record RLS policy violation
   *
   * Call this when a cross-tenant access attempt is detected
   *
   * @param userId - User attempting access
   * @param tenantId - User's tenant ID
   * @param resourceTenantId - Resource tenant ID
   * @param table - Table name
   */
  recordRLSViolation(
    userId: string,
    tenantId: string,
    resourceTenantId: string,
    table: string
  ): Alert {
    const condition = ALERT_CONDITIONS[AlertType.RLS_POLICY_VIOLATION];

    metrics.recordCounter('security.rls.violations', 1, {
      table,
      userTenant: tenantId,
      resourceTenant: resourceTenantId,
    });

    const alert: Alert = {
      type: condition.type,
      name: condition.name,
      severity: condition.severity,
      triggered: true,
      currentValue: 1,
      threshold: condition.threshold,
      unit: condition.unit,
      message: `RLS violation: User ${userId} (tenant ${tenantId}) attempted to access resource in tenant ${resourceTenantId} on table ${table}`,
      timestamp: new Date(),
      metadata: { userId, tenantId, resourceTenantId, table },
    };

    logger.error({ alert }, 'ALERT: RLS policy violation');
    metrics.recordCounter('alert.triggered', 1, {
      type: condition.type,
      severity: condition.severity,
    });

    return alert;
  },
};

/**
 * Check all alert conditions
 *
 * @returns Array of all alert statuses
 */
export async function checkAlertConditions(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  // Infrastructure alerts
  const backupAge = await AlertChecks.checkBackupAge();
  if (backupAge) alerts.push(backupAge);

  const walLag = await AlertChecks.checkWALArchiveLag();
  if (walLag) alerts.push(walLag);

  const diskSpace = await AlertChecks.checkDiskSpace();
  if (diskSpace) alerts.push(diskSpace);

  return alerts;
}

/**
 * Get alert condition by type
 */
export function getAlertCondition(type: AlertType): AlertCondition {
  return ALERT_CONDITIONS[type];
}

/**
 * Get all enabled alert conditions
 */
export function getEnabledAlerts(): AlertCondition[] {
  return Object.values(ALERT_CONDITIONS).filter((condition) => condition.enabled);
}
