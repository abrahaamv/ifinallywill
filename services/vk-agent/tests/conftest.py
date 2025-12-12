"""
VK-Agent Test Configuration
"""

import pytest
import asyncio
from typing import Generator


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def sample_audio_16k() -> bytes:
    """Generate sample 16kHz PCM16 audio (1 second of sine wave)."""
    import numpy as np

    duration = 0.1  # 100ms
    sample_rate = 16000
    frequency = 440  # A4 note

    t = np.linspace(0, duration, int(sample_rate * duration), False)
    samples = (np.sin(2 * np.pi * frequency * t) * 32767).astype(np.int16)
    return samples.tobytes()


@pytest.fixture
def sample_audio_48k() -> bytes:
    """Generate sample 48kHz PCM16 audio (1 second of sine wave)."""
    import numpy as np

    duration = 0.1  # 100ms
    sample_rate = 48000
    frequency = 440  # A4 note

    t = np.linspace(0, duration, int(sample_rate * duration), False)
    samples = (np.sin(2 * np.pi * frequency * t) * 32767).astype(np.int16)
    return samples.tobytes()


@pytest.fixture
def mock_opus_frame() -> bytes:
    """Mock Opus encoded frame (20ms at 48kHz)."""
    # This is not valid Opus data, just for testing RTP handling
    return b"\x00" * 100
