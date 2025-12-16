"""
VK-Agent Voice Activity Detection (VAD)

Silero VAD integration for filtering silence before sending audio to Gemini.
This saves 30-50ms latency on average by eliminating unnecessary API calls
for non-speech audio (40-60% of conversation time is silence/pauses).

Phase 1 Optimization:
    - Silero VAD: 87.7% true positive rate at 5% false positive rate
    - Sub-millisecond processing time per chunk
    - Graceful fallback if torch not available

Usage:
    >>> vad = VoiceActivityDetector()
    >>> if vad.is_speech(audio_chunk_16khz):
    ...     # Send to Gemini
    ...     await gemini.send_audio(audio_chunk)
    ... else:
    ...     # Skip silence
    ...     pass
"""

import logging
from typing import Optional
import numpy as np

logger = logging.getLogger(__name__)

# Try to import torch for Silero VAD
HAS_TORCH = False
HAS_VAD = False

try:
    import torch
    torch.set_num_threads(1)  # Single thread for low latency
    HAS_TORCH = True
    logger.debug("torch available for Silero VAD")
except ImportError:
    logger.warning("torch not available - VAD disabled")

# Load Silero VAD model if torch available
_vad_model = None
_vad_utils = None

if HAS_TORCH:
    try:
        _vad_model, _vad_utils = torch.hub.load(
            repo_or_dir='snakers4/silero-vad',
            model='silero_vad',
            force_reload=False,
            trust_repo=True,
        )
        # Reset model state for fresh start
        _vad_model.reset_states()
        HAS_VAD = True
        logger.info("Silero VAD model loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load Silero VAD model: {e}")
        _vad_model = None


class VoiceActivityDetector:
    """Voice Activity Detection using Silero VAD.

    Detects speech in audio chunks to filter silence before sending
    to Gemini, reducing unnecessary API calls and latency.

    Performance:
        - 87.7% true positive rate at 5% false positive rate
        - Sub-millisecond processing per chunk
        - ~30-50ms average latency savings

    Example:
        >>> vad = VoiceActivityDetector(threshold=0.5)
        >>>
        >>> # Check if audio contains speech
        >>> if vad.is_speech(audio_16khz):
        ...     await gemini.send_audio(audio)
        >>>
        >>> # Get speech probability
        >>> prob = vad.get_speech_probability(audio_16khz)
        >>> print(f"Speech probability: {prob:.2f}")
    """

    def __init__(
        self,
        threshold: float = 0.5,
        sample_rate: int = 16000,
        min_speech_duration_ms: int = 250,
        min_silence_duration_ms: int = 100,
    ):
        """Initialize Voice Activity Detector.

        Args:
            threshold: Speech detection threshold (0.0-1.0, default: 0.5)
            sample_rate: Audio sample rate (default: 16000 for Gemini)
            min_speech_duration_ms: Minimum speech duration to trigger (default: 250ms)
            min_silence_duration_ms: Minimum silence to stop speech (default: 100ms)
        """
        self.threshold = threshold
        self.sample_rate = sample_rate
        self.min_speech_duration_ms = min_speech_duration_ms
        self.min_silence_duration_ms = min_silence_duration_ms

        # State tracking
        self._is_speaking = False
        self._speech_frames = 0
        self._silence_frames = 0

        # Statistics
        self._total_frames = 0
        self._speech_frames_total = 0
        self._silence_frames_total = 0

        # Frame size for VAD (Silero expects specific sizes)
        # 512 samples = 32ms at 16kHz (supported by Silero)
        self._frame_size = 512

        self._available = HAS_VAD

        if self._available:
            logger.info(
                f"VAD initialized: threshold={threshold}, "
                f"sample_rate={sample_rate}Hz"
            )
        else:
            logger.warning("VAD not available - all audio will pass through")

    @property
    def is_available(self) -> bool:
        """Check if VAD is available."""
        return self._available

    @property
    def is_speaking(self) -> bool:
        """Check if currently in speech state."""
        return self._is_speaking

    def get_speech_probability(self, audio_data: bytes) -> float:
        """Get speech probability with audio normalization for quiet WebRTC streams.

        Args:
            audio_data: PCM16 audio bytes at configured sample rate

        Returns:
            Speech probability (0.0-1.0), or 1.0 if VAD unavailable

        Note:
            Silero VAD expects audio at typical speech levels (RMS ~3000-8000).
            WebRTC/Janus output is much quieter (RMS ~100-1600), so we normalize
            the audio before passing to Silero.
        """
        if not self._available or _vad_model is None:
            return 1.0  # Pass all audio if VAD not available

        try:
            samples = np.frombuffer(audio_data, dtype=np.int16)
            if len(samples) == 0:
                return 0.0

            # CRITICAL FIX: Normalize quiet WebRTC audio before Silero VAD
            # Silero expects audio at typical speech levels (RMS ~3000-8000)
            # WebRTC/Janus output is much quieter (RMS ~100-1600)
            rms = np.sqrt(np.mean(samples.astype(np.float32) ** 2))

            # Target RMS for Silero (typical speech level)
            target_rms = 5000.0

            # Calculate gain needed (with limits to prevent noise amplification)
            # WebRTC audio can be very quiet (RMS 3-20), so use low threshold
            if rms > 1:  # Only avoid division by zero
                gain = min(target_rms / rms, 50.0)  # Max 50x gain for very quiet audio
            else:
                gain = 1.0  # Don't amplify pure digital silence

            # Apply gain and clip to int16 range
            amplified = np.clip(samples.astype(np.float32) * gain, -32768, 32767)

            # Normalize to float32 [-1, 1] for Silero
            audio_float = amplified / 32768.0

            # Process in 512-sample chunks
            chunk_size = 512
            max_prob = 0.0

            for i in range(0, len(audio_float), chunk_size):
                chunk = audio_float[i:i + chunk_size]

                if len(chunk) < chunk_size // 2:
                    continue

                if len(chunk) < chunk_size:
                    chunk = np.pad(chunk, (0, chunk_size - len(chunk)), mode='constant')

                audio_tensor = torch.from_numpy(chunk.astype(np.float32))
                speech_prob = _vad_model(audio_tensor, self.sample_rate).item()
                max_prob = max(max_prob, speech_prob)

            return max_prob

        except Exception as e:
            logger.error(f"VAD error: {e}")
            return 1.0  # Pass audio on error

    def is_speech(self, audio_data: bytes) -> bool:
        """Check if audio chunk contains speech.

        Uses hysteresis to avoid rapid state changes:
        - Requires min_speech_duration_ms of speech to start
        - Requires min_silence_duration_ms of silence to stop

        Args:
            audio_data: PCM16 audio bytes at configured sample rate

        Returns:
            True if speech detected, False if silence
        """
        self._total_frames += 1

        if not self._available:
            return True  # Pass all audio if VAD not available

        prob = self.get_speech_probability(audio_data)
        is_speech_frame = prob > self.threshold

        # Calculate frame duration
        samples = len(audio_data) // 2  # PCM16 = 2 bytes per sample
        frame_duration_ms = (samples / self.sample_rate) * 1000

        if is_speech_frame:
            self._speech_frames += 1
            self._speech_frames_total += 1
            self._silence_frames = 0

            # Check if enough speech to trigger
            speech_duration = self._speech_frames * frame_duration_ms
            if speech_duration >= self.min_speech_duration_ms:
                self._is_speaking = True
        else:
            self._silence_frames += 1
            self._silence_frames_total += 1
            self._speech_frames = 0

            # Check if enough silence to stop
            silence_duration = self._silence_frames * frame_duration_ms
            if silence_duration >= self.min_silence_duration_ms:
                self._is_speaking = False

        return self._is_speaking

    def reset(self) -> None:
        """Reset VAD state."""
        self._is_speaking = False
        self._speech_frames = 0
        self._silence_frames = 0

    def get_stats(self) -> dict:
        """Get VAD statistics.

        Returns:
            Dictionary with VAD metrics
        """
        total = self._speech_frames_total + self._silence_frames_total
        speech_ratio = (
            self._speech_frames_total / total if total > 0 else 0.0
        )

        return {
            "available": self._available,
            "threshold": self.threshold,
            "is_speaking": self._is_speaking,
            "total_frames": self._total_frames,
            "speech_frames": self._speech_frames_total,
            "silence_frames": self._silence_frames_total,
            "speech_ratio": round(speech_ratio, 3),
            "silence_filtered_pct": round((1 - speech_ratio) * 100, 1),
        }


# Convenience function for simple use
def is_speech(audio_data: bytes, threshold: float = 0.5, sample_rate: int = 16000) -> bool:
    """Check if audio contains speech (stateless).

    Args:
        audio_data: PCM16 audio bytes
        threshold: Speech detection threshold (0.0-1.0)
        sample_rate: Audio sample rate

    Returns:
        True if speech detected
    """
    if not HAS_VAD or _vad_model is None:
        return True

    try:
        samples = np.frombuffer(audio_data, dtype=np.int16)
        audio_float = samples.astype(np.float32) / 32768.0
        audio_tensor = torch.from_numpy(audio_float)
        speech_prob = _vad_model(audio_tensor, sample_rate).item()
        return speech_prob > threshold
    except Exception:
        return True


async def test_vad() -> None:
    """Test VAD functionality."""
    import asyncio

    print("Testing Voice Activity Detector...")
    print(f"  torch available: {HAS_TORCH}")
    print(f"  VAD available: {HAS_VAD}")

    vad = VoiceActivityDetector(threshold=0.5)
    print(f"  VAD initialized: {vad.is_available}")

    if vad.is_available:
        # Generate test audio (silence)
        silence = np.zeros(16000, dtype=np.int16).tobytes()  # 1 second of silence

        # Generate test audio (noise/speech-like)
        noise = (np.random.randn(16000) * 8000).astype(np.int16).tobytes()

        print("\nTesting silence detection:")
        prob_silence = vad.get_speech_probability(silence)
        print(f"  Silence probability: {prob_silence:.3f}")

        print("\nTesting noise detection:")
        prob_noise = vad.get_speech_probability(noise)
        print(f"  Noise probability: {prob_noise:.3f}")

        print(f"\nVAD stats: {vad.get_stats()}")
    else:
        print("\nVAD not available - install torch to enable")

    print("\nVAD test complete!")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_vad())
