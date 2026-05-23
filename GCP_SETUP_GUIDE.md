# Google Cloud Platform (GCP) Setup Guide for YouTube API

This guide explains how to create a Google Cloud project, enable the necessary YouTube APIs, and generate the OAuth 2.0 credentials needed to connect YouTube accounts to the Social Copilot app.

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Sign in with your Google account.
3. In the top navigation bar, click on the **Select a project** dropdown.
4. Click **New Project**.
5. Enter a **Project Name** (e.g., `Social Copilot`) and click **Create**.
6. Wait for the project to be created, then select it from the top navigation dropdown.

## Step 2: Enable the YouTube Data API v3

1. In your project, go to the **Navigation menu** (hamburger icon in the top left) > **APIs & Services** > **Library**.
2. In the search bar, type `YouTube Data API v3`.
3. Click on **YouTube Data API v3** from the results.
4. Click the **Enable** button.

## Step 3: Configure the OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** (if you want any YouTube user to connect) and click **Create**.
3. **App information**:
   - App name: `Social Copilot` (or your app's name)
   - User support email: Select your email address.
4. **App domain**:
   - Add your application's homepage and privacy policy URLs (if applicable).
5. **Authorized domains**:
   - Add your production domain (e.g., `yourdomain.com`).
6. **Developer contact information**:
   - Enter your email address.
7. Click **Save and Continue**.
8. **Scopes**:
   - Click **Add or Remove Scopes**.
   - Search for and select the following scopes:
     - `.../auth/youtube.upload` (Manage your YouTube videos)
     - `.../auth/youtube.readonly` (View your YouTube account)
     - `.../auth/youtube.force-ssl` (Manage your YouTube account - required for comments)
   - Click **Update**, then **Save and Continue**.
9. **Test users**:
   - While your app is in "Testing" mode, only explicitly added users can log in.
   - Click **Add Users** and add the Google email addresses of the accounts you plan to test with.
   - Click **Save and Continue**.
10. Review the summary and click **Back to Dashboard**.

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** at the top and select **OAuth client ID**.
3. Select **Web application** as the Application type.
4. Name the client (e.g., `Web Client`).
5. **Authorized JavaScript origins**:
   - Add your local development URL: `http://localhost:3000`
   - Add your production URL: `https://yourdomain.com`
6. **Authorized redirect URIs**:
   - Add your local callback URL: `http://localhost:3000/api/accounts/oauth/youtube/callback`
   - Add your production callback URL: `https://yourdomain.com/api/accounts/oauth/youtube/callback`
7. Click **Create**.
8. A modal will appear displaying your **Client ID** and **Client Secret**.
9. Copy these values.

## Step 5: Add Credentials to Your App

1. Open the `.env` or `.env.local` file in the root of your project.
2. Add the copied credentials:

```env
YOUTUBE_CLIENT_ID=your-client-id-here
YOUTUBE_CLIENT_SECRET=your-client-secret-here
```

3. Restart your Next.js development server.

> [!WARNING]
> Your application is currently in "Testing" mode in GCP. The OAuth consent screen will show an "unverified app" warning to test users. To remove this warning for a public launch, you must submit your app for verification in the GCP console, which involves a review process by Google, particularly for sensitive scopes like `youtube.force-ssl`.
