import { Readable } from 'node:stream'
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const isReady = (config) => {
  return Boolean(config.enabled && config.region && config.bucket && config.accessKeyId && config.secretAccessKey)
}

const randomId = () => {
  return Math.random().toString(36).slice(2, 10)
}

export class S3Provider {
  constructor(config) {
    this.name = 's3'
    this.bucket = config.bucket
    this.config = config
    this.client = null
  }

  static isConfigured(config) {
    return isReady(config)
  }

  async initialize() {
    if (!isReady(this.config)) {
      throw new Error('S3 is not fully configured. Check S3_* env vars.')
    }

    this.client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint || undefined,
      forcePathStyle: this.config.forcePathStyle,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey
      }
    })
  }

  async upload(fileBuffer, meta) {
    const key = `${Date.now()}-${randomId()}-${meta.filename ?? 'upload'}`

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: meta.mimeType
      })
    )

    return {
      provider: this.name,
      key,
      filename: meta.filename,
      mimeType: meta.mimeType,
      size: fileBuffer.length,
      uploadedAt: new Date().toISOString()
    }
  }

  async list() {
    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket
      })
    )

    return (response.Contents ?? []).map((item) => {
      return {
        provider: this.name,
        key: item.Key,
        filename: item.Key,
        mimeType: 'application/octet-stream',
        size: item.Size ?? 0,
        uploadedAt: item.LastModified?.toISOString?.() ?? new Date().toISOString()
      }
    })
  }

  async read(key) {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      })
    )

    const body = response.Body
    const stream = body instanceof Readable ? body : Readable.from(body)

    return {
      mimeType: response.ContentType || 'application/octet-stream',
      stream
    }
  }
}
