// AWS S3 Storage Service
// Phase 11 Week 5: Secure File Upload with S3 Pre-Signed URLs
//
// SECURITY:
// - Private bucket (no public access)
// - Pre-signed URLs with 1-hour expiration
// - Tenant isolation via path prefix: {tenantId}/{sessionId}/{timestamp}-{uuid}-{filename}
// - Application-level access control (tRPC protectedProcedure)
// - Metadata tracking in PostgreSQL chat_files table

import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('storage-service');

/**
 * Storage service for secure file uploads and retrieval
 *
 * Features:
 * - AWS S3 backend with pre-signed URLs
 * - Tenant isolation via path prefixes
 * - Time-limited access (1 hour default)
 * - No public bucket access
 *
 * Environment Variables Required:
 * - AWS_S3_ACCESS_KEY_ID
 * - AWS_S3_SECRET_ACCESS_KEY
 * - AWS_S3_REGION
 * - AWS_S3_BUCKET
 * - AWS_S3_ENDPOINT (optional, for S3-compatible services)
 */
export class StorageService {
	private s3: S3Client;
	private bucketName: string;

	constructor() {
		// Validate required environment variables
		const requiredEnvVars = [
			'AWS_S3_ACCESS_KEY_ID',
			'AWS_S3_SECRET_ACCESS_KEY',
			'AWS_S3_REGION',
			'AWS_S3_BUCKET',
		];

		for (const envVar of requiredEnvVars) {
			if (!process.env[envVar]) {
				throw new Error(
					`Storage service initialization failed: ${envVar} environment variable is required`
				);
			}
		}

		// Initialize S3 client
		this.s3 = new S3Client({
			region: process.env.AWS_S3_REGION,
			credentials: {
				accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID as string,
				secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY as string,
			},
			...(process.env.AWS_S3_ENDPOINT && {
				endpoint: process.env.AWS_S3_ENDPOINT,
				forcePathStyle: true, // Required for S3-compatible services like MinIO
			}),
		});

		this.bucketName = process.env.AWS_S3_BUCKET as string;

		logger.info('Storage service initialized', {
			bucket: this.bucketName,
			region: process.env.AWS_S3_REGION,
			endpoint: process.env.AWS_S3_ENDPOINT || 'AWS S3',
		});
	}

	/**
	 * Upload file to S3 storage
	 *
	 * @param path - S3 object key (format: {tenantId}/{sessionId}/{timestamp}-{uuid}-{filename})
	 * @param fileContent - Base64-encoded file content
	 * @param fileType - MIME type (e.g., "application/pdf", "image/png")
	 * @returns Success status with error message if failed
	 *
	 * @example
	 * ```typescript
	 * const storage = createStorageService();
	 * const result = await storage.uploadFile(
	 *   "tenant-uuid/session-uuid/1234567890-abc123-contract.pdf",
	 *   "base64-encoded-content",
	 *   "application/pdf"
	 * );
	 * ```
	 */
	async uploadFile(
		path: string,
		fileContent: string, // base64 encoded
		fileType: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			// Convert base64 to Buffer
			const buffer = Buffer.from(fileContent, 'base64');

			// Upload to S3
			const command = new PutObjectCommand({
				Bucket: this.bucketName,
				Key: path,
				Body: buffer,
				ContentType: fileType,
				// Security headers
				ServerSideEncryption: 'AES256', // Encrypt at rest
				// Prevent caching of sensitive files
				CacheControl: 'no-cache, no-store, must-revalidate',
			});

			await this.s3.send(command);

			logger.info('File uploaded successfully', { path, fileType });

			return { success: true };
		} catch (error) {
			logger.error('S3 upload error', { path, error });
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Upload failed: Unknown error',
			};
		}
	}

	/**
	 * Generate pre-signed URL for secure file access
	 *
	 * Pre-signed URLs provide temporary access to private S3 objects without
	 * requiring AWS credentials. URLs expire after the specified time.
	 *
	 * @param path - S3 object key
	 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
	 * @returns Pre-signed URL or error
	 *
	 * @example
	 * ```typescript
	 * const storage = createStorageService();
	 * const result = await storage.getSignedUrl(
	 *   "tenant-uuid/session-uuid/contract.pdf",
	 *   3600 // 1 hour
	 * );
	 * console.log(result.signedUrl); // https://s3.amazonaws.com/bucket/path?X-Amz-Signature=...
	 * ```
	 */
	async getSignedUrl(
		path: string,
		expiresIn = 3600 // 1 hour default
	): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
		try {
			// Create GetObject command
			const command = new GetObjectCommand({
				Bucket: this.bucketName,
				Key: path,
			});

			// Generate pre-signed URL
			const signedUrl = await getSignedUrl(this.s3, command, { expiresIn });

			logger.info('Generated signed URL', { path, expiresIn });

			return {
				success: true,
				signedUrl,
			};
		} catch (error) {
			logger.error('S3 getSignedUrl error', { path, error });
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to generate signed URL',
			};
		}
	}

	/**
	 * Delete file from S3 storage
	 *
	 * @param path - S3 object key to delete
	 * @returns Success status with error message if failed
	 *
	 * @example
	 * ```typescript
	 * const storage = createStorageService();
	 * const result = await storage.deleteFile("tenant-uuid/session-uuid/file.pdf");
	 * ```
	 */
	async deleteFile(
		path: string
	): Promise<{ success: boolean; error?: string }> {
		try {
			const command = new DeleteObjectCommand({
				Bucket: this.bucketName,
				Key: path,
			});

			await this.s3.send(command);

			logger.info('File deleted successfully', { path });

			return { success: true };
		} catch (error) {
			logger.error('S3 delete error', { path, error });
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Delete failed: Unknown error',
			};
		}
	}

	/**
	 * Check if file exists in S3
	 *
	 * @param path - S3 object key
	 * @returns True if file exists, false otherwise
	 */
	async fileExists(path: string): Promise<boolean> {
		try {
			const command = new GetObjectCommand({
				Bucket: this.bucketName,
				Key: path,
			});

			await this.s3.send(command);
			return true;
		} catch {
			return false;
		}
	}
}

/**
 * Factory function to create storage service instance
 *
 * @returns Initialized StorageService instance
 * @throws Error if required environment variables are missing
 *
 * @example
 * ```typescript
 * import { createStorageService } from './services/storage';
 *
 * const storage = createStorageService();
 * await storage.uploadFile(...);
 * ```
 */
export function createStorageService(): StorageService {
	return new StorageService();
}
