# Manual Firebase Deployment Guide

## Step 1: Open Command Prompt/Terminal
Open a new Command Prompt or PowerShell window.

## Step 2: Navigate to Project Directory
```cmd
cd "C:\Users\Swayam\OneDrive\Desktop\bookstore"
```

## Step 3: Set Node.js Path (if needed)
```cmd
set PATH=%PATH%;C:\node-v18.18.0-win-x64
```

## Step 4: Login to Firebase
```cmd
firebase login
```
- This will open a browser window
- Sign in with your Google account
- Copy the authorization code and paste it back in the terminal

## Step 5: Deploy Everything
```cmd
firebase deploy
```

## Alternative: Deploy Only Functions First
```cmd
firebase deploy --only functions
```

## Alternative: Deploy Only Hosting
```cmd
firebase deploy --only hosting
```

## After Deployment
Your app will be live at:
- **Frontend**: https://onlinebookstore-880c4.web.app
- **Functions**: https://us-central1-onlinebookstore-880c4.cloudfunctions.net

## Troubleshooting
- If you get Node.js version errors, the older Firebase CLI should work
- Make sure you're in the correct directory
- Check that firebase.json and .firebaserc exist

## Files Created
- `functions/` - Cloud Functions backend
- `firebase.json` - Firebase configuration
- `.firebaserc` - Project configuration
- `deploy.bat` - Automated deployment script (if needed)
