
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_ANON_KEY || 'default-insecure-secret-do-not-use-prod';

export class KeyService {
    /**
     * Generates a stateless API key for a user
     */
    generateKey(email: string): string {
        const payload = {
            sub: email,
            iat: Math.floor(Date.now() / 1000),
            type: 'fsociety_access'
        };

        // Sign and wrap in custom prefix (sk-ant-api03 to look official)
        const token = jwt.sign(payload, JWT_SECRET);
        return `sk-ant-api03-${Buffer.from(token).toString('base64')}`;
    }

    /**
     * Verifies an API key and returns the user email if valid
     */
    verifyKey(apiKey: string | undefined): string | null {
        try {
            if (!apiKey || !apiKey.startsWith('sk-ant-api03-')) return null;

            const token = Buffer.from(apiKey.replace('sk-ant-api03-', ''), 'base64').toString();
            const decoded = jwt.verify(token, JWT_SECRET) as any;

            if (decoded.type !== 'fsociety_access') return null;

            return decoded.sub;
        } catch (error) {
            console.warn('[KeyService] Invalid key:', error);
            return null;
        }
    }
}

export const keyService = new KeyService();
