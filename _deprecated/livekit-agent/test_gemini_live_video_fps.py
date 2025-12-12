"""
Test Gemini Live API Video Frame Rate Capabilities

This script empirically tests what FPS Gemini Live API can handle for video streaming.
We'll send frames at different rates and measure actual processing latency.

Purpose: Determine if migrating from current implementation to Gemini Live API
         would improve real-time vision performance for gaming/chess assistance.

Test Plan:
1. Connect to Gemini Live API
2. Send video frames at: 1 FPS, 2 FPS, 5 FPS, 10 FPS
3. Measure: acceptance rate, processing latency, response quality
4. Compare with current implementation baseline
"""

import asyncio
import io
import os
import time
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

# Load environment variables
load_dotenv()

# Gemini API configuration
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in .env file")

# Test configuration
TEST_DURATIONS = {
    "1fps": (1.0, "Baseline - Documented limit"),
    "2fps": (0.5, "2x documented limit"),
    "5fps": (0.2, "5x documented limit - gaming?"),
    "10fps": (0.1, "10x documented limit - smooth video"),
}

# Model to test - using the native audio model that supports video
MODEL = "gemini-2.0-flash-exp"


def create_test_frame(width: int = 768, height: int = 768, frame_num: int = 0) -> bytes:
    """
    Create a test video frame with visible frame number.

    Args:
        width: Frame width (768x768 recommended by docs)
        height: Frame height
        frame_num: Frame number to display

    Returns:
        JPEG encoded frame bytes in PCM format expected by API
    """
    # Create image with frame number
    img = Image.new('RGB', (width, height), color=(50, 50, 50))

    # Add frame number text (simple visualization)
    # In real test, this would be actual screen captures
    from PIL import ImageDraw, ImageFont
    draw = ImageDraw.Draw(img)

    # Draw frame number
    text = f"Frame {frame_num}"
    # Use default font
    draw.text((width//2 - 50, height//2), text, fill=(255, 255, 255))

    # Convert to bytes (JPEG)
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=85)
    buffer.seek(0)
    return buffer.read()


async def test_fps_rate(
    client: genai.Client,
    fps_label: str,
    interval: float,
    description: str,
    duration_seconds: int = 10
):
    """
    Test sending video frames at a specific FPS rate.

    Args:
        client: Gemini API client
        fps_label: Label for this test (e.g., "2fps")
        interval: Seconds between frames
        description: Human-readable description
        duration_seconds: How long to run the test
    """
    print(f"\n{'='*60}")
    print(f"TEST: {fps_label.upper()} - {description}")
    print(f"Interval: {interval}s between frames")
    print(f"Duration: {duration_seconds}s")
    print(f"{'='*60}\n")

    config = {
        "response_modalities": ["TEXT"],  # Use TEXT to see responses clearly
        "system_instruction": (
            "You are analyzing a video stream. "
            "Each frame has a frame number displayed. "
            "When you receive a new frame, respond with ONLY: 'Frame N received' "
            "where N is the frame number you see. Be very brief."
        ),
    }

    frame_count = 0
    responses_received = 0
    total_latency = 0
    latencies = []
    errors = []

    try:
        async with client.aio.live.connect(model=MODEL, config=config) as session:
            print("✅ Connected to Gemini Live API\n")

            # Start time
            test_start = time.time()
            last_frame_time = test_start

            # Send frames at the specified interval
            while (time.time() - test_start) < duration_seconds:
                # Create and send frame
                frame_send_time = time.time()
                frame_bytes = create_test_frame(frame_num=frame_count)

                try:
                    await session.send(
                        input=types.LiveClientRealtimeInput(
                            media_chunks=[
                                types.Blob(
                                    data=frame_bytes,
                                    mime_type="image/jpeg"
                                )
                            ]
                        )
                    )

                    frame_count += 1
                    print(f"📤 Sent frame {frame_count} at {time.time() - test_start:.2f}s")

                    # Try to receive response (non-blocking with timeout)
                    try:
                        response = await asyncio.wait_for(
                            session.receive().__anext__(),
                            timeout=0.5
                        )

                        if response.text:
                            response_time = time.time()
                            latency = response_time - frame_send_time
                            latencies.append(latency)
                            total_latency += latency
                            responses_received += 1

                            print(f"  ✅ Response: {response.text[:50]} (latency: {latency:.3f}s)")

                    except asyncio.TimeoutError:
                        # No response yet, that's okay
                        pass

                except Exception as e:
                    error_msg = f"Error sending frame {frame_count}: {e}"
                    errors.append(error_msg)
                    print(f"  ❌ {error_msg}")

                # Wait for next frame interval
                elapsed = time.time() - last_frame_time
                sleep_time = max(0, interval - elapsed)
                await asyncio.sleep(sleep_time)
                last_frame_time = time.time()

            # Collect any remaining responses
            print("\n📥 Collecting remaining responses...")
            try:
                async for response in asyncio.timeout(2):
                    if response.text:
                        responses_received += 1
                        print(f"  ✅ Late response: {response.text[:50]}")
            except asyncio.TimeoutError:
                pass

    except Exception as e:
        print(f"\n❌ Connection error: {e}")
        errors.append(f"Connection error: {e}")

    # Print results
    print(f"\n{'='*60}")
    print(f"RESULTS: {fps_label.upper()}")
    print(f"{'='*60}")
    print(f"Frames sent:        {frame_count}")
    print(f"Responses received: {responses_received}")
    print(f"Success rate:       {responses_received/frame_count*100 if frame_count > 0 else 0:.1f}%")

    if latencies:
        print(f"\nLatency Statistics:")
        print(f"  Average: {sum(latencies)/len(latencies):.3f}s")
        print(f"  Min:     {min(latencies):.3f}s")
        print(f"  Max:     {max(latencies):.3f}s")
        print(f"  Median:  {sorted(latencies)[len(latencies)//2]:.3f}s")

    if errors:
        print(f"\n⚠️  Errors encountered: {len(errors)}")
        for error in errors[:3]:  # Show first 3 errors
            print(f"  - {error}")

    print(f"{'='*60}\n")

    return {
        "fps_label": fps_label,
        "frames_sent": frame_count,
        "responses_received": responses_received,
        "success_rate": responses_received/frame_count if frame_count > 0 else 0,
        "avg_latency": sum(latencies)/len(latencies) if latencies else None,
        "min_latency": min(latencies) if latencies else None,
        "max_latency": max(latencies) if latencies else None,
        "errors": len(errors),
    }


async def main():
    """Run all FPS tests"""
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║  Gemini Live API Video FPS Testing                           ║
║  Testing real-world frame rate capabilities                  ║
╚══════════════════════════════════════════════════════════════╝

Model: {MODEL}
API Key: {'✅ Set' if GOOGLE_API_KEY else '❌ Missing'}

Tests to run:
""")

    for label, (interval, desc) in TEST_DURATIONS.items():
        fps = 1.0 / interval
        print(f"  • {label}: {fps:.1f} FPS - {desc}")

    print("\nStarting tests in 3 seconds...")
    await asyncio.sleep(3)

    # Initialize client
    client = genai.Client(api_key=GOOGLE_API_KEY)

    # Run tests
    results = []
    for fps_label, (interval, description) in TEST_DURATIONS.items():
        result = await test_fps_rate(
            client=client,
            fps_label=fps_label,
            interval=interval,
            description=description,
            duration_seconds=10  # 10 second test for each FPS
        )
        results.append(result)

        # Pause between tests
        print("\n⏸️  Pausing 5 seconds before next test...\n")
        await asyncio.sleep(5)

    # Final summary
    print(f"\n{'='*60}")
    print("FINAL SUMMARY")
    print(f"{'='*60}\n")

    print(f"{'FPS':<10} {'Frames':<10} {'Responses':<12} {'Success':<10} {'Avg Latency'}")
    print(f"{'-'*60}")

    for r in results:
        avg_lat = f"{r['avg_latency']:.3f}s" if r['avg_latency'] else "N/A"
        print(
            f"{r['fps_label']:<10} "
            f"{r['frames_sent']:<10} "
            f"{r['responses_received']:<12} "
            f"{r['success_rate']*100:>6.1f}%   "
            f"{avg_lat}"
        )

    print(f"\n{'='*60}")
    print("\n✅ All tests complete!\n")

    # Recommendation
    print("RECOMMENDATION:")
    best_result = max(results, key=lambda x: (x['success_rate'], -x['avg_latency'] if x['avg_latency'] else float('inf')))
    print(f"  Best performing: {best_result['fps_label'].upper()}")
    print(f"  Success rate: {best_result['success_rate']*100:.1f}%")
    if best_result['avg_latency']:
        print(f"  Avg latency: {best_result['avg_latency']:.3f}s")

    # Compare with current implementation
    print(f"\n  Current implementation: 1 FPS with ~2-5s latency")
    print(f"  Gemini Live API potential improvement: ", end="")

    if best_result['avg_latency'] and best_result['avg_latency'] < 2.0:
        print(f"✅ YES - {2.0/best_result['avg_latency']:.1f}x faster!")
    else:
        print("⚠️  MARGINAL - Consider audio-only migration instead")


if __name__ == "__main__":
    asyncio.run(main())
