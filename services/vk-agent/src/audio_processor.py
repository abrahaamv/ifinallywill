"""
VK-Agent Audio Processor

Handles audio format conversion between Janus AudioBridge and Gemini Live API.

Pipeline:
    Janus → Agent (RTP Opus 48kHz → Decode → Resample → PCM16 16kHz) → Gemini
    Gemini → Agent (PCM16 24kHz → Resample → Encode → RTP Opus 48kHz) → Janus

Features:
    - Opus encoding/decoding using opuslib
    - High-quality resampling using scipy.signal
    - Efficient PCM16 <-> numpy array conversion
    - Graceful fallback when dependencies unavailable

Audio Formats:
    - Janus AudioBridge: Opus @ 48kHz mono
    - Gemini Input: PCM16 @ 16kHz mono
    - Gemini Output: PCM16 @ 24kHz mono
"""

import logging
from typing import Optional, List
import numpy as np

from .config import AudioConfig

logger = logging.getLogger(__name__)


# Try to import opuslib for Opus codec support
try:
    import opuslib
    HAS_OPUS = True
    logger.debug("opuslib available for Opus codec support")
except ImportError:
    HAS_OPUS = False
    logger.warning("opuslib not available - Opus codec support disabled")


# Try to import scipy for high-quality resampling
try:
    from scipy import signal
    HAS_SCIPY = True
    logger.debug("scipy available for high-quality resampling")
except ImportError:
    HAS_SCIPY = False
    logger.warning("scipy not available - using linear interpolation for resampling")


class AudioProcessor:
    """Audio processor for Janus-Gemini format conversion.

    Handles the complete audio pipeline:
    - Opus decoding (Janus → PCM)
    - Sample rate conversion (48kHz ↔ 16kHz ↔ 24kHz)
    - Opus encoding (PCM → Janus)

    Example:
        >>> processor = AudioProcessor()
        >>>
        >>> # Janus → Gemini (user speech)
        >>> pcm_16k = processor.janus_to_gemini(opus_packet)
        >>>
        >>> # Gemini → Janus (AI response)
        >>> opus_frames = processor.gemini_to_janus(pcm_24k)
    """

    def __init__(self, config: Optional[AudioConfig] = None):
        """Initialize audio processor.

        Args:
            config: Audio configuration (uses defaults if not provided)
        """
        self.config = config or AudioConfig()

        # Sample rates
        self.janus_sample_rate = self.config.janus_sample_rate
        self.gemini_input_rate = self.config.gemini_input_rate
        self.gemini_output_rate = self.config.gemini_output_rate

        # Frame size for 20ms at 48kHz (standard Opus frame)
        self.opus_frame_size = self.config.janus_frame_samples

        # Initialize codecs
        self._opus_decoder: Optional[opuslib.Decoder] = None
        self._opus_encoder: Optional[opuslib.Encoder] = None
        self._init_opus_codecs()

        # Statistics
        self._decode_count = 0
        self._encode_count = 0
        self._decode_errors = 0
        self._encode_errors = 0

        logger.info(
            f"AudioProcessor initialized: "
            f"Janus={self.janus_sample_rate}Hz, "
            f"Gemini In={self.gemini_input_rate}Hz, "
            f"Gemini Out={self.gemini_output_rate}Hz, "
            f"Opus={'enabled' if self._opus_decoder else 'disabled'}"
        )

    def _init_opus_codecs(self) -> None:
        """Initialize Opus encoder and decoder."""
        if not HAS_OPUS:
            logger.warning("Opus codecs not available - audio bridge will not work")
            return

        try:
            # Decoder for incoming Janus audio
            self._opus_decoder = opuslib.Decoder(
                fs=self.janus_sample_rate,
                channels=1
            )

            # Encoder for outgoing audio to Janus
            self._opus_encoder = opuslib.Encoder(
                fs=self.janus_sample_rate,
                channels=1,
                application=opuslib.APPLICATION_VOIP
            )

            # Configure encoder for voice
            self._opus_encoder.complexity = 5  # Balance quality/CPU

            logger.info(
                f"Opus codecs initialized: {self.janus_sample_rate}Hz mono, "
                f"frame_size={self.opus_frame_size}"
            )

        except Exception as e:
            logger.error(f"Failed to initialize Opus codecs: {e}")
            self._opus_decoder = None
            self._opus_encoder = None

    @property
    def is_ready(self) -> bool:
        """Check if processor is ready for audio conversion."""
        return HAS_OPUS and self._opus_decoder is not None

    def decode_opus(self, opus_data: bytes) -> Optional[np.ndarray]:
        """Decode Opus audio to PCM samples.

        Args:
            opus_data: Opus encoded audio bytes

        Returns:
            numpy array of int16 PCM samples at 48kHz, or None on error
        """
        if not self._opus_decoder:
            logger.warning("[AUDIO-DEBUG] Opus decoder not available!")
            return None

        try:
            # DEBUG: Log decode attempt
            if self._decode_count % 50 == 0:
                logger.info(
                    f"[AUDIO-DEBUG] Decoding Opus: "
                    f"size={len(opus_data)}, "
                    f"frame_size={self.opus_frame_size}, "
                    f"total_decoded={self._decode_count}"
                )

            # Decode Opus packet
            pcm_data = self._opus_decoder.decode(
                opus_data,
                frame_size=self.opus_frame_size
            )

            # Convert bytes to numpy array
            samples = np.frombuffer(pcm_data, dtype=np.int16)
            self._decode_count += 1
            return samples

        except opuslib.OpusError as e:
            self._decode_errors += 1
            if self._decode_errors % 50 == 1:
                logger.warning(f"Opus decode error (count={self._decode_errors}): {e}")
            return None
        except Exception as e:
            self._decode_errors += 1
            logger.error(f"Unexpected decode error: {e}")
            return None

    def encode_opus(self, pcm_samples: np.ndarray) -> Optional[bytes]:
        """Encode PCM samples to Opus.

        Args:
            pcm_samples: numpy array of int16 PCM samples at 48kHz
                        Must be exactly opus_frame_size samples (960 for 20ms)

        Returns:
            Opus encoded bytes, or None on error
        """
        if not self._opus_encoder:
            logger.debug("Opus encoder not available")
            return None

        try:
            # Ensure correct dtype
            if pcm_samples.dtype != np.int16:
                pcm_samples = pcm_samples.astype(np.int16)

            # Convert to bytes
            pcm_bytes = pcm_samples.tobytes()

            # Encode to Opus
            opus_data = self._opus_encoder.encode(
                pcm_bytes,
                frame_size=len(pcm_samples)
            )

            self._encode_count += 1
            return opus_data

        except opuslib.OpusError as e:
            self._encode_errors += 1
            if self._encode_errors % 50 == 1:
                logger.warning(f"Opus encode error (count={self._encode_errors}): {e}")
            return None
        except Exception as e:
            self._encode_errors += 1
            logger.error(f"Unexpected encode error: {e}")
            return None

    def resample(
        self,
        samples: np.ndarray,
        from_rate: int,
        to_rate: int,
    ) -> np.ndarray:
        """Resample audio to a different sample rate.

        Args:
            samples: Input samples as numpy array
            from_rate: Original sample rate
            to_rate: Target sample rate

        Returns:
            Resampled numpy array

        Uses scipy.signal.resample for high quality when available,
        falls back to linear interpolation otherwise.
        """
        if from_rate == to_rate:
            return samples

        # Calculate new length
        duration = len(samples) / from_rate
        new_length = int(duration * to_rate)

        if new_length == 0:
            return np.array([], dtype=samples.dtype)

        if HAS_SCIPY:
            # High-quality polyphase resampling
            resampled = signal.resample(samples.astype(np.float64), new_length)
        else:
            # Simple linear interpolation fallback
            x_old = np.linspace(0, 1, len(samples))
            x_new = np.linspace(0, 1, new_length)
            resampled = np.interp(x_new, x_old, samples.astype(np.float64))

        # Clip and convert back to original dtype
        if samples.dtype == np.int16:
            resampled = np.clip(resampled, -32768, 32767)
            return resampled.astype(np.int16)

        return resampled.astype(samples.dtype)

    def janus_to_gemini(self, opus_data: bytes) -> Optional[bytes]:
        """Convert Janus audio to Gemini input format.

        Complete pipeline: Opus 48kHz → PCM16 16kHz

        Args:
            opus_data: Opus encoded audio from Janus RTP

        Returns:
            PCM16 bytes at 16kHz suitable for Gemini, or None on error
        """
        # Step 1: Decode Opus to PCM at 48kHz
        pcm_samples = self.decode_opus(opus_data)
        if pcm_samples is None or len(pcm_samples) == 0:
            return None

        # Step 2: Resample from 48kHz to 16kHz
        resampled = self.resample(
            pcm_samples,
            self.janus_sample_rate,
            self.gemini_input_rate,
        )

        # Step 3: Convert to bytes (PCM16, little-endian)
        return resampled.astype(np.int16).tobytes()

    def gemini_to_janus(self, pcm_data: bytes) -> List[bytes]:
        """Convert Gemini output to Janus audio format.

        Complete pipeline: PCM16 24kHz → Opus 48kHz

        Args:
            pcm_data: PCM16 bytes from Gemini at 24kHz

        Returns:
            List of Opus encoded frames (20ms each) for Janus RTP,
            or empty list on error
        """
        if not pcm_data:
            return []

        try:
            # Step 1: Convert bytes to numpy array
            pcm_samples = np.frombuffer(pcm_data, dtype=np.int16)
            if len(pcm_samples) == 0:
                return []

            # Step 2: Resample from 24kHz to 48kHz
            resampled = self.resample(
                pcm_samples,
                self.gemini_output_rate,
                self.janus_sample_rate,
            )

            # Step 3: Split into 20ms frames (960 samples at 48kHz)
            frames: List[bytes] = []

            for i in range(0, len(resampled), self.opus_frame_size):
                frame_samples = resampled[i : i + self.opus_frame_size]

                # Pad last frame if needed
                if len(frame_samples) < self.opus_frame_size:
                    frame_samples = np.pad(
                        frame_samples,
                        (0, self.opus_frame_size - len(frame_samples)),
                        mode='constant'
                    )

                # Encode to Opus
                opus_frame = self.encode_opus(frame_samples.astype(np.int16))
                if opus_frame:
                    frames.append(opus_frame)

            return frames

        except Exception as e:
            logger.error(f"gemini_to_janus conversion error: {e}")
            return []

    def pcm16_to_float32(self, pcm_data: bytes) -> np.ndarray:
        """Convert PCM16 bytes to float32 array (-1.0 to 1.0).

        Useful for audio analysis and visualization.

        Args:
            pcm_data: PCM16 audio bytes

        Returns:
            Float32 numpy array with values in [-1.0, 1.0]
        """
        samples = np.frombuffer(pcm_data, dtype=np.int16)
        return samples.astype(np.float32) / 32768.0

    def float32_to_pcm16(self, float_data: np.ndarray) -> bytes:
        """Convert float32 array to PCM16 bytes.

        Args:
            float_data: Float32 array with values in [-1.0, 1.0]

        Returns:
            PCM16 audio bytes
        """
        samples = (float_data * 32767).clip(-32768, 32767).astype(np.int16)
        return samples.tobytes()

    def get_stats(self) -> dict:
        """Get processing statistics.

        Returns:
            Dictionary with decode/encode counts and error counts
        """
        return {
            "decode_count": self._decode_count,
            "encode_count": self._encode_count,
            "decode_errors": self._decode_errors,
            "encode_errors": self._encode_errors,
            "opus_available": HAS_OPUS,
            "scipy_available": HAS_SCIPY,
            "is_ready": self.is_ready,
        }


class SimpleAudioProcessor:
    """Simplified audio processor when opuslib is not available.

    Handles only PCM format conversion and resampling.
    WARNING: Without Opus, the bridge cannot work with Janus AudioBridge
    in its normal configuration.

    This class is provided for testing and debugging purposes only.
    """

    def __init__(self, config: Optional[AudioConfig] = None):
        """Initialize simple audio processor.

        Args:
            config: Audio configuration
        """
        self.config = config or AudioConfig()
        self.janus_sample_rate = self.config.janus_sample_rate
        self.gemini_input_rate = self.config.gemini_input_rate
        self.gemini_output_rate = self.config.gemini_output_rate
        self.opus_frame_size = self.config.janus_frame_samples

        logger.warning(
            "SimpleAudioProcessor initialized - "
            "Opus not available, audio bridge will not work properly!"
        )

    @property
    def is_ready(self) -> bool:
        """Simple processor is always 'ready' but limited."""
        return True

    def resample(
        self,
        samples: np.ndarray,
        from_rate: int,
        to_rate: int,
    ) -> np.ndarray:
        """Resample audio using linear interpolation."""
        if from_rate == to_rate:
            return samples

        duration = len(samples) / from_rate
        new_length = int(duration * to_rate)

        if new_length == 0:
            return np.array([], dtype=samples.dtype)

        if HAS_SCIPY:
            resampled = signal.resample(samples.astype(np.float64), new_length)
        else:
            x_old = np.linspace(0, 1, len(samples))
            x_new = np.linspace(0, 1, new_length)
            resampled = np.interp(x_new, x_old, samples.astype(np.float64))

        if samples.dtype == np.int16:
            resampled = np.clip(resampled, -32768, 32767)
            return resampled.astype(np.int16)

        return resampled.astype(samples.dtype)

    def janus_to_gemini(self, audio_data: bytes) -> Optional[bytes]:
        """Convert audio treating input as raw PCM (not Opus).

        WARNING: This won't work with real Janus traffic (which is Opus).
        """
        try:
            samples = np.frombuffer(audio_data, dtype=np.int16)
            if len(samples) == 0:
                return None

            resampled = self.resample(
                samples,
                self.janus_sample_rate,
                self.gemini_input_rate,
            )
            return resampled.astype(np.int16).tobytes()
        except Exception as e:
            logger.error(f"SimpleAudioProcessor error: {e}")
            return None

    def gemini_to_janus(self, pcm_data: bytes) -> List[bytes]:
        """Convert Gemini output to raw PCM chunks (not Opus).

        WARNING: This won't work with real Janus traffic.
        """
        try:
            pcm_samples = np.frombuffer(pcm_data, dtype=np.int16)
            if len(pcm_samples) == 0:
                return []

            resampled = self.resample(
                pcm_samples,
                self.gemini_output_rate,
                self.janus_sample_rate,
            )

            # Split into 20ms chunks
            frames = []
            for i in range(0, len(resampled), self.opus_frame_size):
                frame = resampled[i : i + self.opus_frame_size]
                if len(frame) < self.opus_frame_size:
                    frame = np.pad(
                        frame,
                        (0, self.opus_frame_size - len(frame)),
                        mode='constant'
                    )
                frames.append(frame.astype(np.int16).tobytes())

            return frames
        except Exception as e:
            logger.error(f"SimpleAudioProcessor error: {e}")
            return []

    def get_stats(self) -> dict:
        """Get processor statistics."""
        return {
            "decode_count": 0,
            "encode_count": 0,
            "decode_errors": 0,
            "encode_errors": 0,
            "opus_available": False,
            "scipy_available": HAS_SCIPY,
            "is_ready": self.is_ready,
        }


def get_audio_processor(config: Optional[AudioConfig] = None) -> AudioProcessor:
    """Get the appropriate audio processor based on available libraries.

    Args:
        config: Audio configuration

    Returns:
        AudioProcessor if opuslib available, otherwise SimpleAudioProcessor
    """
    if HAS_OPUS:
        return AudioProcessor(config)
    else:
        logger.error(
            "opuslib not available - returning SimpleAudioProcessor. "
            "Install opuslib for production use: pip install opuslib"
        )
        return SimpleAudioProcessor(config)  # type: ignore


async def test_audio_processor() -> None:
    """Test audio processing functionality."""
    import asyncio

    print("Testing AudioProcessor...")
    print(f"  Opus available: {HAS_OPUS}")
    print(f"  SciPy available: {HAS_SCIPY}")

    processor = get_audio_processor()
    print(f"  Processor type: {type(processor).__name__}")
    print(f"  Processor ready: {processor.is_ready}")

    # Test resampling
    print("\nTesting resampling...")
    duration = 0.1  # 100ms
    freq = 440  # Hz
    t = np.linspace(0, duration, int(48000 * duration), False)
    samples_48k = (np.sin(2 * np.pi * freq * t) * 32767).astype(np.int16)

    print(f"  Original: {len(samples_48k)} samples @ 48kHz")

    samples_16k = processor.resample(samples_48k, 48000, 16000)
    print(f"  Resampled: {len(samples_16k)} samples @ 16kHz")

    samples_back = processor.resample(samples_16k, 16000, 48000)
    print(f"  Restored: {len(samples_back)} samples @ 48kHz")

    # Test Opus if available
    if HAS_OPUS and isinstance(processor, AudioProcessor):
        print("\nTesting Opus codec...")

        # Create a 20ms test frame (960 samples @ 48kHz)
        frame = samples_48k[:960]
        print(f"  Original frame: {len(frame)} samples")

        encoded = processor.encode_opus(frame)
        if encoded:
            print(f"  Encoded: {len(encoded)} bytes")

            decoded = processor.decode_opus(encoded)
            if decoded is not None:
                print(f"  Decoded: {len(decoded)} samples")

    print("\nStats:", processor.get_stats())
    print("\nAudio processor test complete!")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_audio_processor())
