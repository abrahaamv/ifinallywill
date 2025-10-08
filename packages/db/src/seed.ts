import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from './client';
import * as schema from './schema/index';

export async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Temporarily disable RLS for all tables during seeding
    // This is safe because seed script is only run in development
    await db.execute(sql`ALTER TABLE tenants DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE users DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE auth_sessions DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE widgets DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE knowledge_documents DISABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE ai_personalities DISABLE ROW LEVEL SECURITY`);
    console.log('✅ Disabled RLS for seeding');

    // Set a placeholder tenant ID to satisfy application logic
    // (not required for RLS since it's disabled, but good for consistency)
    const placeholderTenantId = '00000000-0000-0000-0000-000000000000';
    await db.execute(sql.raw(`SET SESSION app.current_tenant_id = '${placeholderTenantId}'`));
    console.log('✅ Set placeholder tenant context');

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

    console.log('✅ Created tenant:', tenant.id);

    // Update session variable to the actual tenant ID for subsequent inserts
    await db.execute(sql.raw(`SET SESSION app.current_tenant_id = '${tenant.id}'`));
    console.log('✅ Updated tenant context to:', tenant.id);

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

    console.log('✅ Created admin user:', admin.email, '(password: Admin@123!)');

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

    console.log('✅ Created member user:', member.email, '(password: Member@123!)');

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

    console.log('✅ Created team admin user:', teamAdmin.email, '(password: TeamAdmin@123!)');

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

    console.log('✅ Created auth session');

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

    console.log('✅ Created widget:', widget.id);

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

    console.log('✅ Created knowledge document:', doc.id);

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

    console.log('✅ Created AI personality:', personality.id);

    // Re-enable RLS for all tables after seeding
    await db.execute(sql`ALTER TABLE tenants ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE users ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE widgets ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY`);
    await db.execute(sql`ALTER TABLE ai_personalities ENABLE ROW LEVEL SECURITY`);
    console.log('✅ Re-enabled RLS after seeding');

    console.log('🎉 Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);

    // Ensure RLS is re-enabled even if seeding fails
    try {
      await db.execute(sql`ALTER TABLE tenants ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE users ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE widgets ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY`);
      await db.execute(sql`ALTER TABLE ai_personalities ENABLE ROW LEVEL SECURITY`);
      console.log('✅ Re-enabled RLS in error handler');
    } catch (rlsError) {
      console.error('❌ Failed to re-enable RLS:', rlsError);
    }

    throw error;
  }
}

// Run seed if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => {
      console.log('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
