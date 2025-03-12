const WebSocket = require('ws');
const { spawn } = require('child_process');

// Create a WebSocket server on port 8001
const wsServer = new WebSocket.Server({ port: 8001 }, () => {
  console.log('✅ WebSocket server started on port 8001');
});

wsServer.on('connection', (socket) => {
  console.log('🔗 WebSocket client connected.');

  // Spawn the FFmpeg process
  const ffmpeg = spawn('ffmpeg', [
    '-protocol_whitelist', 'file,udp,rtp,crypto',
    '-i', 'webcam.sdp',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-b:v', '2500k',
    '-maxrate', '2500k',
    '-bufsize', '5000k',
    '-g', '50',
    '-an',
    '-f', 'flv',
    '-flvflags', 'no_duration_filesize', // Ignore FLV duration requirements
    'rtmp://13.201.146.30/fog/1234'
  ]);

  // Handle incoming messages from WebSocket and write to FFmpeg's stdin
  socket.on('message', (data) => {
    if (ffmpeg.stdin.writable) {
      ffmpeg.stdin.write(data, (err) => {
        if (err) {
          console.error('❌ Error writing to FFmpeg stdin:', err);
        }
      });
    } else {
      console.warn('⚠️ FFmpeg stdin is not writable.');
    }
  });

  // Handle WebSocket errors
  socket.on('error', (err) => {
    console.error('❌ WebSocket error:', err);
    cleanup();
  });

  // Handle WebSocket closure
  socket.on('close', () => {
    console.log('🔌 WebSocket client disconnected.');
    cleanup();
  });

  // Capture FFmpeg stderr output
  ffmpeg.stderr.on('data', (chunk) => {
    console.error(`🎥 FFmpeg error: ${chunk.toString()}`);
  });

  // Handle FFmpeg process exit
  ffmpeg.on('exit', (code, signal) => {
    console.log(`⚠️ FFmpeg exited with code ${code} and signal ${signal}`);
    cleanup();
  });

  // Handle FFmpeg process errors
  ffmpeg.on('error', (err) => {
    console.error('❌ FFmpeg process error:', err);
    cleanup();
  });

  // Cleanup function to terminate FFmpeg process
  function cleanup() {
    if (!ffmpeg.killed) {
      ffmpeg.stdin.end();
      ffmpeg.kill('SIGTERM');
    }
  }
});

console.log('🚀 WebSocket server listening on ws://localhost:8001');