# Firebase Cloud Functions Deployment Guide

## Setup Instructions

### 1. Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### 2. Install Cloud Functions Dependencies
```bash
cd functions
npm install
cd ..
```

### 3. Login to Firebase
```bash
firebase login
```

### 4. Deploy Cloud Functions & Hosting
```bash
firebase deploy
```

This will deploy:
- ✅ All Cloud Functions (books, orders, users, wishlist)
- ✅ Frontend to Firebase Hosting

## After Deployment

1. Your backend is now serverless on Firebase Cloud Functions
2. Your frontend will be hosted on Firebase Hosting
3. The frontend automatically connects to the Cloud Functions

## Function URLs

After deployment, your functions will be available at:
- `https://us-central1-onlinebookstore-880c4.cloudfunctions.net/booksGet`
- `https://us-central1-onlinebookstore-880c4.cloudfunctions.net/orderPlace`
- etc.

The frontend script.js automatically uses these URLs.

## Testing

For local testing:
```bash
firebase emulators:start --only functions
```

## Notes

- No more localhost:5000 connection errors
- Fully serverless backend
- Firebase Firestore handles all data
- CORS is enabled for Vercel frontend
