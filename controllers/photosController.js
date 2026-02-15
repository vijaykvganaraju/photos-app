const basicPhotoReply = async function (request, reply) {
	return { ok: true, method: "basicPhotoReply" }
}
const basicPhotoReply2 = async function (request, reply) {
	return { ok: true, method: "basicPhotoReply2" }
}
export default { basicPhotoReply, basicPhotoReply2 }
