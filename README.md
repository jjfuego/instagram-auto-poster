# Instagram Auto Poster

Automated Instagram posting pipeline using Dropbox images and AI-generated captions/hashtags.

## Features

- Daily automated Instagram posts
- Uses Dropbox as image source
- AI-powered image captioning
- AI-generated relevant hashtags
- Fully automated via GitHub Actions
- Zero hosting costs (uses only free tiers)

## Setup

1. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd instagram-auto-poster
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up required accounts and get credentials:**
   - Dropbox: Create an app and get access token
   - Instagram: Set up Facebook Developer account and get Instagram Graph API credentials
   - Hugging Face: Deploy free inference endpoints for captioning and text generation

4. **Configure GitHub Secrets**
   Add the following secrets to your GitHub repository:
   - `DROPBOX_ACCESS_TOKEN`
   - `HUGGINGFACE_CAPTION_ENDPOINT`
   - `HUGGINGFACE_HASHTAG_ENDPOINT`
   - `INSTAGRAM_ACCESS_TOKEN`
   - `INSTAGRAM_PAGE_ID`

5. **Set up Dropbox folders**
   Create two folders in your Dropbox:
   - `/to-post`: Place images here that you want to post
   - `/posted`: Successfully posted images will be moved here

## Usage

1. **Automated Usage**
   - Place images in the Dropbox `/to-post` folder
   - The GitHub Action will run daily at midnight UTC
   - Images will be automatically posted to Instagram with AI-generated captions and hashtags
   - Posted images are moved to the `/posted` folder

2. **Manual Trigger**
   - You can manually trigger the workflow from the GitHub Actions tab
   - Click "Run workflow" on the "Daily Instagram Post" workflow

## Development

1. **Local Setup**
   ```bash
   npm install
   npm run dev
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Testing**
   ```bash
   npm test
   ```

## Error Handling

- The script includes comprehensive error logging
- Failed posts will not move images to the `/posted` folder
- Check GitHub Actions logs for detailed error information

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
