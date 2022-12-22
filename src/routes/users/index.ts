import express from 'express'
import { check } from 'express-validator'

// import middleware
import { Auth } from '@/middleware'
// import controller
import { UsersController } from './users.controller'

const router = express.Router()
const usersController = new UsersController()

router.get('/', usersController.getAllUser)

router.get('/:userId', usersController.getUserById)

router.post(
  '/',
  [
    check('name').isString().not().isEmpty(),
    check('email').isEmail().normalizeEmail({ gmail_remove_dots: false }),
    check('password').isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minNumbers: 1,
      minUppercase: 1,
      minSymbols: 1,
    }),
  ],
  usersController.postNewUser
)

router.patch('/:userId', Auth, usersController.patchUserProfile)

// delete user
router.delete('/:userId', Auth, usersController.deleteUser)

export { router as UsersRouter }
