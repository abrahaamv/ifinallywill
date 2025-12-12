"""
Unit tests for Frame Processor (perceptual hashing and deduplication)
"""

import pytest
import time
from unittest.mock import Mock
import numpy as np
from PIL import Image

from frame_processor import FrameProcessor


class TestPerceptualHashing:
    """Test perceptual hash computation"""

    def test_identical_images_same_hash(self):
        """Identical images should produce identical hashes"""
        processor = FrameProcessor(threshold=10)

        # Create two identical images
        data = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        img1 = Image.fromarray(data)
        img2 = Image.fromarray(data)

        # Create mock frames
        frame1 = Mock()
        frame1.width = 640
        frame1.height = 480
        frame1.data = data.tobytes()

        frame2 = Mock()
        frame2.width = 640
        frame2.height = 480
        frame2.data = data.tobytes()

        # Compute hashes
        hash1 = processor._compute_perceptual_hash(frame1)
        hash2 = processor._compute_perceptual_hash(frame2)

        # Hashes should be identical
        assert hash1 == hash2

    def test_similar_images_low_distance(self):
        """Similar images should have low Hamming distance"""
        processor = FrameProcessor(threshold=10)

        # Create two similar images (slight variation)
        data1 = np.random.randint(100, 150, (480, 640, 3), dtype=np.uint8)
        data2 = data1 + np.random.randint(-5, 5, (480, 640, 3), dtype=np.int16)
        data2 = np.clip(data2, 0, 255).astype(np.uint8)

        frame1 = Mock()
        frame1.width = 640
        frame1.height = 480
        frame1.data = data1.tobytes()

        frame2 = Mock()
        frame2.width = 640
        frame2.height = 480
        frame2.data = data2.tobytes()

        hash1 = processor._compute_perceptual_hash(frame1)
        hash2 = processor._compute_perceptual_hash(frame2)

        distance = hash1 - hash2

        # Similar images should have distance < threshold
        assert distance < 10

    def test_different_images_high_distance(self):
        """Different images should have high Hamming distance"""
        processor = FrameProcessor(threshold=10)

        # Create two completely different images
        data1 = np.zeros((480, 640, 3), dtype=np.uint8)  # Black
        data2 = np.ones((480, 640, 3), dtype=np.uint8) * 255  # White

        frame1 = Mock()
        frame1.width = 640
        frame1.height = 480
        frame1.data = data1.tobytes()

        frame2 = Mock()
        frame2.width = 640
        frame2.height = 480
        frame2.data = data2.tobytes()

        hash1 = processor._compute_perceptual_hash(frame1)
        hash2 = processor._compute_perceptual_hash(frame2)

        distance = hash1 - hash2

        # Different images should have distance > threshold
        assert distance > 10


class TestFPSThrottling:
    """Test adaptive FPS throttling"""

    def test_active_fps_speaking(self):
        """Should use active FPS when speaking"""
        processor = FrameProcessor(
            threshold=10,
            active_fps=30.0,
            idle_fps=5.0
        )

        # Create test frame
        data = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        frame = Mock()
        frame.width = 640
        frame.height = 480
        frame.data = data.tobytes()

        # First frame should always be processed
        assert processor.should_process_frame(frame, is_speaking=True)

        # Wait for less than active FPS interval
        time.sleep(0.01)  # 10ms < 33ms (30 FPS)

        # Should be throttled
        assert not processor.should_process_frame(frame, is_speaking=True)

        # Wait for active FPS interval
        time.sleep(0.04)  # Total 50ms > 33ms

        # Should be allowed
        assert processor.should_process_frame(frame, is_speaking=True)

    def test_idle_fps_not_speaking(self):
        """Should use idle FPS when not speaking"""
        processor = FrameProcessor(
            threshold=10,
            active_fps=30.0,
            idle_fps=5.0
        )

        # Create test frame
        data = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        frame = Mock()
        frame.width = 640
        frame.height = 480
        frame.data = data.tobytes()

        # First frame
        assert processor.should_process_frame(frame, is_speaking=False)

        # Wait for less than idle FPS interval
        time.sleep(0.1)  # 100ms < 200ms (5 FPS)

        # Should be throttled
        assert not processor.should_process_frame(frame, is_speaking=False)

        # Wait for idle FPS interval
        time.sleep(0.15)  # Total 250ms > 200ms

        # Should be allowed
        assert processor.should_process_frame(frame, is_speaking=False)


class TestFrameDeduplication:
    """Test frame deduplication logic"""

    def test_duplicate_frames_skipped(self):
        """Duplicate frames should be skipped"""
        processor = FrameProcessor(threshold=10)

        # Create identical frames
        data = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)

        frame1 = Mock()
        frame1.width = 640
        frame1.height = 480
        frame1.data = data.tobytes()

        frame2 = Mock()
        frame2.width = 640
        frame2.height = 480
        frame2.data = data.tobytes()

        # First frame should be processed
        assert processor.should_process_frame(frame1, is_speaking=True)

        # Wait for FPS interval
        time.sleep(0.05)

        # Duplicate frame should be skipped (even after FPS interval)
        assert not processor.should_process_frame(frame2, is_speaking=True)

    def test_different_frames_processed(self):
        """Different frames should be processed"""
        processor = FrameProcessor(threshold=10)

        # Create different frames
        data1 = np.zeros((480, 640, 3), dtype=np.uint8)
        data2 = np.ones((480, 640, 3), dtype=np.uint8) * 255

        frame1 = Mock()
        frame1.width = 640
        frame1.height = 480
        frame1.data = data1.tobytes()

        frame2 = Mock()
        frame2.width = 640
        frame2.height = 480
        frame2.data = data2.tobytes()

        # First frame
        assert processor.should_process_frame(frame1, is_speaking=True)

        # Wait for FPS interval
        time.sleep(0.05)

        # Different frame should be processed
        assert processor.should_process_frame(frame2, is_speaking=True)


class TestMetrics:
    """Test metrics tracking"""

    def test_metrics_tracking(self):
        """Should track processed/skipped frames"""
        processor = FrameProcessor(threshold=10)

        # Create frames
        data1 = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        data2 = data1.copy()  # Duplicate
        data3 = np.ones((480, 640, 3), dtype=np.uint8) * 255  # Different

        frames = []
        for data in [data1, data2, data3]:
            frame = Mock()
            frame.width = 640
            frame.height = 480
            frame.data = data.tobytes()
            frames.append(frame)

        # Process frames
        results = []
        for frame in frames:
            results.append(processor.should_process_frame(frame, is_speaking=True))
            time.sleep(0.05)  # Wait for FPS interval

        # Get metrics
        metrics = processor.get_metrics()

        assert metrics["total_frames"] == 3
        assert metrics["processed_frames"] == 2  # frame1 and frame3
        assert metrics["skipped_frames"] == 1    # frame2 (duplicate)
        assert metrics["deduplication_rate"] > 0


class TestCostReduction:
    """Test cost reduction from frame deduplication"""

    def test_60_75_percent_reduction(self):
        """Should achieve 60-75% frame reduction"""
        processor = FrameProcessor(threshold=10)

        # Simulate 100 frames with 70% similarity
        processed_count = 0
        skipped_count = 0

        for i in range(100):
            # Every 3rd frame is different, others are similar
            if i % 3 == 0:
                data = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
            else:
                # Similar frame (small variation)
                data = data + np.random.randint(-2, 2, (480, 640, 3), dtype=np.int16)
                data = np.clip(data, 0, 255).astype(np.uint8)

            frame = Mock()
            frame.width = 640
            frame.height = 480
            frame.data = data.tobytes()

            if processor.should_process_frame(frame, is_speaking=True):
                processed_count += 1
            else:
                skipped_count += 1

            time.sleep(0.001)  # Minimal delay

        metrics = processor.get_metrics()
        reduction_rate = metrics["deduplication_rate"]

        # Should achieve 60-75% reduction
        assert 60 <= reduction_rate <= 75
        assert skipped_count > processed_count
