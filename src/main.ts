import express, { Response } from 'express'

// routes
import { UsersRouter } from '@/routes/users'
import { ProdRouter } from '@/routes/prod'
import { AuthRouter } from '@/routes/auth'

// initialize express app
const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.get('/', (_, res: Response) => {
  res.json({ message: 'listening through aws lambda' })
})

// define routes
app.use('/users', UsersRouter)
app.use('/prod', ProdRouter)
app.use('/auth', AuthRouter)

app.use((_, res: Response) => {
  return res.status(404).json({
    error: 'Not Found',
  })
})

export { app }
