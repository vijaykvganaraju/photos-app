import app from './app.js'

const port = Number.parseInt(process.env.PORT ?? '3000', 10)
const host = process.env.HOST ?? '0.0.0.0'

app.listen({ port, host }, function (err) {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
