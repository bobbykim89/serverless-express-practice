import express from 'express'
import { check } from 'express-validator'
import { Auth } from '@/middleware'

// import controller
import { AuthController } from './auth.controller'

const router = express.Router()

const authController = new AuthController()

// Get current in user
router.get('/', Auth, authController.getCurrentUser)

// login user
router.post(
  '/',
  [check('email').isEmail().not().isEmpty(), check('password').exists()],
  authController.loginUser
)

export { router as AuthRouter }
