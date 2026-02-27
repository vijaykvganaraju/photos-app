import { createHash, randomUUID } from 'node:crypto'

const mapPhotoForApi = (photo) => {
	return {
		id: photo.id,
		provider: photo.provider,
		filename: photo.originalFilename,
		mimeType: photo.mimeType,
		size: photo.sizeBytes,
		checksumSha256: photo.checksumSha256,
		uploadedAt: photo.createdAt,
		url: `/api/photos/${photo.id}/content`,
		thumbUrl: `/api/photos/${photo.id}/content`
	}
}

const isAllowedImageMime = (mimeType) => {
	return typeof mimeType === 'string' && mimeType.startsWith('image/')
}

const getProviders = async function (request) {
	return {
		ok: true,
		providers: request.server.providers.listAvailable()
	}
}

const listPhotos = async function (request) {
	const photos = request.server.db.listPhotos().map(mapPhotoForApi)
	return {
		ok: true,
		count: photos.length,
		photos
	}
}

const streamPhoto = async function (request, reply) {
	const { id } = request.params
	const photo = request.server.db.getPhotoById(id)
	if (!photo) {
		return reply.notFound('Photo not found')
	}

	const localProvider = request.server.providers.get('local')
	const file = await localProvider.read(photo.storageKey)
	reply.header('Content-Type', photo.mimeType || file.mimeType)
	return reply.send(file.stream)
}

const uploadPhoto = async function (request, reply) {
	const parts = request.parts()
	const localProvider = request.server.providers.get('local')
	const pendingRows = []
	const writtenKeys = []

	for await (const part of parts) {
		if (part.type === 'file' && part.fieldname === 'photo') {
			if (!isAllowedImageMime(part.mimetype)) {
				return reply.badRequest(`Unsupported file type '${part.mimetype}'. Only image/* is allowed.`)
			}

			const chunks = []
			for await (const chunk of part.file) {
				chunks.push(chunk)
			}

			const fileBuffer = Buffer.concat(chunks)
			if (fileBuffer.length === 0) {
				continue
			}

			const uploaded = await localProvider.upload(fileBuffer, {
				filename: part.filename,
				mimeType: part.mimetype
			})

			writtenKeys.push(uploaded.key)

			pendingRows.push({
				id: randomUUID(),
				provider: 'local',
				storageKey: uploaded.key,
				originalFilename: part.filename ?? uploaded.key,
				mimeType: part.mimetype,
				sizeBytes: uploaded.size,
				checksumSha256: createHash('sha256').update(fileBuffer).digest('hex'),
				createdAt: new Date().toISOString()
			})
		}
	}

	if (pendingRows.length === 0) {
		return reply.badRequest('Missing file field: photo')
	}

	try {
		request.server.db.insertPhotos(pendingRows)
	} catch (error) {
		await Promise.all(
			writtenKeys.map(async (key) => {
				try {
					await localProvider.remove(key)
				} catch {
					request.log.warn({ key }, 'Could not clean up file after database failure')
				}
			})
		)

		throw error
	}

	const photos = pendingRows.map(mapPhotoForApi)

	return reply.code(201).send({
		ok: true,
		totalSaved: photos.length,
		photos
	})
}

export default { getProviders, listPhotos, streamPhoto, uploadPhoto }
