import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from './client';
import * as schema from './schema/index';

export async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Set a placeholder tenant ID to satisfy RLS policies during seeding
    // This is required because FORCE RLS is enabled on all tables
    // Use SET SESSION (not SET LOCAL) since we're not in an explicit transaction
    const placeholderTenantId = '00000000-0000-0000-0000-000000000000';
    await db.execute(sql.raw(`SET SESSION app.current_tenant_id = '${placeholderTenantId}'`));
    console.log('✅ Set placeholder tenant context');

    // Create demo tenant (INSERT policy allows this without tenant context)
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

    // Create demo user
    // NOTE: In production, users will authenticate via OAuth (Google/Microsoft)
    // Password hash only needed for development/testing
    const hashedPassword = crypto.createHash('sha256').update('password123').digest('hex');

    const userResult = await db
      .insert(schema.users)
      .values({
        tenantId: tenant.id,
        email: 'admin@acme.com',
        passwordHash: hashedPassword,
        role: 'owner',
        name: 'John Doe',
      })
      .returning();

    const user = userResult[0];
    if (!user) {
      throw new Error('Failed to create user');
    }

    console.log('✅ Created user:', user.email);

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

    console.log('🎉 Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
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
