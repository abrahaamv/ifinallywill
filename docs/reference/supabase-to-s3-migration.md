# Supabase to AWS S3 Migration

**Date**: 2025-01-09
**Phase**: 11 Week 5
**Status**: ✅ Complete

## Migration Summary

Migrated file storage from Supabase Storage to AWS S3 due to authentication architecture incompatibility.

## Problem Statement

**Original Plan**: Use Supabase Storage with Row-Level Security (RLS)

**Issue Discovered**:
- Application uses **Auth.js (NextAuth.js)** for authentication
- Supabase Storage RLS requires **Supabase Auth JWTs**
- These are two different JWT systems with incompatible signing keys
- Solution would require:
  - Deno Edge Functions (not Node.js/TypeScript)
  - Dual authentication systems (Auth.js + Supabase Auth)
  - Complex JWT token management
  - Additional infrastructure complexity

**Decision**: Switch to AWS S3 for simpler, more maintainable architecture

## Benefits of AWS S3 Solution

1. **Native TypeScript/Node.js** - No Deno required
2. **Single Auth System** - Works with existing Auth.js
3. **Application-Level Control** - Full control over access logic
4. **Industry Standard** - S3 API is universal (AWS, DigitalOcean, Cloudflare R2, MinIO)
5. **Better Pricing** - More cost-effective at scale
6. **Simpler Architecture** - No dual auth complexity

## Changes Made

### Files Removed

```bash
# Supabase configuration (deleted)
supabase/
├── README.md
├── sql/001_jwt_claims_function.sql
└── functions/custom-access-token/
    ├── index.ts
    └── deno.json

# Supabase documentation (deleted)
docs/reference/supabase-jwt-claims-setup.md
docs/reference/supabase-storage-security.md
```

### Files Modified

#### 1. Environment Configuration

**`.env.local`** (lines 166-174):
```bash
# BEFORE (Supabase)
SUPABASE_URL="https://mtczmejechynpycfzazk.supabase.co"
SUPABASE_ANON_KEY="eyJhbG..."
SUPABASE_STORAGE_BUCKET="chat-files"

# AFTER (AWS S3)
AWS_S3_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_S3_SECRET_ACCESS_KEY="your-aws-secret-access-key"
AWS_S3_REGION="us-east-1"
AWS_S3_BUCKET="platform-chat-files-dev"
AWS_S3_ENDPOINT="" # Optional: For S3-compatible services
```

**`.env.example`** (lines 171-180):
- Updated with AWS S3 placeholders
- Removed Supabase configuration
- Added comment with IAM console link

#### 2. Package Dependencies

**`packages/api-contract/package.json`**:
```json
// REMOVED
"@supabase/storage-js": "2.9.0"

// ADDED
"@aws-sdk/client-s3": "3.713.0",
"@aws-sdk/s3-request-presigner": "3.713.0"
```

#### 3. Storage Service Implementation

**`packages/api-contract/src/services/storage.ts`** (263 lines):

**Before**: Supabase Storage client (141 lines)
**After**: AWS S3 SDK with pre-signed URLs (263 lines)

**Key Changes**:
- Replaced `StorageClient` with `S3Client`
- Replaced `upload()` with `PutObjectCommand`
- Replaced `createSignedUrl()` with `getSignedUrl()` from `@aws-sdk/s3-request-presigner`
- Added server-side encryption (AES-256)
- Added cache control headers
- Same interface (no changes needed in tRPC router)

**Methods** (interface unchanged):
```typescript
class StorageService {
  async uploadFile(path: string, fileContent: string, fileType: string)
  async getSignedUrl(path: string, expiresIn = 3600)
  async deleteFile(path: string)
  async fileExists(path: string) // New method
}
```

### Files Created

**`docs/reference/aws-s3-storage-security.md`** (900+ lines):
- Complete AWS S3 setup guide
- IAM user creation with least-privilege policy
- Bucket configuration (encryption, public access blocking)
- Security best practices
- Testing procedures
- Cost optimization strategies
- CloudWatch monitoring setup
- S3-compatible alternatives (DigitalOcean Spaces, Cloudflare R2)
- GDPR/HIPAA/SOC 2 compliance considerations

## Security Architecture (Unchanged)

### Multi-Layer Protection

| Layer | Protection | Implementation |
|-------|-----------|----------------|
| **1. Pre-Signed URLs** | Time-limited access | 1-hour expiration (same as Supabase) |
| **2. Private Bucket** | No public access | S3 bucket policy (same as Supabase RLS intent) |
| **3. Application Auth** | Session validation | tRPC `protectedProcedure` (unchanged) |
| **4. Database RLS** | Metadata access control | PostgreSQL RLS on `chat_files` (unchanged) |
| **5. Path Randomization** | URL guessing prevention | UUID suffix (unchanged) |
| **6. Encryption** | Data at rest | AES-256 SSE-S3 (same as Supabase) |

**Result**: Same security level, simpler implementation

## File Upload Flow (Unchanged)

```typescript
// 1. User uploads file via tRPC
const result = await trpc.chat.uploadChatFile.mutate({
  sessionId, fileName, fileType, fileSize, fileContent
});

// 2. Backend generates secure path with tenant isolation
const filePath = `${tenantId}/${sessionId}/${timestamp}-${uuid}-${fileName}`;

// 3. Upload to storage (S3 instead of Supabase, same interface)
await storage.uploadFile(filePath, fileContent, fileType);

// 4. Generate pre-signed URL (1-hour expiration, same as before)
const { signedUrl } = await storage.getSignedUrl(filePath, 3600);

// 5. Save metadata to database (unchanged)
await db.insert(chatFiles).values({ ... });

// 6. Return temporary URL (unchanged)
return { fileId, fileUrl: signedUrl, fileName };
```

## Database Schema (Unchanged)

**`packages/db/migrations/017_chat_files_secure_storage.sql`**:
- ✅ No changes required
- `chat_files` table still used for metadata tracking
- RLS policies still enforce tenant isolation
- Same foreign keys, indexes, and constraints

## tRPC Endpoints (Unchanged)

**`packages/api-contract/src/routers/chat.ts`**:
- ✅ No changes required
- `uploadChatFile` mutation works identically
- `getChatFile` query works identically
- Same input validation, same security checks

## Deployment Checklist

### Development Environment (Complete)
- [x] Remove Supabase directory and documentation
- [x] Update `.env.local` with S3 configuration
- [x] Update `.env.example` with S3 placeholders
- [x] Replace `@supabase/storage-js` with AWS SDK
- [x] Implement S3 StorageService
- [x] Create comprehensive S3 documentation
- [x] Run `pnpm install`
- [x] Run `pnpm typecheck` (✅ All passed)
- [x] Run `pnpm build` (✅ All successful)

### AWS S3 Setup (Required Before Testing)
- [ ] Create S3 bucket (or use S3-compatible service)
- [ ] Block all public access (CRITICAL)
- [ ] Enable default encryption (AES-256)
- [ ] Create IAM user with minimal permissions
- [ ] Generate access keys
- [ ] Update `.env.local` with real credentials
- [ ] Apply bucket policy (deny insecure transport)
- [ ] Test file upload via tRPC endpoint
- [ ] Verify pre-signed URL generation
- [ ] Test cross-tenant access prevention

### Production Environment (Pending)
- [ ] Create production S3 bucket
- [ ] Enable S3 server access logging
- [ ] Configure CloudWatch alarms
- [ ] Set up lifecycle policies (auto-delete old files)
- [ ] Enable S3 Object Lock (compliance mode)
- [ ] Configure bucket replication (disaster recovery)
- [ ] Update production environment variables
- [ ] Test in staging environment
- [ ] Deploy to production

## Cost Comparison

### Supabase Storage Pricing
- **Storage**: $0.021/GB/month
- **Bandwidth**: $0.09/GB
- **Requests**: Bundled in plan ($25/month minimum)

### AWS S3 Pricing (us-east-1)
- **Storage**: $0.023/GB/month (Standard)
- **PUT Requests**: $0.005/1,000
- **GET Requests**: $0.0004/1,000
- **Bandwidth**: $0.09/GB

**Estimate for 1,000 Users** (10 files/user/month, 500KB average):
```
Storage:       5GB × $0.023 = $0.12
PUT Requests:  10,000 × $0.005/1K = $0.05
GET Requests:  30,000 × $0.0004/1K = $0.01
Data Transfer: 15GB × $0.09 = $1.35
Total: ~$1.53/month (vs Supabase ~$25/month minimum)
```

### Alternative: Cloudflare R2
- **Storage**: $0.015/GB/month
- **Zero egress fees** (vs $0.09/GB for S3)
- **Same S3 API** (just change endpoint)
- **Estimated Cost**: ~$0.18/month for same usage

## Testing Status

### Type Safety
- ✅ TypeScript compilation successful
- ✅ All 21 packages typecheck passed
- ✅ No type errors

### Build
- ✅ All 13 packages build successful
- ✅ Production bundles generated
- ✅ No build errors

### Runtime Testing
- ⏳ Pending AWS credentials configuration
- ⏳ File upload test via tRPC endpoint
- ⏳ Pre-signed URL generation verification
- ⏳ Cross-tenant access prevention test
- ⏳ URL expiration test

## Next Steps

1. **Configure AWS S3**:
   - Create S3 bucket or use S3-compatible service
   - Follow setup guide in `docs/reference/aws-s3-storage-security.md`
   - Update `.env.local` with real credentials

2. **Test File Upload**:
   - Start development servers: `pnpm dev`
   - Upload test file via dashboard
   - Verify file appears in S3 bucket
   - Verify signed URL generation
   - Test file download

3. **Security Validation**:
   - Test cross-tenant access prevention
   - Verify URL expiration (wait 1 hour)
   - Test with expired session

4. **Production Deployment**:
   - Create production S3 bucket
   - Set up monitoring and alerting
   - Configure lifecycle policies
   - Deploy to staging first

## Rollback Plan

If S3 implementation has issues:

1. **Revert Git Changes**:
   ```bash
   git revert <commit-hash>
   pnpm install
   ```

2. **Restore Supabase Files**:
   - Restore from git history
   - Update environment variables
   - Re-create Supabase bucket

3. **Alternative**: Use local file storage temporarily:
   ```typescript
   // Simple fs-based storage for testing
   import fs from 'fs/promises';
   await fs.writeFile(`uploads/${filePath}`, buffer);
   ```

## References

- **Migration Guide**: `docs/reference/aws-s3-storage-security.md`
- **Database Schema**: `packages/db/migrations/017_chat_files_secure_storage.sql`
- **Storage Service**: `packages/api-contract/src/services/storage.ts`
- **tRPC Endpoints**: `packages/api-contract/src/routers/chat.ts` (lines 585-722)
- **AWS S3 Documentation**: https://docs.aws.amazon.com/s3/
- **Pre-Signed URLs**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html

## Lessons Learned

1. **Verify Auth Compatibility Early**: Check authentication system compatibility before selecting storage solution
2. **Avoid Dual Auth Systems**: Maintaining two authentication systems adds unnecessary complexity
3. **Prefer Native Stack**: Using tools native to your stack (Node.js vs Deno) reduces friction
4. **S3 API is Standard**: S3-compatible APIs provide flexibility (AWS, DigitalOcean, Cloudflare, MinIO)
5. **Application-Level RLS Works**: Database RLS + application logic provides sufficient security without storage-level RLS
