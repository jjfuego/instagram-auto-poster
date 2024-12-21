import dotenv from 'dotenv';
import { DropboxService } from './services/dropbox.service';
import { HuggingFaceService } from './services/huggingface.service';
import { InstagramService } from './services/instagram.service';

dotenv.config();

const TO_POST_FOLDER = '/to-post';
const POSTED_FOLDER = '/posted';

async function main() {
  try {
    // Initialize services
    const dropboxService = new DropboxService(
      process.env.DROPBOX_ACCESS_TOKEN || ''
    );
    
    const huggingFaceCaptionService = new HuggingFaceService(
      process.env.HUGGINGFACE_CAPTION_ENDPOINT || ''
    );
    
    const huggingFaceHashtagService = new HuggingFaceService(
      process.env.HUGGINGFACE_HASHTAG_ENDPOINT || ''
    );
    
    const instagramService = new InstagramService(
      process.env.INSTAGRAM_ACCESS_TOKEN || '',
      process.env.INSTAGRAM_PAGE_ID || ''
    );

    // List images in the to-post folder
    const images = await dropboxService.listImages(TO_POST_FOLDER);
    if (images.length === 0) {
      console.log('No images found to post');
      return;
    }

    // Process the first image
    const imagePath = images[0];
    console.log(`Processing image: ${imagePath}`);

    // Download the image
    const imageBuffer = await dropboxService.downloadImage(imagePath);

    // Generate caption using AI
    const caption = await huggingFaceCaptionService.generateCaption(imageBuffer);
    console.log(`Generated caption: ${caption}`);

    // Generate hashtags using AI
    const hashtags = await huggingFaceHashtagService.generateHashtags(caption);
    console.log(`Generated hashtags: ${hashtags.join(', ')}`);

    // Post to Instagram
    await instagramService.postImage(imagePath, caption, hashtags);
    console.log('Successfully posted to Instagram');

    // Move the image to the posted folder
    const fileName = imagePath.split('/').pop();
    await dropboxService.moveFile(
      imagePath,
      `${POSTED_FOLDER}/${fileName}`
    );
    console.log('Moved image to posted folder');

  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the main function
main();
