import fastify from 'fastify'
import photoRoutes from './routes/photos.js'
import healthCheckRoute from './routes/health.js'

const app = fastify({ logger: true })
app.register(healthCheckRoute);
app.register(photoRoutes);

export default app
