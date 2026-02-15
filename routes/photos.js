import photosController from '../controllers/photosController.js'
const photosRoutes = async function (app) {
	app.get('/photos', photosController.basicPhotoReply)
	app.get('/photos2', photosController.basicPhotoReply2)
}
export default photosRoutes
