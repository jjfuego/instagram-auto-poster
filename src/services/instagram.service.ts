import fetch from 'node-fetch';

export class InstagramService {
  private accessToken: string;
  private pageId: string;

  constructor(accessToken: string, pageId: string) {
    this.accessToken = accessToken;
    this.pageId = pageId;
  }

  async postImage(imageUrl: string, caption: string, hashtags: string[]): Promise<void> {
    try {
      // First, create a container for the image
      const containerResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.pageId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: imageUrl,
            caption: `${caption}\n\n${hashtags.join(' ')}`,
            access_token: this.accessToken,
          }),
        }
      );

      if (!containerResponse.ok) {
        throw new Error(`Failed to create media container: ${await containerResponse.text()}`);
      }

      const { id: creationId } = await containerResponse.json();

      // Then publish the container
      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.pageId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: this.accessToken,
          }),
        }
      );

      if (!publishResponse.ok) {
        throw new Error(`Failed to publish media: ${await publishResponse.text()}`);
      }
    } catch (error) {
      console.error('Error posting to Instagram:', error);
      throw error;
    }
  }
}
