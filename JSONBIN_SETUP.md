# JSONBin.io Setup Instructions

Your notice board app has been updated to use JSONBin.io for real-time data synchronization across all users. JSONBin.io is a free cloud JSON storage service that's perfect for simple applications.

## Step 1: Create JSONBin.io Account

1. Go to [JSONBin.io](https://jsonbin.io)
2. Click "Get Started" or "Sign Up"
3. Create a free account (supports up to 10,000 requests/month)
4. Verify your email address

## Step 2: Get Your API Key

1. After logging in, go to your Dashboard
2. Click on "API Keys" in the sidebar
3. Your Master Key will be displayed
4. Copy this key (starts with `$2a$10$...`)

## Step 3: Create a New Bin

1. In your dashboard, click "Create Bin"
2. Name it something like "college-notices"
3. Set the content to:
```json
{
  "notices": [],
  "lastUpdated": "2024-01-01T00:00:00.000Z"
}
```
4. Click "Create"
5. Copy the Bin ID from the URL or bin details

## Step 4: Configure Your App

1. Open `index.html` in your project
2. Find the JSONBin configuration section (around line 239)
3. Replace the placeholder values:

```javascript
window.JSONBIN_CONFIG = {
    apiKey: 'YOUR_ACTUAL_API_KEY_HERE',
    binId: 'YOUR_ACTUAL_BIN_ID_HERE',
    baseUrl: 'https://api.jsonbin.io/v3'
};
```

**Example:**
```javascript
window.JSONBIN_CONFIG = {
    apiKey: '$2a$10$AbCdEfGhIjKlMnOpQrStUvWxYz1234567890',
    binId: '65f123456789abcdef123456',
    baseUrl: 'https://api.jsonbin.io/v3'
};
```

## Step 5: Deploy and Test

1. Save your changes
2. Commit to GitHub
3. GitHub Pages will automatically deploy
4. Open your app in multiple browser tabs/devices
5. Create a notice - it should appear in real-time on all devices within 10 seconds!

## Features Added

✅ **Real-time sync**: Changes sync across all users every 10 seconds
✅ **Offline fallback**: App works offline using localStorage when JSONBin is unavailable  
✅ **Error handling**: Shows notifications when sync fails
✅ **Automatic backup**: Data is saved both online and locally
✅ **No Firebase complexity**: Simple REST API calls

## How It Works

- **Read**: App fetches latest data from JSONBin on load
- **Write**: Changes are immediately saved to JSONBin
- **Sync**: App checks for updates every 10 seconds
- **Fallback**: Uses localStorage if JSONBin is unavailable

## API Limits (Free Plan)

- **Requests**: 10,000 per month
- **Storage**: 100KB per bin
- **Bins**: Up to 100 bins
- **Rate limit**: 60 requests per minute

For a typical college notice board, this should be more than sufficient.

## Troubleshooting

### "JSONBin not configured" message
- Check that you've replaced `YOUR_API_KEY` and `YOUR_BIN_ID` with actual values
- Verify the API key format starts with `$2a$10$`

### Data not syncing
- Check browser console for API errors
- Verify your API key is correct
- Ensure your bin exists and is accessible

### "Error connecting to server" 
- Check your internet connection
- Verify JSONBin.io is accessible
- App will continue working offline using localStorage

### API quota exceeded
- Check your JSONBin.io dashboard for usage stats
- Consider upgrading to paid plan if needed
- Optimize polling frequency if necessary

## Security Notes

- The API key allows full access to your JSONBin account
- Consider using environment variables for production
- JSONBin.io bins are private by default (only accessible with your API key)
- No sensitive data should be stored in notice content

## Advanced Configuration

To change the polling frequency, edit `script.js` line with `setInterval`:
```javascript
// Change 10000 to desired milliseconds (10000 = 10 seconds)
this.pollInterval = setInterval(() => {
    this.checkForUpdates();
}, 10000);
```

## Alternative Services

If you need more features, consider:
- **Firebase Realtime Database** (Google, more complex setup)
- **Supabase** (PostgreSQL-based, more features)
- **Airtable API** (Spreadsheet-like interface)
- **MongoDB Atlas** (Full database solution)