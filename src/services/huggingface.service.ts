import fetch from 'node-fetch';

export class HuggingFaceService {
  private apiEndpoint: string;

  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
  }

  async generateCaption(imageBuffer: Buffer): Promise<string> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: imageBuffer.toString('base64')
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.caption || '';
    } catch (error) {
      console.error('Error generating caption:', error);
      throw error;
    }
  }

  async generateHashtags(caption: string): Promise<string[]> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: `Generate 5 relevant Instagram hashtags for this caption: ${caption}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.hashtags || [];
    } catch (error) {
      console.error('Error generating hashtags:', error);
      throw error;
    }
  }
}
