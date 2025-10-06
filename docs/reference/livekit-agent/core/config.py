"""
Agent Configuration
==================

Simplified configuration without service tier duplication.
Service tiers are fetched from backend API at runtime.

Changes from original (iteration.md recommendations):
- ❌ Removed SERVICE_TIER_CONFIGS (duplicate of TypeScript config)
- ✅ Service limits now fetched from tRPC API
- ✅ Aligned with documented environment structure
"""

import os
from dataclasses import dataclass, field

@dataclass
class EnvironmentConfig:
    """
    Environment configuration with validation

    Aligned with documented .env structure from:
    - 13-CONFIGURATION-GUIDE.md
    - 05-DEVELOPMENT-SETUP.md
    """

    # Required LiveKit settings
    livekit_url: str = field(default_factory=lambda: os.getenv('LIVEKIT_URL', ''))
    livekit_api_key: str = field(default_factory=lambda: os.getenv('LIVEKIT_API_KEY', ''))
    livekit_api_secret: str = field(default_factory=lambda: os.getenv('LIVEKIT_API_SECRET', ''))

    # Required AI service settings
    openai_api_key: str = field(default_factory=lambda: os.getenv('OPENAI_API_KEY', ''))
    deepgram_api_key: str = field(default_factory=lambda: os.getenv('DEEPGRAM_API_KEY', ''))

    # Optional TTS fallback
    cartesia_api_key: str = field(default_factory=lambda: os.getenv('CARTESIA_API_KEY', ''))

    # Premium Voice (Production)
    rime_api_key: str = field(default_factory=lambda: os.getenv('RIME_API_KEY', ''))

    # Backend API connection
    api_base_url: str = field(default_factory=lambda: os.getenv('API_BASE_URL', 'http://localhost:3001'))
    agent_api_key: str = field(default_factory=lambda: os.getenv('AGENT_API_KEY', ''))

    # Environment settings
    agent_env: str = field(default_factory=lambda: os.getenv('AGENT_ENV', 'development'))

    def __post_init__(self):
        self.validate()

    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.agent_env == 'production'

    @property
    def use_premium_voice(self) -> bool:
        """Check if should use Rime AI for voice"""
        return self.is_production and bool(self.rime_api_key)

    def validate(self):
        """Validate environment configuration"""
        # Base required fields
        required_fields = {
            'LIVEKIT_URL': self.livekit_url,
            'LIVEKIT_API_KEY': self.livekit_api_key,
            'LIVEKIT_API_SECRET': self.livekit_api_secret,
            'OPENAI_API_KEY': self.openai_api_key,
            'DEEPGRAM_API_KEY': self.deepgram_api_key,
            'API_BASE_URL': self.api_base_url,
        }

        # In development, Cartesia is recommended as TTS fallback
        if not self.is_production and not self.cartesia_api_key:
            print("⚠️ WARNING: CARTESIA_API_KEY not set. OpenAI TTS will be used as fallback.")

        # In production, check for Rime with fallback
        if self.is_production and not self.rime_api_key:
            print("ℹ️ INFO: RIME_API_KEY not set. OpenAI TTS will be used instead of premium voice.")
            if not self.cartesia_api_key:
                print("⚠️ WARNING: CARTESIA_API_KEY also not set. Only OpenAI TTS available.")

        missing_fields = [field for field, value in required_fields.items() if not value]
        if missing_fields:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_fields)}")

# Global configuration instance
env_config = EnvironmentConfig()

def validate_environment() -> bool:
    """Validate environment configuration"""
    try:
        env_config.validate()
        return True
    except ValueError as e:
        print(f"❌ Environment validation failed: {e}")
        return False
