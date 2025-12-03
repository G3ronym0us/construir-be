import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessedImage {
  buffer: Buffer;
  format: 'webp' | 'jpeg';
  size: ImageDimensions;
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  // Banner sizes configuration
  private readonly sizes = {
    desktop: { width: 1920, height: 600 },
    tablet: { width: 1024, height: 400 },
    mobile: { width: 640, height: 400 },
  };

  /**
   * Process a banner image into all required variants
   * @param buffer Original image buffer
   * @returns Object with all processed variants
   */
  async processBannerImage(buffer: Buffer): Promise<{
    desktop: { webp: Buffer; jpeg: Buffer };
    tablet: { webp: Buffer; jpeg: Buffer };
    mobile: { webp: Buffer; jpeg: Buffer };
  }> {
    this.logger.log('Starting banner image processing');

    const [desktop, tablet, mobile] = await Promise.all([
      this.processImageVariant(buffer, this.sizes.desktop),
      this.processImageVariant(buffer, this.sizes.tablet),
      this.processImageVariant(buffer, this.sizes.mobile),
    ]);

    this.logger.log('Banner image processing completed');

    return {
      desktop,
      tablet,
      mobile,
    };
  }

  /**
   * Process a single image variant in both WebP and JPEG formats
   */
  private async processImageVariant(
    buffer: Buffer,
    size: ImageDimensions,
  ): Promise<{ webp: Buffer; jpeg: Buffer }> {
    const resized = sharp(buffer).resize(size.width, size.height, {
      fit: 'cover',
      position: 'center',
    });

    const [webp, jpeg] = await Promise.all([
      resized.clone().webp({ quality: 85 }).toBuffer(),
      resized.clone().jpeg({ quality: 85, progressive: true }).toBuffer(),
    ]);

    return { webp, jpeg };
  }

  /**
   * Validate if the uploaded file is a valid image
   */
  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return !!(metadata.width && metadata.height);
    } catch (error) {
      this.logger.error('Invalid image file', error);
      return false;
    }
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(buffer: Buffer): Promise<sharp.Metadata> {
    return await sharp(buffer).metadata();
  }
}
