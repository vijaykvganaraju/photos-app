import photosController from '../controllers/photosController.js'
const photosRoutes = async function (app) {
	app.get('/providers', photosController.getProviders)
	app.get('/photos', photosController.listPhotos)
	app.get('/photos/:id/content', photosController.streamPhoto)
	app.post('/photos/upload', photosController.uploadPhoto)
}
export default photosRoutes
