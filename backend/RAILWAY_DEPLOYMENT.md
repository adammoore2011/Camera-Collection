# Railway Deployment Guide for Vintage Camera Collection API

## Prerequisites

1. Railway account (https://railway.app)
2. MongoDB Atlas account for cloud database (https://mongodb.com/atlas)
3. GitHub account (to push code)

## Step 1: Set Up MongoDB Atlas (Free Tier)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create a free cluster (M0 tier)
3. Create a database user with username and password
4. Add `0.0.0.0/0` to IP Whitelist (Network Access) to allow Railway to connect
5. Get your connection string:
   - Click "Connect" → "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)

## Step 2: Prepare Your Code

The following files are already configured for Railway:

- `Procfile` - Tells Railway how to start your app
- `railway.json` - Railway configuration
- `requirements-railway.txt` - Python dependencies (optimized for Railway)
- `nixpacks.toml` - Build configuration
- `runtime.txt` - Python version

## Step 3: Push to GitHub

```bash
# Initialize git (if not already)
git init

# Add backend files
git add .

# Commit
git commit -m "Prepare for Railway deployment"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 4: Deploy to Railway

1. Go to https://railway.app and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect it's a Python app

## Step 5: Configure Environment Variables

In Railway dashboard, go to your service → Variables tab and add:

```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/camera_collection?retryWrites=true&w=majority
DB_NAME=camera_collection
JWT_SECRET=your-super-secret-jwt-key-here
```

**Important:** Replace the values with your actual MongoDB Atlas connection string.

## Step 6: Get Your Production URL

After deployment completes:
1. Go to Settings → Domains
2. Railway provides a URL like: `your-app.up.railway.app`
3. This is your production API URL

## Step 7: Update Your iOS App

Update your Expo app's backend URL to point to Railway:

1. In `app.json` or `app.config.js`:
```json
{
  "expo": {
    "extra": {
      "backendUrl": "https://your-app.up.railway.app"
    }
  }
}
```

2. Rebuild your app:
```bash
eas build --platform ios
```

3. Submit to Apple App Store

## API Endpoints

Once deployed, your API will be available at:

- Health Check: `GET https://your-app.up.railway.app/api/health`
- Cameras: `GET/POST https://your-app.up.railway.app/api/cameras`
- Wishlist: `GET/POST https://your-app.up.railway.app/api/wishlist`
- Accessories: `GET/POST https://your-app.up.railway.app/api/accessories`
- Auth: `POST https://your-app.up.railway.app/api/auth/login`

## Costs

- **Railway**: ~$5-10/month for small apps (first $5 free)
- **MongoDB Atlas**: Free tier available (512MB storage)

## Troubleshooting

### App won't start
- Check the deployment logs in Railway dashboard
- Verify environment variables are set correctly
- Ensure MongoDB Atlas IP whitelist includes `0.0.0.0/0`

### Database connection errors
- Verify your MONGO_URL is correct
- Check MongoDB Atlas user permissions
- Ensure the database name in MONGO_URL matches DB_NAME

### Health check failing
- Check `/api/health` endpoint is returning 200
- Verify MongoDB connection is working
