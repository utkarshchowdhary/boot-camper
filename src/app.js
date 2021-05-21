const express = require('express')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')
const mongoSanitize = require('express-mongo-sanitize')
const helmet = require('helmet')
const xss = require('xss-clean')
const hpp = require('hpp')
const compression = require('compression')
const cors = require('cors')

require('./connect')
const bootcampRouter = require('./routes/bootcampRoutes')
const courseRouter = require('./routes/courseRoutes')
const reviewRouter = require('./routes/reviewRoutes')
const userRouter = require('./routes/userRoutes')
const AppError = require('./utils/AppError')
const errorHandler = require('./middleware/errorHandler')

// Start express app
const app = express()

app.set('port', process.env.PORT)

app.enable('trust proxy')

app.use(cors())

app.options('*', cors())

// Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
}

const limiter = rateLimit({
  max: 100,
  windowMs: 10 * 60 * 1000,
  message: 'To many requests from this IP please try again in an 10 mins!'
})

app.use('/api', limiter)

app.use(express.json({ limit: '10kb' }))

app.use(cookieParser())

app.use(mongoSanitize())

app.use(helmet())

app.use(xss())

app.use(hpp())

app.use(compression())

app.use('/api/bootcamps', bootcampRouter)
app.use('/api/courses', courseRouter)
app.use('/api/reviews', reviewRouter)
app.use('/api/users', userRouter)

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404))
})

// GlobalErrorHandler
app.use(errorHandler)

module.exports = app
