const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'replicateimagegtd';

// Store to track known images
let knownImages = new Set();
let allImages = [];
let isDevelopmentMode = false;

// Test images for development mode
const testImages = [
  {
    key: 'test-images/sample1.jpg',
    lastModified: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    size: 1024 * 500, // 500KB
    url: '/api/watermarked/test-images/sample1.jpg'
  },
  {
    key: 'test-images/sample2.jpg', 
    lastModified: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    size: 1024 * 750, // 750KB
    url: '/api/watermarked/test-images/sample2.jpg'
  },
  {
    key: 'test-images/sample3.jpg',
    lastModified: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    size: 1024 * 300, // 300KB
    url: '/api/watermarked/test-images/sample3.jpg'
  }
];

// Initialize by loading existing images
async function initializeImages() {
  try {
    const data = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: '',
    }).promise();

    allImages = data.Contents
      .filter(obj => obj.Key.toLowerCase().endsWith('.jpg') || obj.Key.toLowerCase().endsWith('.jpeg'))
      .map(obj => ({
        key: obj.Key,
        lastModified: obj.LastModified,
        size: obj.Size,
        url: `/api/watermarked/${encodeURIComponent(obj.Key)}`
      }))
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    // Mark all current images as known
    allImages.forEach(img => knownImages.add(img.key));
    
    console.log(`Initialized with ${allImages.length} existing images from S3`);
    isDevelopmentMode = false;
  } catch (error) {
    console.error('Error connecting to S3:', error.message);
    console.log('🔧 Switching to DEVELOPMENT MODE with test images');
    
    // Use test images for development
    allImages = [...testImages];
    allImages.forEach(img => knownImages.add(img.key));
    isDevelopmentMode = true;
    
    console.log(`✅ Development mode active with ${allImages.length} test images`);
  }
}

// API Routes

// Get all images
app.get('/api/images', (req, res) => {
  res.json(allImages);
});

// Check for new images
app.get('/api/check-new-images', async (req, res) => {
  try {
    if (isDevelopmentMode) {
      // In development mode, occasionally simulate new images
      const shouldAddNew = Math.random() > 0.8; // 20% chance of "new" image
      let newImages = [];
      
      if (shouldAddNew) {
        const newTestImage = {
          key: `test-images/sample-new-${Date.now()}.jpg`,
          lastModified: new Date(),
          size: 1024 * (200 + Math.floor(Math.random() * 500)), // Random size 200-700KB
          url: `/api/watermarked/test-images/sample${Math.floor(Math.random() * 3) + 1}.jpg` // Use existing test images
        };
        
        if (!knownImages.has(newTestImage.key)) {
          knownImages.add(newTestImage.key);
          allImages.unshift(newTestImage);
          newImages = [newTestImage];
        }
      }
      
      return res.json({
        newImages,
        totalImages: allImages.length,
        newCount: newImages.length
      });
    }

    // Production S3 mode
    const data = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: '',
    }).promise();

    const currentImages = data.Contents
      .filter(obj => obj.Key.toLowerCase().endsWith('.jpg') || obj.Key.toLowerCase().endsWith('.jpeg'))
      .map(obj => ({
        key: obj.Key,
        lastModified: obj.LastModified,
        size: obj.Size,
        url: `/api/watermarked/${encodeURIComponent(obj.Key)}`
      }));

    // Find new images
    const newImages = currentImages.filter(img => !knownImages.has(img.key));
    
    // Update our tracking
    newImages.forEach(img => {
      knownImages.add(img.key);
      allImages.unshift(img); // Add to beginning of array
    });

    // Sort all images by last modified (newest first)
    allImages.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    res.json({
      newImages,
      totalImages: allImages.length,
      newCount: newImages.length
    });
  } catch (error) {
    console.error('Error checking for new images:', error);
    res.status(500).json({ error: 'Failed to check for new images' });
  }
});

// Download image
app.get('/api/download/:imageKey', async (req, res) => {
  try {
    const imageKey = decodeURIComponent(req.params.imageKey);
    
    // Handle development mode
    if (isDevelopmentMode && imageKey.startsWith('test-images/')) {
      const imageName = path.basename(imageKey);
      return res.redirect(`/test-images/${imageName}`);
    }
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: imageKey
    };

    const data = await s3.getObject(params).promise();
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(imageKey)}"`);
    res.send(data.Body);
  } catch (error) {
    console.error('Error downloading image:', error);
    res.status(500).json({ error: 'Failed to download image' });
  }
});

// Serve watermarked images automatically
app.get('/api/watermarked/:imageKey', async (req, res) => {
  try {
    const imageKey = decodeURIComponent(req.params.imageKey);
    
    // Handle development mode
    if (isDevelopmentMode && imageKey.startsWith('test-images/')) {
      const imageName = path.basename(imageKey);
      // Load the test image and apply watermark
      const testImageUrl = `http://localhost:${PORT}/test-images/${imageName}`;
      const watermarkedBuffer = await createWatermarkedImage(testImageUrl);
      
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(watermarkedBuffer);
      return;
    }
    
    // Production S3 mode
    const params = {
      Bucket: BUCKET_NAME,
      Key: imageKey
    };

    const data = await s3.getObject(params).promise();
    const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${imageKey}`;
    
    const watermarkedBuffer = await createWatermarkedImage(imageUrl);
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(watermarkedBuffer);
  } catch (error) {
    console.error('Error creating watermarked image:', error);
    res.status(500).json({ error: 'Failed to create watermarked image' });
  }
});

// Function to create watermarked images server-side
async function createWatermarkedImage(imageUrl) {
  try {
    // Load the main image
    const mainImage = await loadImage(imageUrl);
    
    // Load the overlay
    const overlayPath = path.join(__dirname, 'public', 'overlay.png');
    const overlay = await loadImage(overlayPath);
    
    // Create canvas with original image dimensions
    const canvas = createCanvas(mainImage.width, mainImage.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the main image
    ctx.drawImage(mainImage, 0, 0);
    
    // Calculate overlay size (full width at bottom)
    const overlayWidth = mainImage.width; // Full width
    const overlayHeight = (overlay.height * overlayWidth) / overlay.width;
    
    // Position at bottom with no padding - full width
    const x = 0;
    const y = mainImage.height - overlayHeight;
    
    // Draw the overlay
    ctx.globalAlpha = 0.9;
    ctx.drawImage(overlay, x, y, overlayWidth, overlayHeight);
    ctx.globalAlpha = 1.0;
    
    // Return the watermarked image as JPEG buffer
    return canvas.toBuffer('image/jpeg', { quality: 0.95 });
  } catch (error) {
    console.error('Error in createWatermarkedImage:', error);
    throw error;
  }
}

// Generate test images for development
app.get('/test-images/:imageName', (req, res) => {
  const imageName = req.params.imageName;
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
  const imageNumber = parseInt(imageName.replace(/\D/g, '')) || 1;
  const color = colors[(imageNumber - 1) % colors.length];
  const secondaryColor = colors[imageNumber % colors.length];
  
  // Create an HTML canvas-style response that will render as an image
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { margin: 0; padding: 0; }
      canvas { display: block; }
    </style>
  </head>
  <body>
    <canvas id="canvas" width="880" height="1184"></canvas>
    <script>
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, 880, 1184);
      gradient.addColorStop(0, '${color}');
      gradient.addColorStop(1, '${secondaryColor}');
      
      // Fill background
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 880, 1184);
      
      // Add geometric shapes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(220, 200, 100, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(660, 950, 150, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.roundRect(290, 400, 300, 300, 30);
      ctx.fill();
      
      // Add text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 42px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TEST IMAGE ${imageNumber}', 440, 580);
      
      ctx.font = '24px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText('${imageName}', 440, 630);
      
      ctx.font = '18px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText('880 × 1184 pixels', 440, 680);
      
      // Convert to image data and redirect
      canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        window.location.href = url;
      }, 'image/png');
    </script>
  </body>
  </html>
  `;
  
  // For now, return SVG but with proper MIME type to work with Canvas
  const svg = `
    <svg width="880" height="1184" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${secondaryColor};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad1)"/>
      <circle cx="220" cy="200" r="100" fill="rgba(255,255,255,0.3)"/>
      <circle cx="660" cy="950" r="150" fill="rgba(255,255,255,0.2)"/>
      <rect x="290" y="400" width="300" height="300" fill="rgba(255,255,255,0.1)" rx="30"/>
      <text x="440" y="580" font-family="Arial, sans-serif" font-size="42" fill="white" text-anchor="middle" font-weight="bold">
        TEST IMAGE ${imageNumber}
      </text>
      <text x="440" y="630" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        ${imageName}
      </text>
      <text x="440" y="680" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.6)" text-anchor="middle">
        880 × 1184 pixels
      </text>
    </svg>
  `;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(svg);
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Initialize and start server
initializeImages().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Monitoring S3 bucket: ${BUCKET_NAME}`);
  });
}); 