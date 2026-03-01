/**
 * Video Thumbnail Generator
 *
 * This script uses FFmpeg to generate thumbnails for all video files.
 *
 * Requirements:
 * - Node.js
 * - FFmpeg installed and available in PATH
 *
 * Usage:
 * node generate_thumbnails.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const VIDEO_DIR = path.join(__dirname, '');
const THUMBNAIL_DIR = path.join(__dirname, '..', 'thumbnails');
const FRAME_TIME = 0; // Take frame at 2 seconds into the video

// Ensure thumbnail directory exists
try {
  if (!fs.existsSync(THUMBNAIL_DIR)) {
    fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
    console.log(`Created thumbnail directory: ${THUMBNAIL_DIR}`);
  }
} catch (err) {
  console.error(`Error creating thumbnail directory: ${err.message}`);
  process.exit(1);
}

// Check if FFmpeg is installed
try {
  const ffmpegVersion = execSync('ffmpeg -version').toString().split('\n')[0];
  console.log(`Using ${ffmpegVersion}`);
} catch (err) {
  console.error('FFmpeg is not installed or not in PATH');
  console.error('Please install FFmpeg first:');
  console.error('  Ubuntu/Debian: sudo apt install ffmpeg');
  console.error('  macOS: brew install ffmpeg');
  process.exit(1);
}

// Get all MP4 files
let videoFiles = [];
try {
  const files = fs.readdirSync(VIDEO_DIR);
  videoFiles = files.filter((file) => file.toLowerCase().endsWith('.mp4'));
  console.log(`Found ${videoFiles.length} MP4 files in ${VIDEO_DIR}`);
} catch (err) {
  console.error(`Error reading video directory: ${err.message}`);
  process.exit(1);
}

// Process each video
let successCount = 0;
let errorCount = 0;

for (const videoFile of videoFiles) {
  const videoPath = path.join(VIDEO_DIR, videoFile);
  const baseName = path.basename(videoFile, '.mp4');
  const thumbnailPath = path.join(THUMBNAIL_DIR, `${baseName}.jpg`);

  console.log(`\nProcessing: ${baseName}`);

  try {
    // Get video duration
    const durationOutput = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    )
      .toString()
      .trim();
    const duration = Number.parseFloat(durationOutput);

    console.log(`Video duration: ${duration} seconds`);

    // Use 2 seconds or 10% of the video, whichever is smaller
    const captureTime = Math.min(FRAME_TIME, duration * 0.1);

    // Generate thumbnail
    const ffmpegCommand = `ffmpeg -y -i "${videoPath}" -ss ${captureTime} -frames:v 1 -q:v 2 -vf "scale=1280:-1" "${thumbnailPath}"`;
    console.log(`Executing: ${ffmpegCommand}`);

    execSync(ffmpegCommand);

    // Verify thumbnail was created
    if (fs.existsSync(thumbnailPath)) {
      const stats = fs.statSync(thumbnailPath);
      console.log(
        `✅ Successfully created thumbnail: ${thumbnailPath} (${(stats.size / 1024).toFixed(1)} KB)`
      );
      successCount++;
    } else {
      console.error(
        `❌ Failed to create thumbnail: ${thumbnailPath} (file doesn't exist after command)`
      );
      errorCount++;
    }
  } catch (err) {
    console.error(`❌ Error processing ${videoFile}: ${err.message}`);
    errorCount++;
  }
}

// Summary
console.log('\n=== SUMMARY ===');
console.log(`Total videos processed: ${videoFiles.length}`);
console.log(`Successful thumbnails: ${successCount}`);
console.log(`Failed thumbnails: ${errorCount}`);

if (successCount > 0) {
  console.log('\nNext steps:');
  console.log('1. Check the thumbnails in the thumbnails directory');
  console.log('2. Update the VideoRegistry.js with the correct thumbnail paths');
  console.log('3. Use the thumbnails in your EnhancedVideoPlayer component');
} else if (errorCount > 0) {
  console.log('\nTroubleshooting:');
  console.log('1. Make sure FFmpeg is properly installed');
  console.log('2. Check if the video files are valid and can be read');
  console.log('3. Verify that you have write permission to the thumbnails directory');
}
