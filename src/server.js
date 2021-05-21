require('dotenv').config()

process.on('uncaughtException', (err) => {
  console.log(err.name)
  console.log(err.message)
  process.exit(1)
})

const app = require('./app')

const server = app.listen(app.get('port'), () => {
  console.log(`Server running on port ${app.get('port')}...`)
})

process.on('unhandledRejection', (err) => {
  console.log(err.name)
  console.log(err.message)
  server.close(() => process.exit(1))
})
