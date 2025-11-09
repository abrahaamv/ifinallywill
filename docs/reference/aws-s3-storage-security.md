# AWS S3 Storage Security Configuration

**Phase 11 Week 5** - Secure File Upload with AWS S3

## Overview

Secure file storage for chat attachments (IDs, contracts, medical records) using AWS S3 with pre-signed URLs and application-level tenant isolation.

## Security Architecture

### Multi-Layer Protection

| Layer | Protection | Implementation |
|-------|-----------|----------------|
| **1. Pre-Signed URLs** | Time-limited access | 1-hour expiration, cryptographic signatures |
| **2. Private Bucket** | No public access | Bucket policy blocks all public access |
| **3. Application Auth** | Session validation | tRPC `protectedProcedure` with tenant context |
| **4. Database RLS** | Metadata access control | PostgreSQL RLS on `chat_files` table |
| **5. Path Randomization** | URL guessing prevention | UUID suffix in file paths |
| **6. Encryption** | Data at rest | AES-256 server-side encryption |

## AWS S3 Setup

### Step 1: Create S3 Bucket

**Using AWS Console**:

1. Navigate to: https://console.aws.amazon.com/s3/
2. Click "Create bucket"
3. Configure:
   ```
   Bucket name: platform-chat-files-prod
   Region: us-east-1 (or your preferred region)
   Block all public access: ✅ ENABLED (CRITICAL)
   Bucket Versioning: Disabled (optional: enable for audit trail)
   Default encryption: AES-256 (SSE-S3)
   ```
4. Click "Create bucket"

**Using AWS CLI**:

```bash
# Create bucket
aws s3api create-bucket \
  --bucket platform-chat-files-prod \
  --region us-east-1

# Block all public access (CRITICAL)
aws s3api put-public-access-block \
  --bucket platform-chat-files-prod \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable default encryption
aws s3api put-bucket-encryption \
  --bucket platform-chat-files-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### Step 2: Create IAM User with Minimal Permissions

**IAM Policy** (Least Privilege):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowFileOperations",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::platform-chat-files-prod/*"
    },
    {
      "Sid": "DenyPublicAccess",
      "Effect": "Deny",
      "Action": "s3:PutObjectAcl",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-acl": [
            "public-read",
            "public-read-write",
            "authenticated-read"
          ]
        }
      }
    }
  ]
}
```

**Create IAM User**:

```bash
# Create user
aws iam create-user --user-name platform-storage-service

# Attach policy
aws iam put-user-policy \
  --user-name platform-storage-service \
  --policy-name PlatformStoragePolicy \
  --policy-document file://storage-policy.json

# Create access keys
aws iam create-access-key --user-name platform-storage-service

# Output (save these securely):
# AccessKeyId: AKIAIOSFODNN7EXAMPLE
# SecretAccessKey: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Step 3: Configure Bucket Policy

**Bucket Policy** (Additional layer of security):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyPublicRead",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::platform-chat-files-prod/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-acl": "public-read"
        }
      }
    },
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::platform-chat-files-prod",
        "arn:aws:s3:::platform-chat-files-prod/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

Apply policy:

```bash
aws s3api put-bucket-policy \
  --bucket platform-chat-files-prod \
  --policy file://bucket-policy.json
```

## Environment Configuration

Update `.env.local` with your AWS credentials:

```bash
# AWS S3 Configuration
AWS_S3_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
AWS_S3_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
AWS_S3_REGION="us-east-1"
AWS_S3_BUCKET="platform-chat-files-prod"
AWS_S3_ENDPOINT="" # Leave empty for AWS S3
```

**⚠️ SECURITY**: Never commit `.env` files containing real credentials.

## Application Implementation

### File Upload Flow

```typescript
// packages/api-contract/src/routers/chat.ts

// 1. User uploads file via tRPC endpoint
const result = await trpc.chat.uploadChatFile.mutate({
  sessionId: "session-uuid",
  fileName: "contract.pdf",
  fileType: "application/pdf",
  fileSize: 50000,
  fileContent: "base64-encoded-content"
});

// 2. Backend generates secure path with tenant isolation
const tenantId = ctx.session.user.tenantId; // From authenticated session
const timestamp = Date.now();
const randomSuffix = randomUUID().split('-')[0];
const filePath = `${tenantId}/${sessionId}/${timestamp}-${randomSuffix}-${fileName}`;
// Example: "tenant-abc123/session-xyz789/1704067200000-def456-contract.pdf"

// 3. Upload to S3 with encryption
await storage.uploadFile(filePath, fileContent, fileType);

// 4. Generate pre-signed URL (1-hour expiration)
const { signedUrl } = await storage.getSignedUrl(filePath, 3600);

// 5. Save metadata to database (PostgreSQL RLS enforces tenant isolation)
await db.insert(chatFiles).values({
  tenantId,
  userId,
  sessionId,
  filePath, // Store for future URL regeneration
  fileName,
  fileType,
  fileSize,
  uploadedAt: new Date()
});

// 6. Return temporary URL to client
return {
  fileId: "file-uuid",
  fileUrl: signedUrl, // Expires in 1 hour
  fileName: "contract.pdf"
};
```

### File Retrieval Flow

```typescript
// packages/api-contract/src/routers/chat.ts

// 1. User requests file by ID
const result = await trpc.chat.getChatFile.query({
  fileId: "file-uuid"
});

// 2. Database query (RLS ensures tenant isolation)
const file = await db.query.chatFiles.findFirst({
  where: eq(chatFiles.id, fileId)
});
// If file doesn't belong to user's tenant, RLS returns null

// 3. Generate fresh pre-signed URL
const { signedUrl } = await storage.getSignedUrl(file.filePath, 3600);

// 4. Return new temporary URL
return {
  fileId: file.id,
  fileUrl: signedUrl, // Fresh 1-hour URL
  fileName: file.fileName,
  fileSize: file.fileSize,
  uploadedAt: file.uploadedAt
};
```

## Security Best Practices

### ✅ DO

1. **Use Pre-Signed URLs** - Never return direct S3 URLs
2. **Set Short Expiration** - 1 hour for temporary access, 15 minutes for sensitive files
3. **Verify Tenant ID** - Check `ctx.session.user.tenantId` before all operations
4. **Store File Paths** - Save in database for future URL regeneration
5. **Add Randomization** - Use UUID suffix to prevent path enumeration
6. **Enable Encryption** - AES-256 server-side encryption (SSE-S3)
7. **Block Public Access** - Enforce at bucket policy level
8. **Log Access** - Track uploads/downloads in audit logs
9. **Validate File Types** - Whitelist allowed MIME types
10. **Scan for Malware** - Integrate AWS ClamAV or third-party scanning

### ❌ DON'T

1. **Never Use Public Buckets** - All files would be accessible by URL
2. **Never Use Long Expiration** - Increases attack window
3. **Never Trust File Paths from Users** - Always derive from session context
4. **Never Skip Tenant Validation** - Application logic is not sufficient alone
5. **Never Use Predictable Paths** - Add random entropy
6. **Never Hardcode Credentials** - Use environment variables
7. **Never Bypass Database Metadata** - Always track in `chat_files` table
8. **Never Allow Arbitrary File Extensions** - Validate against whitelist

## Testing Security

### Manual Security Tests

```bash
# Test 1: Verify bucket blocks public access
aws s3api get-public-access-block --bucket platform-chat-files-prod
# Expected: All blocks enabled

# Test 2: Attempt public read (should fail)
curl https://s3.amazonaws.com/platform-chat-files-prod/test.txt
# Expected: 403 Forbidden

# Test 3: Verify pre-signed URL expires
# 1. Generate URL with 60-second expiration
# 2. Wait 61 seconds
# 3. Access URL
# Expected: 403 Forbidden (SignatureDoesNotMatch)

# Test 4: Cross-tenant access prevention
# Upload file as Tenant A, attempt access with Tenant B session
# Expected: Database query returns null (RLS blocks access)
```

### Automated Security Tests

```typescript
// Test: Cross-tenant file access prevention
test('should prevent cross-tenant file access', async () => {
  const tenantAFile = await uploadFile({ tenantId: 'tenant-a', ... });
  const tenantBSession = createSession({ tenantId: 'tenant-b', ... });

  const result = await tenantBSession.getChatFile({ fileId: tenantAFile.id });

  expect(result).toBeNull(); // RLS blocks access
});

// Test: Pre-signed URL expiration
test('should expire pre-signed URLs', async () => {
  const { signedUrl } = await storage.getSignedUrl('path', 1); // 1 second

  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

  const response = await fetch(signedUrl);
  expect(response.status).toBe(403); // Expired
});

// Test: Path randomization prevents enumeration
test('should prevent file path enumeration', async () => {
  const file1 = await uploadFile({ fileName: 'test.pdf' });
  const file2 = await uploadFile({ fileName: 'test.pdf' });

  // Paths should have different UUID suffixes
  expect(file1.filePath).not.toEqual(file2.filePath);
});
```

## Monitoring & Alerts

### CloudWatch Metrics to Monitor

1. **Failed Access Attempts** - Multiple 403s could indicate attack
2. **Upload Volume** - Spike could indicate abuse
3. **Large File Uploads** - Monitor file sizes for DoS attempts
4. **Storage Costs** - Track S3 costs per tenant
5. **Expired URL Usage** - Users trying to reuse old URLs

### CloudWatch Alarms

```bash
# Alarm: High number of 403 errors (potential attack)
aws cloudwatch put-metric-alarm \
  --alarm-name s3-high-access-denied \
  --metric-name 4xxErrors \
  --namespace AWS/S3 \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Alarm: Unusual storage growth
aws cloudwatch put-metric-alarm \
  --alarm-name s3-storage-spike \
  --metric-name BucketSizeBytes \
  --namespace AWS/S3 \
  --statistic Average \
  --period 86400 \
  --threshold 10737418240 \
  --comparison-operator GreaterThanThreshold
```

## Cost Optimization

### S3 Pricing (us-east-1)

- **Storage**: $0.023/GB/month (Standard)
- **Requests**: $0.005/1,000 PUT, $0.0004/1,000 GET
- **Data Transfer**: $0.09/GB out to internet

### Estimates for 1,000 Users

**Assumptions**:
- Average 10 files/user/month = 10,000 uploads
- Average file size: 500KB
- Average 3 downloads per file

**Monthly Costs**:
```
Storage: 10,000 × 0.5MB = 5GB × $0.023 = $0.12
PUT Requests: 10,000 × $0.005/1,000 = $0.05
GET Requests: 30,000 × $0.0004/1,000 = $0.01
Data Transfer: 30,000 × 0.5MB = 15GB × $0.09 = $1.35

Total: ~$1.53/month
```

**Lifecycle Policies** (Auto-delete old files):

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket platform-chat-files-prod \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "DeleteOldFiles",
      "Status": "Enabled",
      "Expiration": {
        "Days": 90
      },
      "Filter": {
        "Prefix": ""
      }
    }]
  }'
```

## Alternative: S3-Compatible Services

### DigitalOcean Spaces

**Pricing**: $5/month for 250GB storage + 1TB transfer

```bash
# .env configuration
AWS_S3_ACCESS_KEY_ID="DO_SPACES_KEY"
AWS_S3_SECRET_ACCESS_KEY="DO_SPACES_SECRET"
AWS_S3_REGION="nyc3"
AWS_S3_BUCKET="platform-files"
AWS_S3_ENDPOINT="https://nyc3.digitaloceanspaces.com"
```

### Cloudflare R2

**Pricing**: $0.015/GB/month, **zero egress fees**

```bash
# .env configuration
AWS_S3_ACCESS_KEY_ID="R2_ACCESS_KEY_ID"
AWS_S3_SECRET_ACCESS_KEY="R2_SECRET_ACCESS_KEY"
AWS_S3_REGION="auto"
AWS_S3_BUCKET="platform-files"
AWS_S3_ENDPOINT="https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
```

## Compliance Considerations

### GDPR

- **Right to Access**: Provide file list via `getChatFile` endpoint
- **Right to Deletion**: Implement file cleanup via `deleteFile` method
- **Right to Portability**: Export files via pre-signed URLs

### HIPAA (for medical records)

- **Encryption at Rest**: ✅ AES-256 SSE-S3
- **Encryption in Transit**: ✅ HTTPS/TLS 1.3
- **Access Logs**: Enable S3 server access logging
- **Retention Policy**: Lifecycle rules for auto-deletion

### SOC 2

- **Access Control**: Multi-layer security (pre-signed URLs + RLS)
- **Audit Trail**: S3 access logs + database audit logs
- **Encryption**: End-to-end encryption enforced

## Deployment Checklist

### Development Environment
- [x] Create S3 bucket (or use S3-compatible service)
- [x] Block all public access
- [x] Create IAM user with minimal permissions
- [x] Configure bucket policy
- [x] Enable default encryption
- [x] Update `.env.local` with credentials
- [x] Install AWS SDK dependencies (`pnpm install`)
- [x] Update StorageService to use S3
- [x] Test file upload via tRPC endpoint
- [x] Verify pre-signed URL generation
- [x] Test cross-tenant access prevention

### Production Environment
- [ ] Create production S3 bucket (separate from dev)
- [ ] Enable S3 server access logging
- [ ] Configure CloudWatch alarms
- [ ] Set up lifecycle policies (auto-delete old files)
- [ ] Enable S3 Object Lock (compliance mode)
- [ ] Configure bucket replication (disaster recovery)
- [ ] Update production `.env` with credentials
- [ ] Test file upload in staging environment
- [ ] Verify monitoring and alerting
- [ ] Document incident response procedures

## Support

For issues:
- **AWS S3 Documentation**: https://docs.aws.amazon.com/s3/
- **AWS SDK for JavaScript**: https://docs.aws.amazon.com/sdk-for-javascript/
- **Pre-Signed URLs**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
- **Security Best Practices**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html
