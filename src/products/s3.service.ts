import { Inject, Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { AwsConfig } from '../config/configuration';
import { ConfigType } from '@nestjs/config';
import { awsConfig } from '../config/configuration';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor(
    @Inject(awsConfig.KEY)
    private aws: ConfigType<typeof awsConfig>,
  ) {
    this.region = this.aws.region;
    this.bucketName = this.aws.s3BucketName;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.aws.accessKeyId,
        secretAccessKey: this.aws.secretAccessKey,
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File | Buffer,
    folder: string = 'products',
    customKey?: string,
    contentType?: string,
  ): Promise<{ url: string; key: string }> {
    let buffer: Buffer;
    let mimeType: string;
    let key: string;

    // Si es un archivo Multer
    if (Buffer.isBuffer(file)) {
      buffer = file;
      mimeType = contentType || 'application/octet-stream';
      key = customKey || `${folder}/${uuidv4()}`;
    } else {
      // Es un objeto Multer File
      buffer = file.buffer;
      mimeType = file.mimetype;
      const fileExtension = file.originalname.split('.').pop();
      key = customKey || `${folder}/${uuidv4()}.${fileExtension}`;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.s3Client.send(command);

    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

    return { url, key };
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }
}
