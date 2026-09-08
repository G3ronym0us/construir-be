import { Inject, Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { ConfigType } from '@nestjs/config';
import { awsConfig } from '../config/configuration';

/**
 * Prefijo bajo el que van TODOS los objetos que no deben poder leerse sin
 * permiso. Está aparte del resto para que la policy del bucket pueda distinguir
 * lo público de lo privado por la clave: el bucket es el mismo que el de las
 * imágenes de producto, que sí tienen que servirse a cualquiera.
 */
export const PRIVATE_PREFIX = 'private';

/** Vida por defecto de un enlace firmado, en segundos. */
export const DEFAULT_SIGNED_URL_TTL = 300;

export interface UploadedObject {
  /** Ubicación en el bucket. Es lo único que se guarda de un objeto privado. */
  key: string;
}

export interface UploadedPublicObject extends UploadedObject {
  /** URL directa y permanente. Sólo existe para lo que es público a propósito. */
  url: string;
}

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

  /**
   * Sube un objeto que cualquiera puede leer por su URL: imágenes de producto,
   * de categoría y banners.
   *
   * Ya no existe un `uploadFile` neutro. Había uno, y por eso los comprobantes
   * de pago —capturas con nombre, cédula, banco y número de cuenta del
   * cliente— acabaron subiéndose igual que la foto de un saco de cemento: a un
   * bucket con lectura anónima y guardando la URL directa en la base. Quien
   * suba algo nuevo tiene que elegir entre este método y `uploadPrivateFile`,
   * y al elegir se le nota si se equivoca, porque el privado no devuelve URL.
   */
  async uploadPublicFile(
    file: Express.Multer.File | Buffer,
    folder: string = 'products',
    customKey?: string,
    contentType?: string,
  ): Promise<UploadedPublicObject> {
    const { key } = await this.put(file, folder, customKey, contentType);
    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

    return { url, key };
  }

  /**
   * Sube un objeto que sólo debe verse con permiso.
   *
   * Devuelve la `key` y nada más: no hay URL que guardar en la base ni que
   * mandar al navegador. Para enseñarlo hay que pasar por
   * `getSignedDownloadUrl`, que exige que alguien haya autorizado antes.
   *
   * La clave va bajo `private/`, que es de donde la policy del bucket tiene que
   * quitar la lectura anónima.
   */
  async uploadPrivateFile(
    file: Express.Multer.File | Buffer,
    folder: string,
    customKey?: string,
    contentType?: string,
  ): Promise<UploadedObject> {
    return this.put(
      file,
      `${PRIVATE_PREFIX}/${folder}`,
      customKey ? `${PRIVATE_PREFIX}/${customKey}` : undefined,
      contentType,
    );
  }

  /**
   * Enlace temporal para descargar un objeto privado.
   *
   * Va firmado con las credenciales del servidor y caduca, así que lo que llega
   * al navegador ya no es un secreto permanente como lo era la URL directa: si
   * se reenvía o se queda en el historial, a los pocos minutos no abre nada.
   *
   * `disposition` permite pedir la descarga con nombre de archivo en vez de la
   * vista en línea; se resuelve en S3 para no tener que proxear el fichero por
   * el backend ni pelear con CORS desde el navegador.
   */
  async getSignedDownloadUrl(
    key: string,
    options: {
      expiresIn?: number;
      disposition?: 'inline' | 'attachment';
      filename?: string;
    } = {},
  ): Promise<{ url: string; expiresIn: number }> {
    const expiresIn = options.expiresIn ?? DEFAULT_SIGNED_URL_TTL;

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ResponseContentDisposition: this.contentDisposition(
        options.disposition ?? 'inline',
        options.filename,
      ),
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    return { url, expiresIn };
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  private contentDisposition(
    disposition: 'inline' | 'attachment',
    filename?: string,
  ): string {
    if (!filename) return disposition;

    // Sin comillas ni saltos de línea: el nombre sale del número de orden, pero
    // una cabecera partida en dos es demasiado barata como para arriesgarla.
    const safe = filename.replace(/[^\w.\-]/g, '_');
    return `${disposition}; filename="${safe}"`;
  }

  private async put(
    file: Express.Multer.File | Buffer,
    folder: string,
    customKey?: string,
    contentType?: string,
  ): Promise<UploadedObject> {
    let buffer: Buffer;
    let mimeType: string;
    let key: string;

    if (Buffer.isBuffer(file)) {
      buffer = file;
      mimeType = contentType || 'application/octet-stream';
      key = customKey || `${folder}/${uuidv4()}`;
    } else {
      buffer = file.buffer;
      mimeType = contentType || file.mimetype;
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

    return { key };
  }
}
