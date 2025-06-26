# Mielle S3 Image Monitor

A real-time web application that monitors your S3 bucket for new JPG images and displays them in a beautiful, responsive grid layout with download functionality.

## Features

- 🔄 **Auto-monitoring**: Checks for new images every 5 seconds
- 🖼️ **Image Grid**: Clean, responsive grid layout for image display
- 📥 **Download Support**: Click any image to download it directly
- 🆕 **New Image Indicators**: Visual highlighting of newly uploaded images
- 📱 **Mobile Responsive**: Works perfectly on all device sizes
- ⏸️ **Pause/Resume**: Control auto-checking with one click
- 🔍 **Image Preview**: Click images for a larger modal view
- 📊 **Real-time Stats**: Live count of total and new images

## Prerequisites

- Node.js (v14 or higher)
- AWS Account with S3 access
- AWS IAM credentials with S3 read permissions

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AWS Credentials

Edit the `.env` file with your AWS credentials:

```bash
AWS_ACCESS_KEY_ID=your_actual_access_key
AWS_SECRET_ACCESS_KEY=your_actual_secret_key
AWS_REGION=your_bucket_region
S3_BUCKET_NAME=replicateimagegtd
PORT=3000
```

### 3. AWS Permissions

Ensure your AWS IAM user has the following S3 permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::replicateimagegtd",
                "arn:aws:s3:::replicateimagegtd/*"
            ]
        }
    ]
}
```

### 4. Start the Server

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

### 5. Access the Application

Open your browser and navigate to: `http://localhost:3000`

## How It Works

1. **Backend Server**: Express.js server handles S3 API calls and serves the frontend
2. **S3 Integration**: Uses AWS SDK to list and download objects from your bucket
3. **Real-time Polling**: Frontend polls the backend every 5 seconds for new images
4. **Image Tracking**: Server tracks known vs. new images to highlight updates
5. **Download Proxy**: Server acts as a proxy for secure image downloads

## API Endpoints

- `GET /` - Serves the main application
- `GET /api/images` - Returns all images in the bucket
- `GET /api/check-new-images` - Checks for and returns new images
- `GET /api/download/:imageKey` - Downloads a specific image

## File Structure

```
├── server.js              # Main Express server
├── package.json           # Node.js dependencies
├── .env                   # Environment configuration
├── public/
│   ├── index.html         # Main HTML page
│   ├── styles.css         # Responsive CSS styles
│   └── script.js          # Frontend JavaScript
└── README.md              # This file
```

## Configuration Options

You can modify these settings in `server.js`:

- **Polling Interval**: Change `POLL_INTERVAL` in `script.js` (default: 5000ms)
- **Supported Formats**: Currently supports `.jpg` and `.jpeg` files
- **Port**: Set via `PORT` environment variable (default: 3000)

## Troubleshooting

### Common Issues

1. **403 Forbidden Error**: Check your AWS credentials and S3 permissions
2. **Images Not Loading**: Verify your bucket name and region settings
3. **CORS Issues**: Ensure your S3 bucket allows cross-origin requests if accessing directly

### Debug Mode

To see detailed logs, check the browser console and server terminal output.

## Security Considerations

- Never commit your `.env` file with real credentials
- Use IAM roles with minimal required permissions
- Consider implementing rate limiting for production use
- For public deployment, add authentication as needed

## Browser Support

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## License

MIT License - feel free to modify and use for your projects! 