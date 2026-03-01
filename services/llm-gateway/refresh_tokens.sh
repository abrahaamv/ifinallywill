#!/bin/bash

# Refresh Supabase Tokens Automation Script
# This script refreshes your Supabase access token using the refresh token

set -e

# Load environment variables
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

# Parse .env file
SUPABASE_URL=$(grep SUPABASE_URL .env | cut -d '=' -f2)
SUPABASE_ANON_KEY=$(grep SUPABASE_ANON_KEY .env | cut -d '=' -f2)
CURRENT_REFRESH_TOKEN=$(grep REFRESH_TOKEN .env | cut -d '=' -f2)

echo "🔄 Attempting to refresh tokens..."
echo "📍 Supabase URL: $SUPABASE_URL"

# Call Supabase refresh token endpoint
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d "{\"refresh_token\":\"$CURRENT_REFRESH_TOKEN\"}")

# Check if response contains error
if echo "$RESPONSE" | grep -q '"error"'; then
    echo "❌ Error: Token refresh failed"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

# Extract new tokens
NEW_ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')
NEW_REFRESH_TOKEN=$(echo "$RESPONSE" | jq -r '.refresh_token')
EXPIRES_AT=$(echo "$RESPONSE" | jq -r '.expires_at')

if [ "$NEW_ACCESS_TOKEN" == "null" ] || [ -z "$NEW_ACCESS_TOKEN" ]; then
    echo "❌ Error: Failed to extract new tokens from response"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

echo "✅ Tokens refreshed successfully!"

# Update .env file
sed -i "s|USER_TOKEN=.*|USER_TOKEN=$NEW_ACCESS_TOKEN|" .env
sed -i "s|REFRESH_TOKEN=.*|REFRESH_TOKEN=$NEW_REFRESH_TOKEN|" .env
sed -i "s|TOKEN_EXPIRES_AT=.*|TOKEN_EXPIRES_AT=$EXPIRES_AT|" .env

echo "📝 Updated .env file with new tokens"
echo "⏰ New expiry: $(date -d @$EXPIRES_AT 2>/dev/null || echo $EXPIRES_AT)"

exit 0
