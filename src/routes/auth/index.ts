import { UserType } from './../../types/custom/user-type.interface'
import AWS from 'aws-sdk'
import express, { Request, Response } from 'express'
import { check, validationResult } from 'express-validator'
import { Auth } from '@/middleware'

// import dto
import type { AuthInput } from './dto'

const router = express.Router()
const cognito = new AWS.CognitoIdentityServiceProvider()
const USER_POOL_ID = process.env.USER_POOL_ID as string
const CLIENT_ID = process.env.CLIENT_ID as string

// Get current in user
router.get(
  '/',
  Auth,
  async (req: Request, res: Response): Promise<void | Response> => {
    const { email } = req.user
    try {
      const user = await cognito
        .adminGetUser({
          UserPoolId: USER_POOL_ID,
          Username: email,
        })
        .promise()

      if (!user) {
        return res.status(400).json({
          error: 'Could not find user with provided email address',
        })
      }
      return res.status(200).json(user)
    } catch (err) {
      return res
        .status(500)
        .json({ error: 'Cannot get current user', message: err })
    }
  }
)

// login user
router.post(
  '/',
  [check('email').isEmail().not().isEmpty(), check('password').exists()],
  async (req: Request, res: Response): Promise<void | Response> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    const { email, password }: AuthInput = req.body
    try {
      const user = await cognito
        .adminInitiateAuth({
          AuthFlow: 'ADMIN_NO_SRP_AUTH',
          UserPoolId: USER_POOL_ID,
          ClientId: CLIENT_ID,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        })
        .promise()
      return res.status(200).json({
        message: 'Successfully logged in',
        access_token: `Bearer ${user.AuthenticationResult?.IdToken}`,
      })
    } catch (err) {
      res.status(500).json({ error: 'Cannot proceed logging in', message: err })
    }
  }
)

export { router }
