"""
Pytest configuration and fixtures
"""

import asyncio
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, Mock

# Add parent directory to path for imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_livekit_context():
    """Mock LiveKit JobContext"""
    ctx = Mock()
    ctx.room = Mock()
    ctx.room.name = "tenant_test_room123"
    ctx.room.metadata = "{}"
    return ctx


@pytest.fixture
def mock_backend_client():
    """Mock BackendClient"""
    client = AsyncMock()
    client.search_knowledge = AsyncMock(return_value=[
        {
            "content": "Test knowledge",
            "similarity": 0.85,
            "metadata": {"source": "test.pdf"}
        }
    ])
    client.log_cost_event = AsyncMock()
    return client


@pytest.fixture
def mock_ai_providers():
    """Mock AI provider responses"""
    return {
        "gemini_flash_lite": Mock(return_value="Flash Lite response"),
        "gemini_flash": Mock(return_value="Flash response"),
        "claude_sonnet": Mock(return_value="Claude response")
    }


@pytest.fixture
def sample_tenant_config():
    """Sample tenant configuration"""
    from config import TenantConfig
    return TenantConfig(
        tenant_id="test_tenant",
        system_prompt="You are a helpful assistant",
        gemini_flash_lite_weight=0.60,
        gemini_flash_weight=0.25,
        claude_sonnet_weight=0.15
    )


@pytest.fixture
def sample_video_frame():
    """Create a sample video frame for testing"""
    import numpy as np
    from PIL import Image

    # Create 640x480 RGB test image
    data = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    return Image.fromarray(data)


@pytest_asyncio.fixture
async def mock_redis():
    """Mock Redis connection"""
    redis = AsyncMock()
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock()
    redis.setex = AsyncMock()
    redis.delete = AsyncMock()
    redis.scan = AsyncMock(return_value=(0, []))
    redis.eval = AsyncMock(return_value=[1, 1])  # Rate limit allowed
    return redis


@pytest_asyncio.fixture
async def mock_postgres():
    """Mock PostgreSQL connection"""
    conn = AsyncMock()
    conn.fetch = AsyncMock(return_value=[])
    conn.fetchval = AsyncMock(return_value=0)
    conn.execute = AsyncMock()
    return conn
