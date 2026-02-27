import fs from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { lookup } from 'mime-types'

const randomId = () => {
  return Math.random().toString(36).slice(2, 10)
}

const sanitizeBaseName = (filename = '') => {
  const name = path.basename(filename)
  return name.replace(/[^a-zA-Z0-9._-]/g, '-')
}

const toIsoDate = (stats) => {
  return stats.birthtime?.toISOString?.() ?? stats.mtime.toISOString()
}

export class LocalProvider {
  constructor(config) {
    this.name = 'local'
    this.uploadDir = path.resolve(config.uploadDir)
  }

  async initialize() {
    await fs.mkdir(this.uploadDir, { recursive: true })
  }

  async upload(fileBuffer, meta) {
    const sanitized = sanitizeBaseName(meta.filename)
    const extension = path.extname(sanitized)
    const safeName = `${Date.now()}-${randomId()}${extension}`
    const key = safeName
    const filePath = path.join(this.uploadDir, safeName)

    await fs.writeFile(filePath, fileBuffer)
    const stats = await fs.stat(filePath)

    return {
      provider: this.name,
      key,
      filename: meta.filename,
      mimeType: meta.mimeType,
      size: stats.size,
      uploadedAt: toIsoDate(stats)
    }
  }

  async list() {
    const entries = await fs.readdir(this.uploadDir, { withFileTypes: true })
    const files = entries.filter((entry) => entry.isFile())

    return Promise.all(
      files.map(async (entry) => {
        const filePath = path.join(this.uploadDir, entry.name)
        const stats = await fs.stat(filePath)
        return {
          provider: this.name,
          key: entry.name,
          filename: entry.name,
          mimeType: lookup(entry.name) || 'application/octet-stream',
          size: stats.size,
          uploadedAt: toIsoDate(stats)
        }
      })
    )
  }

  async read(key) {
    const filePath = path.join(this.uploadDir, key)
    const buffer = await fs.readFile(filePath)
    return {
      mimeType: lookup(key) || 'application/octet-stream',
      stream: Readable.from(buffer)
    }
  }

  async remove(key) {
    const filePath = path.join(this.uploadDir, key)
    await fs.unlink(filePath)
  }
}
