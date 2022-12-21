import express, { Response } from 'express'

// routes
import { router as usersRouter } from '@/routes/users'
import { router as prodRouter } from '@/routes/prod'
import { router as authRouter } from '@/routes/auth'

// initialize express app
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.get('/', (_, res: Response) => {
  res.json({ message: 'listening through aws lambda' })
})

// define routes
app.use('/users', usersRouter)
app.use('/prod', prodRouter)
app.use('/auth', authRouter)

app.use((_, res: Response) => {
  return res.status(404).json({
    error: 'Not Found',
  })
})

export { app }
