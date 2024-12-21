# aiPostPics - Automated Instagram Posting from Dropbox

## Project Overview
aiPostPics is a web application that automates Instagram posting by pulling images from a specified Dropbox folder and posting them at scheduled times. The app uses AI to generate engaging captions and relevant hashtags.

## Core Features
1. **Dropbox Integration**
   - Connect to Dropbox account
   - Select source folder for images
   - Monitor folder for new images

2. **Instagram Integration**
   - OAuth authentication with Facebook/Instagram
   - Support for Instagram Business accounts
   - Automated posting capabilities

3. **Scheduling System**
   - Set posting times throughout the day
   - Queue management for posts
   - Timezone support

4. **AI Caption Generation**
   - Generate engaging captions based on image content
   - Create relevant hashtags
   - Maintain brand voice consistency

## Technical Implementation
1. **Backend (Node.js/Express)**
   - Facebook Graph API integration
   - Dropbox API integration
   - Session management
   - Scheduling system

2. **Frontend**
   - Clean, modern UI
   - Post preview functionality
   - Schedule management interface
   - Account connection status

3. **APIs & Dependencies**
   - Facebook Graph API (Instagram)
   - Dropbox API
   - Express session management
   - Node-cron for scheduling

## Current Status
- ✅ Facebook/Instagram API integration
- ✅ Basic posting functionality
- ✅ Dropbox connection
- ✅ Image selection from Dropbox
- 🔄 Scheduling system (in progress)
- 🔄 AI caption generation (in progress)

## Environment Setup
```env
PORT=3003
FACEBOOK_APP_ID=your_fb_app_id
FACEBOOK_APP_SECRET=your_fb_secret
DROPBOX_APP_KEY=your_dropbox_key
DROPBOX_APP_SECRET=your_dropbox_secret
```

## Next Steps
1. Implement scheduling system
   - Add cron job functionality
   - Create schedule management UI
   - Add queue management

2. Enhance AI caption generation
   - Integrate with AI service
   - Add customization options
   - Save successful captions for learning

3. Add monitoring and notifications
   - Post success/failure notifications
   - Queue status updates
   - Error reporting

## Notes
- App requires Instagram Business account
- Facebook app requires proper permissions
- Posts must comply with Instagram's API terms
- Rate limiting must be considered for automated posting

## Development Guidelines
1. Keep Facebook authentication flow simple
2. Maintain clear separation between scheduling and posting logic
3. Implement proper error handling for API calls
4. Cache Dropbox file listings when possible
5. Keep UI intuitive and focused on core functionality
