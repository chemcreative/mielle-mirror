const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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
        url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${obj.Key}`
      }))
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    // Mark all current images as known
    allImages.forEach(img => knownImages.add(img.key));
    
    console.log(`Initialized with ${allImages.length} existing images`);
  } catch (error) {
    console.error('Error initializing images:', error);
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
        url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${obj.Key}`
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

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize and start server
initializeImages().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Monitoring S3 bucket: ${BUCKET_NAME}`);
  });
}); 