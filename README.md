# AI Post Pics

Automatically post images from Dropbox to Instagram with AI-generated captions.

## Features

- Connect to Dropbox to select image source folders
- AI-powered caption generation using Hugging Face
- Multiple caption styles (Professional, Artistic, Casual, etc.)
- Schedule posts with custom frequencies
- Track posted and pending images

## Setup

1. Clone this repository
2. Run `npm install`
3. Copy `.env.example` to `.env`
4. Add your Dropbox API credentials to `.env`
5. Run `node index.js`
6. Visit `http://localhost:3003`

## Environment Variables

- `PORT`: Server port (default: 3003)
- `DROPBOX_APP_KEY`: Your Dropbox app key
- `DROPBOX_APP_SECRET`: Your Dropbox app secret
- `INSTAGRAM_APP_ID`: Your Instagram app ID (optional)
- `INSTAGRAM_APP_SECRET`: Your Instagram app secret (optional)

Note: The Hugging Face API key is managed through GitHub secrets, so you don't need to set it up.
