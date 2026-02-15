export default async function (fastify, opts) {
	fastify.get('/health', (request, reply) => { return { ok: true }; })
}

