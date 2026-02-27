import { Storage } from '@google-cloud/storage'

const isReady = (config) => {
  return Boolean(config.enabled && config.bucket)
}

const randomId = () => {
  return Math.random().toString(36).slice(2, 10)
}

export class GcsProvider {
  constructor(config) {
    this.name = 'gcs'
    this.config = config
    this.storage = null
    this.bucket = null
  }

  static isConfigured(config) {
    return isReady(config)
  }

  async initialize() {
    if (!isReady(this.config)) {
      throw new Error('GCS is not fully configured. Check GCS_* env vars.')
    }

    this.storage = new Storage({
      projectId: this.config.projectId,
      keyFilename: this.config.keyFilename
    })
    this.bucket = this.storage.bucket(this.config.bucket)
  }

  async upload(fileBuffer, meta) {
    const key = `${Date.now()}-${randomId()}-${meta.filename ?? 'upload'}`
    const file = this.bucket.file(key)
    await file.save(fileBuffer, {
      contentType: meta.mimeType,
      resumable: false
    })

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
    const [files] = await this.bucket.getFiles()

    return files.map((file) => {
      const metadata = file.metadata ?? {}
      return {
        provider: this.name,
        key: file.name,
        filename: file.name,
        mimeType: metadata.contentType || 'application/octet-stream',
        size: Number.parseInt(metadata.size ?? '0', 10),
        uploadedAt: metadata.updated || new Date().toISOString()
      }
    })
  }

  async read(key) {
    const file = this.bucket.file(key)
    const [metadata] = await file.getMetadata()

    return {
      mimeType: metadata.contentType || 'application/octet-stream',
      stream: file.createReadStream()
    }
  }
}
