/**
 * Metrics Collection System (Phase 3 - Week 3.3)
 *
 * Simple in-memory metrics for monitoring:
 * - Request counts and rates
 * - Response times
 * - Error rates
 * - Cost tracking
 *
 * Future: Export to Prometheus, DataDog, or CloudWatch
 */

/**
 * Metric types supported by the system
 */
export type MetricType = 'counter' | 'gauge' | 'histogram';

/**
 * Counter metric (monotonically increasing)
 */
interface Counter {
	type: 'counter';
	value: number;
	labels: Record<string, string>;
}

/**
 * Gauge metric (can go up or down)
 */
interface Gauge {
	type: 'gauge';
	value: number;
	labels: Record<string, string>;
}

/**
 * Histogram metric (tracks distribution)
 */
interface Histogram {
	type: 'histogram';
	values: number[];
	labels: Record<string, string>;
}

type Metric = Counter | Gauge | Histogram;

/**
 * Metrics registry (singleton)
 */
class MetricsRegistry {
	private metrics: Map<string, Metric> = new Map();

	/**
	 * Increment a counter metric
	 */
	increment(name: string, labels: Record<string, string> = {}, value = 1): void {
		const key = this.getKey(name, labels);
		const metric = this.metrics.get(key);

		if (metric && metric.type === 'counter') {
			metric.value += value;
		} else {
			this.metrics.set(key, {
				type: 'counter',
				value,
				labels,
			});
		}
	}

	/**
	 * Set a gauge metric
	 */
	set(name: string, value: number, labels: Record<string, string> = {}): void {
		const key = this.getKey(name, labels);
		this.metrics.set(key, {
			type: 'gauge',
			value,
			labels,
		});
	}

	/**
	 * Record a histogram value
	 */
	record(name: string, value: number, labels: Record<string, string> = {}): void {
		const key = this.getKey(name, labels);
		const metric = this.metrics.get(key);

		if (metric && metric.type === 'histogram') {
			metric.values.push(value);
			// Keep last 1000 values to prevent memory leak
			if (metric.values.length > 1000) {
				metric.values.shift();
			}
		} else {
			this.metrics.set(key, {
				type: 'histogram',
				values: [value],
				labels,
			});
		}
	}

	/**
	 * Get all metrics
	 */
	getAll(): Record<string, any> {
		const result: Record<string, any> = {};

		for (const [key, metric] of this.metrics.entries()) {
			if (metric.type === 'histogram') {
				result[key] = {
					...metric,
					stats: this.calculateHistogramStats(metric.values),
				};
			} else {
				result[key] = metric;
			}
		}

		return result;
	}

	/**
	 * Get a specific metric
	 */
	get(name: string, labels: Record<string, string> = {}): Metric | undefined {
		const key = this.getKey(name, labels);
		return this.metrics.get(key);
	}

	/**
	 * Reset all metrics (useful for testing)
	 */
	reset(): void {
		this.metrics.clear();
	}

	/**
	 * Generate unique key for metric with labels
	 */
	private getKey(name: string, labels: Record<string, string>): string {
		const labelStr = Object.entries(labels)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, v]) => `${k}="${v}"`)
			.join(',');

		return labelStr ? `${name}{${labelStr}}` : name;
	}

	/**
	 * Calculate histogram statistics
	 */
	private calculateHistogramStats(values: number[]): {
		count: number;
		sum: number;
		min: number;
		max: number;
		mean: number;
		p50: number;
		p95: number;
		p99: number;
	} {
		if (values.length === 0) {
			return {
				count: 0,
				sum: 0,
				min: 0,
				max: 0,
				mean: 0,
				p50: 0,
				p95: 0,
				p99: 0,
			};
		}

		const sorted = [...values].sort((a, b) => a - b);
		const sum = sorted.reduce((acc, v) => acc + v, 0);

		return {
			count: sorted.length,
			sum,
			min: sorted[0]!,
			max: sorted[sorted.length - 1]!,
			mean: sum / sorted.length,
			p50: sorted[Math.floor(sorted.length * 0.5)]!,
			p95: sorted[Math.floor(sorted.length * 0.95)]!,
			p99: sorted[Math.floor(sorted.length * 0.99)]!,
		};
	}
}

/**
 * Global metrics registry instance
 */
export const metrics = new MetricsRegistry();

/**
 * Standard metric names for the platform
 */
export const MetricNames = {
	// Request metrics
	REQUEST_TOTAL: 'api_requests_total',
	REQUEST_DURATION: 'api_request_duration_seconds',
	REQUEST_ERRORS: 'api_request_errors_total',

	// Database metrics
	DB_QUERY_DURATION: 'db_query_duration_ms',
	DB_CONNECTIONS_ACTIVE: 'db_connections_active',
	DB_CONNECTIONS_IDLE: 'db_connections_idle',

	// RLS metrics
	RLS_CONTEXT_SET_DURATION: 'rls_context_set_duration_ms',
	RLS_VIOLATIONS: 'rls_violations_total',

	// Cost tracking
	AI_TOKENS_USED: 'ai_tokens_used_total',
	AI_COST_USD: 'ai_cost_usd_total',
	EMBEDDING_TOKENS_USED: 'embedding_tokens_used_total',

	// Error metrics
	ERROR_TOTAL: 'errors_total',
	ERROR_RATE: 'error_rate',
} as const;

/**
 * Utility function to measure execution time
 */
export async function measureAsync<T>(
	name: string,
	fn: () => Promise<T>,
	labels: Record<string, string> = {},
): Promise<T> {
	const start = Date.now();
	try {
		const result = await fn();
		metrics.record(name, Date.now() - start, labels);
		return result;
	} catch (error) {
		metrics.record(name, Date.now() - start, { ...labels, error: 'true' });
		throw error;
	}
}

/**
 * Utility function to measure synchronous execution time
 */
export function measure<T>(
	name: string,
	fn: () => T,
	labels: Record<string, string> = {},
): T {
	const start = Date.now();
	try {
		const result = fn();
		metrics.record(name, Date.now() - start, labels);
		return result;
	} catch (error) {
		metrics.record(name, Date.now() - start, { ...labels, error: 'true' });
		throw error;
	}
}
