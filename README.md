
# SM SPORTS - Cricket Auction App Setup Guide

If you are seeing errors like "The database (default) does not exist", follow these steps to initialize your backend.

## 1. Create Firestore Database
The code cannot automatically create the database instance. You must do this manually.

1.  Go to the [Firebase Console](https://console.firebase.google.com).
2.  Select your project (**sm-sports...**).
3.  In the left sidebar, expand **Build** and click **Firestore Database**.
4.  Click the **Create Database** button.
5.  **Location:** Choose a location close to you (e.g., `us-central1` or `asia-south1`).
6.  **Security Rules:** Select **Start in Test Mode** (easiest for development) OR **Start in Production Mode**.
    *   If you choose Production, you **MUST** update the rules (see Step 2).

## 2. Update Security Rules
To ensure the app works correctly (public registration, public viewing, admin management), you must use these specific rules.

1.  In the **Firestore Database** section, click the **Rules** tab.
2.  Delete the existing code.
3.  Copy and paste the code below:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 1. Allow Public Read Access
    // Viewers, Overlay, and Landing Page need to read auction data without logging in.
    match /{document=**} {
      allow read: if true;
    }

    // 2. Allow Public Player Registration
    // Players are NOT logged in when registering, so we must allow 'create' for anyone on this specific path.
    match /auctions/{auctionId}/registrations/{registrationId} {
      allow create: if true;
    }

    // 3. Admin & Team Owner Write Access
    // Only authenticated users can modify the rest of the database (start auction, bid, etc.)
    match /{document=**} {
      allow write: if request.auth != null;
    }
  }
}
```

4.  Click **Publish**.

## 3. Enable Authentication
1.  Go to **Build** > **Authentication**.
2.  Click **Get Started**.
3.  Select **Email/Password** as a Sign-in method.
4.  Enable it and click **Save**.
5.  **Enable Anonymous Auth** (Required for Team Login):
    *   Click **Add new provider**.
    *   Select **Anonymous**.
    *   Enable it and click **Save**.
6.  **Enable Client-side Sign-up** (Required for Admin Register):
    *   Go to **Settings** > **User actions**.
    *   Check **Enable create (sign-up)**.
    *   Click **Save**.

## 4. Run the App
Now you can:
1.  Login as the admin user you created.
2.  Go to the Dashboard.
3.  Click "Create New Auction".
4.  It should now save successfully and appear in your list.
