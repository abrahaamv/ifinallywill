import crypto from 'node:crypto';
import { createDatabaseLogger } from '@platform/shared';
import { sql } from 'drizzle-orm';
import { db } from './client';
import * as schema from './schema/index';

const logger = createDatabaseLogger();

export async function seed() {
  logger.info('🌱 Seeding database...');

  // Ensure database is available (not in browser context)
  if (!db) {
    throw new Error('Database not available - cannot seed in browser context');
  }

  try {
    // Temporarily disable RLS for all tables during seeding
    // This is safe because seed script is only run in development
    await db.execute(sql`ALTER TABLE tenants DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE users DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE auth_sessions DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE widgets DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE knowledge_documents DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE ai_personalities DISABLE ROW LEVEL SECURITY`);
    logger.info('✅ Disabled RLS for seeding');

    // Set a placeholder tenant ID to satisfy application logic
    // (not required for RLS since it's disabled, but good for consistency)
    const placeholderTenantId = '00000000-0000-0000-0000-000000000000';
    await db.execute(sql.raw(`SET SESSION app.current_tenant_id = '${placeholderTenantId}'`));
    logger.info('✅ Set placeholder tenant context');

    // Create demo tenant
    const tenantResult = await db
      .insert(schema.tenants)
      .values({
        name: 'Acme Corporation',
        apiKey: `pk_test_${crypto.randomBytes(16).toString('hex')}`,
        plan: 'business',
        settings: {
          maxMonthlySpend: 1000,
          allowedDomains: ['https://acme.com'],
          features: ['chat', 'meetings', 'knowledge-base'],
        },
      })
      .returning();

    const tenant = tenantResult[0];
    if (!tenant) {
      throw new Error('Failed to create tenant');
    }

    logger.info('✅ Created tenant', { tenantId: tenant.id });

    // Update session variable to the actual tenant ID for subsequent inserts
    await db.execute(sql.raw(`SET SESSION app.current_tenant_id = '${tenant.id}'`));
    logger.info('✅ Updated tenant context', { tenantId: tenant.id });

    // Create demo users with proper Argon2id password hashing
    // NOTE: In production, users will authenticate via OAuth (Google/Microsoft)
    // Password hash only needed for development/testing

    // Import password service for proper hashing
    const { hash } = await import('@node-rs/argon2');

    // Admin user (owner role)
    const adminPassword = await hash('Admin@123!', {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    const adminResult = await db
      .insert(schema.users)
      .values({
        tenantId: tenant.id,
        email: 'admin@acme.com',
        passwordHash: adminPassword,
        passwordAlgorithm: 'argon2id',
        role: 'owner',
        name: 'John Doe',
        emailVerified: new Date(), // Mark as verified for testing
      })
      .returning();

    const admin = adminResult[0];
    if (!admin) {
      throw new Error('Failed to create admin user');
    }

    logger.info('✅ Created admin user', { email: admin.email, note: 'password: Admin@123!' });

    // Regular user (member role)
    const memberPassword = await hash('Member@123!', {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    const memberResult = await db
      .insert(schema.users)
      .values({
        tenantId: tenant.id,
        email: 'user@acme.com',
        passwordHash: memberPassword,
        passwordAlgorithm: 'argon2id',
        role: 'member',
        name: 'Jane Smith',
        emailVerified: new Date(),
      })
      .returning();

    const member = memberResult[0];
    if (!member) {
      throw new Error('Failed to create member user');
    }

    logger.info('✅ Created member user', { email: member.email, note: 'password: Member@123!' });

    // Team admin (admin role)
    const teamAdminPassword = await hash('TeamAdmin@123!', {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    const teamAdminResult = await db
      .insert(schema.users)
      .values({
        tenantId: tenant.id,
        email: 'teamadmin@acme.com',
        passwordHash: teamAdminPassword,
        passwordAlgorithm: 'argon2id',
        role: 'admin',
        name: 'Bob Johnson',
        emailVerified: new Date(),
      })
      .returning();

    const teamAdmin = teamAdminResult[0];
    if (!teamAdmin) {
      throw new Error('Failed to create team admin user');
    }

    logger.info('✅ Created team admin user', {
      email: teamAdmin.email,
      note: 'password: TeamAdmin@123!',
    });

    const user = admin; // Use admin for subsequent operations

    // Create demo Auth.js session (optional, for testing)
    const sessionToken = crypto.randomUUID();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days

    await db.insert(schema.authSessions).values({
      sessionToken,
      userId: user.id,
      expires: expiryDate,
    });

    logger.info('✅ Created auth session');

    // Create demo widget
    const widgetResult = await db
      .insert(schema.widgets)
      .values({
        tenantId: tenant.id,
        name: 'Main Website Widget',
        domainWhitelist: ['https://acme.com', 'https://www.acme.com'],
        settings: {
          theme: 'auto',
          position: 'bottom-right',
          greeting: 'Hi! How can I help you today?',
        },
      })
      .returning();

    const widget = widgetResult[0];
    if (!widget) {
      throw new Error('Failed to create widget');
    }

    logger.info('✅ Created widget', { widgetId: widget.id });

    // Create demo knowledge document
    const docResult = await db
      .insert(schema.knowledgeDocuments)
      .values({
        tenantId: tenant.id,
        title: 'Getting Started Guide',
        content: 'Welcome to our platform! Here is how to get started with our AI assistant...',
        category: 'onboarding',
        metadata: {
          source: 'docs',
          tags: ['beginner', 'tutorial'],
        },
      })
      .returning();

    const doc = docResult[0];
    if (!doc) {
      throw new Error('Failed to create knowledge document');
    }

    logger.info('✅ Created knowledge document', { documentId: doc.id });

    // Create AI personality
    const personalityResult = await db
      .insert(schema.aiPersonalities)
      .values({
        tenantId: tenant.id,
        name: 'Helpful Assistant',
        description: 'A friendly and knowledgeable assistant',
        systemPrompt:
          'You are a helpful AI assistant for Acme Corporation. Be friendly, professional, and concise in your responses.',
        temperature: '0.7',
        maxTokens: 2000,
        isDefault: true,
        isActive: true,
      })
      .returning();

    const personality = personalityResult[0];
    if (!personality) {
      throw new Error('Failed to create AI personality');
    }

    logger.info('✅ Created AI personality', { personalityId: personality.id });

    // ==================== IFinallyWill Seed Data ====================

    // Seed estate documents for admin user (Ontario, all 4 doc types)
    const province = 'ON';
    const docTypes = ['primary_will', 'poa_property', 'poa_health'] as const;

    // Disable RLS on willsystem tables
    await db.execute(sql`ALTER TABLE estate_documents DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE will_data DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE poa_data DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE key_names DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE estate_assets DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE bequests DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE document_types DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE asset_classes DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE document_orders DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE document_order_items DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE generated_documents DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE partners DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE discount_codes DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE code_usages DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE template_versions DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE api_tenants DISABLE ROW LEVEL SECURITY`);

    for (const docType of docTypes) {
      const [estateDoc] = await db
        .insert(schema.estateDocuments)
        .values({
          userId: admin.id,
          tenantId: tenant.id,
          documentType: docType,
          province,
          country: 'Canada',
          status: 'draft',
          completionPct: 0,
        })
        .returning();

      if (docType === 'primary_will') {
        await db.insert(schema.willData).values({
          estateDocId: estateDoc.id,
          tenantId: tenant.id,
        });
        logger.info('✅ Created primary will + willData', { estateDocId: estateDoc.id });
      } else {
        await db.insert(schema.poaData).values({
          estateDocId: estateDoc.id,
          tenantId: tenant.id,
        });
        logger.info(`✅ Created ${docType} + poaData`, { estateDocId: estateDoc.id });
      }
    }

    // Seed asset classes (reference data — 20 types)
    const assetClassValues = [
      { classNumber: 1, name: 'Real Estate - Primary Residence', fieldSchema: [{ name: 'address', label: 'Address', type: 'text' as const, required: true }, { name: 'estimatedValue', label: 'Estimated Value', type: 'currency' as const }] },
      { classNumber: 2, name: 'Real Estate - Investment Property', fieldSchema: [{ name: 'address', label: 'Address', type: 'text' as const, required: true }, { name: 'estimatedValue', label: 'Estimated Value', type: 'currency' as const }] },
      { classNumber: 3, name: 'Real Estate - Vacation Property', fieldSchema: [{ name: 'address', label: 'Address', type: 'text' as const, required: true }, { name: 'estimatedValue', label: 'Estimated Value', type: 'currency' as const }] },
      { classNumber: 4, name: 'Vehicle - Car', fieldSchema: [{ name: 'make', label: 'Make', type: 'text' as const, required: true }, { name: 'model', label: 'Model', type: 'text' as const, required: true }, { name: 'year', label: 'Year', type: 'number' as const }, { name: 'vin', label: 'VIN', type: 'text' as const }] },
      { classNumber: 5, name: 'Vehicle - Other', fieldSchema: [{ name: 'description', label: 'Description', type: 'text' as const, required: true }, { name: 'estimatedValue', label: 'Estimated Value', type: 'currency' as const }] },
      { classNumber: 6, name: 'Bank Account - Chequing', fieldSchema: [{ name: 'institution', label: 'Financial Institution', type: 'text' as const, required: true }, { name: 'accountType', label: 'Account Type', type: 'text' as const }] },
      { classNumber: 7, name: 'Bank Account - Savings', fieldSchema: [{ name: 'institution', label: 'Financial Institution', type: 'text' as const, required: true }, { name: 'accountType', label: 'Account Type', type: 'text' as const }] },
      { classNumber: 8, name: 'Investment - RRSP', fieldSchema: [{ name: 'institution', label: 'Financial Institution', type: 'text' as const, required: true }, { name: 'accountNumber', label: 'Account Number', type: 'text' as const }] },
      { classNumber: 9, name: 'Investment - TFSA', fieldSchema: [{ name: 'institution', label: 'Financial Institution', type: 'text' as const, required: true }, { name: 'accountNumber', label: 'Account Number', type: 'text' as const }] },
      { classNumber: 10, name: 'Investment - Non-Registered', fieldSchema: [{ name: 'institution', label: 'Financial Institution', type: 'text' as const, required: true }, { name: 'description', label: 'Description', type: 'text' as const }] },
      { classNumber: 11, name: 'Life Insurance', fieldSchema: [{ name: 'provider', label: 'Insurance Provider', type: 'text' as const, required: true }, { name: 'policyNumber', label: 'Policy Number', type: 'text' as const }, { name: 'faceValue', label: 'Face Value', type: 'currency' as const }] },
      { classNumber: 12, name: 'Business Interest', fieldSchema: [{ name: 'businessName', label: 'Business Name', type: 'text' as const, required: true }, { name: 'ownershipPct', label: 'Ownership %', type: 'number' as const }, { name: 'businessType', label: 'Type', type: 'text' as const }] },
      { classNumber: 13, name: 'Jewelry & Precious Items', fieldSchema: [{ name: 'description', label: 'Description', type: 'textarea' as const, required: true }, { name: 'estimatedValue', label: 'Estimated Value', type: 'currency' as const }] },
      { classNumber: 14, name: 'Art & Collectibles', fieldSchema: [{ name: 'description', label: 'Description', type: 'textarea' as const, required: true }, { name: 'estimatedValue', label: 'Estimated Value', type: 'currency' as const }] },
      { classNumber: 15, name: 'Furniture & Household Items', fieldSchema: [{ name: 'description', label: 'Description', type: 'textarea' as const, required: true }] },
      { classNumber: 16, name: 'Digital Assets', fieldSchema: [{ name: 'platform', label: 'Platform/Service', type: 'text' as const, required: true }, { name: 'description', label: 'Description', type: 'text' as const }] },
      { classNumber: 17, name: 'Cryptocurrency', fieldSchema: [{ name: 'currency', label: 'Currency', type: 'text' as const, required: true }, { name: 'exchange', label: 'Exchange/Wallet', type: 'text' as const }] },
      { classNumber: 18, name: 'Pension', fieldSchema: [{ name: 'employer', label: 'Employer', type: 'text' as const, required: true }, { name: 'pensionType', label: 'Type', type: 'select' as const, options: ['Defined Benefit', 'Defined Contribution'] }] },
      { classNumber: 19, name: 'Intellectual Property', fieldSchema: [{ name: 'description', label: 'Description', type: 'textarea' as const, required: true }, { name: 'registrationNumber', label: 'Registration #', type: 'text' as const }] },
      { classNumber: 20, name: 'Other Asset', fieldSchema: [{ name: 'description', label: 'Description', type: 'textarea' as const, required: true }, { name: 'estimatedValue', label: 'Estimated Value', type: 'currency' as const }] },
    ];

    await db.insert(schema.assetClasses).values(assetClassValues);
    logger.info('✅ Seeded 20 asset classes');

    // Seed document types (4 types with pricing)
    const documentTypeValues = [
      { name: 'primaryWill', displayName: 'Last Will & Testament', description: 'Your primary will covering the distribution of your estate', basePrice: 8900, province: null, country: 'Canada' },
      { name: 'secondaryWill', displayName: 'Secondary Will', description: 'A secondary will for private company shares and other assets', basePrice: 6900, province: null, country: 'Canada' },
      { name: 'poaProperty', displayName: 'Power of Attorney for Property', description: 'Designate someone to manage your financial affairs', basePrice: 4900, province: null, country: 'Canada' },
      { name: 'poaHealth', displayName: 'Power of Attorney for Health', description: 'Designate someone to make health care decisions on your behalf', basePrice: 4900, province: null, country: 'Canada' },
    ];

    await db.insert(schema.documentTypes).values(documentTypeValues);
    logger.info('✅ Seeded 4 document types');

    // Re-enable RLS for all tables after seeding
    await db.execute(sql`ALTER TABLE tenants ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE users ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE widgets ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE ai_personalities ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE estate_documents ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE will_data ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE poa_data ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE key_names ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE estate_assets ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE bequests ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE document_types ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE asset_classes ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE document_orders ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE document_order_items ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE partners ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE code_usages ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE api_tenants ENABLE ROW LEVEL SECURITY`);
    logger.info('✅ Re-enabled RLS after seeding');

    logger.info('🎉 Seeding complete!');
  } catch (error) {
    logger.error('❌ Seeding failed', { error });

    // Ensure RLS is re-enabled even if seeding fails
    try {
      await db.execute(sql`ALTER TABLE tenants ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE users ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE widgets ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE ai_personalities ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE estate_documents ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE will_data ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE poa_data ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE key_names ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE estate_assets ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE bequests ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE document_types ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE asset_classes ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE document_orders ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE document_order_items ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE partners ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE code_usages ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE api_tenants ENABLE ROW LEVEL SECURITY`);
      logger.info('✅ Re-enabled RLS in error handler');
    } catch (rlsError) {
      logger.error('❌ Failed to re-enable RLS', { error: rlsError });
    }

    throw error;
  }
}

// Run seed if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      logger.info('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('❌ Seed failed', { error: err });
      process.exit(1);
    });
}
