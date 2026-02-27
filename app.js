import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import sensible from '@fastify/sensible'
import fastifyStatic from '@fastify/static'
import photoRoutes from './routes/photos.js'
import healthCheckRoute from './routes/health.js'
import { buildProviderRegistry } from './services/providers/index.js'
import { loadConfig } from './services/config.js'
import { createPhotoStore } from './services/db/connection.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = fastify({ logger: true })
const config = loadConfig()
const providers = buildProviderRegistry(config, app.log)
const db = createPhotoStore(config.database)

app.decorate('config', config)
app.decorate('providers', providers)
app.decorate('db', db)

app.addHook('onReady', async () => {
  await app.db.initialize()
  await app.providers.initialize()
})

app.addHook('onClose', async () => {
  app.db.close()
})

await app.register(cors, { origin: true })
await app.register(sensible)
await app.register(multipart, {
  limits: {
    fileSize: config.maxUploadSizeMb * 1024 * 1024
  }
})

await app.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/'
})

await app.register(healthCheckRoute)
await app.register(photoRoutes, { prefix: '/api' })

app.get('/', async (_, reply) => {
  return reply.sendFile('index.html')
})

export default app
