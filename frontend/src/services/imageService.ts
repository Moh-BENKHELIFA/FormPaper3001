class ImageService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://localhost:5004/api';
  }

  async uploadImage(file: File, articleId: string): Promise<{ filename: string; path: string; url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('articleId', articleId);

    const response = await fetch(`${this.baseUrl}/upload-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }

    const result = await response.json();

    // Return the image data with full URL for serving
    return {
      filename: result.filename,
      path: result.path,
      url: `${this.baseUrl}/image/${articleId}/${result.filename}`
    };
  }

  async deleteImage(articleId: string, filename: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/image/${articleId}/${filename}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete image: ${response.statusText}`);
    }
  }

  getImageUrl(articleId: string, filename: string): string {
    return `${this.baseUrl}/image/${articleId}/${filename}`;
  }
}

export const imageService = new ImageService();