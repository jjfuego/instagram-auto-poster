import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';

export class DropboxService {
  private client: Dropbox;

  constructor(accessToken: string) {
    this.client = new Dropbox({ accessToken, fetch });
  }

  async listImages(folderPath: string): Promise<string[]> {
    try {
      const response = await this.client.filesListFolder({
        path: folderPath
      });

      return response.result.entries
        .filter(entry => entry['.tag'] === 'file' && 
          /\.(jpg|jpeg|png)$/i.test(entry.name))
        .map(entry => entry.path_display || '');
    } catch (error) {
      console.error('Error listing Dropbox images:', error);
      throw error;
    }
  }

  async downloadImage(filePath: string): Promise<Buffer> {
    try {
      const response = await this.client.filesDownload({
        path: filePath
      });
      
      // @ts-ignore - The types are incorrect for the response
      return response.result.fileBinary;
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  }

  async moveFile(fromPath: string, toPath: string): Promise<void> {
    try {
      await this.client.filesMoveV2({
        from_path: fromPath,
        to_path: toPath
      });
    } catch (error) {
      console.error('Error moving file:', error);
      throw error;
    }
  }
}
