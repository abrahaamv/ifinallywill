-- Create Chatwoot database for human agent escalation inbox
-- Part of VisualKit Platform integration

-- Create the chatwoot database
CREATE DATABASE chatwoot;

-- Grant permissions to platform user on chatwoot database
GRANT ALL PRIVILEGES ON DATABASE chatwoot TO platform;
