# 🚀 Heroku Deployment Guide

Your S3 Image Monitor is ready for deployment! Here are two ways to deploy to Heroku:

## 🎯 Your App is Heroku-Ready!

✅ **Procfile** created - tells Heroku how to start your app  
✅ **Node.js version** specified in package.json  
✅ **Git repository** initialized with all files  
✅ **Port configuration** works with Heroku's dynamic ports  

## 📋 Pre-Deployment Checklist

- [ ] Heroku account created
- [ ] AWS credentials ready
- [ ] S3 bucket: `replicateimagetd` accessible

---

## 🌐 Option 1: Deploy via Heroku Web Interface (Easiest)

### Step 1: Create New App
1. Go to [dashboard.heroku.com](https://dashboard.heroku.com)
2. Click **"New"** → **"Create new app"**
3. Choose a unique app name (e.g., `mielle-s3-monitor`)
4. Select region (US is fine)
5. Click **"Create app"**

### Step 2: Connect to GitHub
1. In your new app dashboard, go to **"Deploy"** tab
2. Choose **"GitHub"** as deployment method
3. Connect your GitHub account
4. Create a new repository on GitHub:
   - Go to github.com → Create new repository
   - Name it `mielle-s3-monitor`
   - Make it public or private
   - Don't initialize with README (we already have files)

### Step 3: Push Code to GitHub
Run these commands in your terminal:

```bash
# Add GitHub repository as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/mielle-s3-monitor.git

# Push code to GitHub
git branch -M main
git push -u origin main
```

### Step 4: Deploy on Heroku
1. Back in Heroku, search for your repository
2. Click **"Connect"**
3. Enable **"Automatic deploys"** (optional)
4. Click **"Deploy Branch"**

### Step 5: Set Environment Variables
1. Go to **"Settings"** tab in Heroku
2. Click **"Reveal Config Vars"**
3. Add these variables:

| Key | Value |
|-----|-------|
| `AWS_ACCESS_KEY_ID` | `AKIAWU4C642GLMTAEMEM` |
| `AWS_SECRET_ACCESS_KEY` | `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` |
| `AWS_REGION` | `us-east-2` |
| `S3_BUCKET_NAME` | `replicateimagetd` |

---

## 💻 Option 2: Deploy via Heroku CLI

### Step 1: Install Heroku CLI
**macOS:**
```bash
# Install Homebrew first if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Heroku CLI
brew tap heroku/brew && brew install heroku
```

**Other methods:** Visit [devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)

### Step 2: Login and Create App
```bash
# Login to Heroku
heroku login

# Create new app (replace 'your-app-name' with your desired name)
heroku create your-app-name

# Set environment variables
heroku config:set AWS_ACCESS_KEY_ID=AKIAWU4C642GLMTAEMEM
heroku config:set AWS_SECRET_ACCESS_KEY='+iAJKTsjdB7e+GVrD4ijyKzgwFu/w8G/TxIwyiEc'
heroku config:set AWS_REGION=us-east-2
heroku config:set S3_BUCKET_NAME=replicateimagetd
```

### Step 3: Deploy
```bash
# Deploy to Heroku
git push heroku main

# Open your live app
heroku open
```

---

## 🔧 Troubleshooting

### Common Issues:

**1. App crashes on startup:**
```bash
heroku logs --tail
```
Check for missing environment variables.

**2. AWS connection errors:**
- Verify all 4 environment variables are set correctly
- Ensure AWS credentials have S3 read permissions
- Check bucket name spelling: `replicateimagetd`

**3. Images not loading:**
- Verify bucket region is `us-east-2`
- Check that images are actually JPG/JPEG files

---

## 🎉 After Deployment

Your app will be available at: `https://your-app-name.herokuapp.com`

**Features that will work:**
- ✅ Real-time monitoring every 5 seconds
- ✅ Image grid showing your S3 images
- ✅ Download functionality
- ✅ New image notifications
- ✅ Mobile responsive design

**Default behavior:**
- Loads existing images from your bucket
- Checks for new JPG uploads automatically
- Highlights new images with green "NEW" badges
- Allows direct download of any image

---

## 🔒 Security Note

Your AWS credentials are safely stored as Heroku environment variables and are not visible in your code or GitHub repository.

## 📱 Sharing Your Website

Once deployed, you can share your Heroku URL with anyone to let them:
- View your S3 images in a beautiful grid
- Download any image
- See new images as they're uploaded
- Use it on mobile and desktop

**Your website will be live 24/7 and automatically update when new images are added to your S3 bucket!** 