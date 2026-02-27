export default async function (fastify, opts) {
	fastify.get('/health', () => {
		return {
			ok: true,
			providers: fastify.providers.listAvailable()
		}
	})
}
