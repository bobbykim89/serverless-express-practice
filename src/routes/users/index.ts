import AWS from 'aws-sdk'
import express, { Request, Response } from 'express'
import { check, validationResult } from 'express-validator'

// import dto
import type { PostUserReq, PatchUserReq } from './dto'
// import middleware
import { Auth } from '@/middleware'

const router = express.Router()
const USERS_TABLE = process.env.USERS_TABLE as string
const USER_POOL_ID = process.env.USER_POOL_ID as string
const CLIENT_ID = process.env.CLIENT_ID as string
const dynamoDbClient = new AWS.DynamoDB.DocumentClient()
const cognito = new AWS.CognitoIdentityServiceProvider()

router.get('/', async (_, res: Response): Promise<void> => {
  try {
    const { Items } = await dynamoDbClient
      .scan({
        TableName: USERS_TABLE,
      })
      .promise()
    res.json({
      users: Items,
    })
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve table', message: err })
  }
})

router.get('/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { Item } = await dynamoDbClient
      .get({
        TableName: USERS_TABLE,
        Key: {
          userId: req.params.userId,
        },
      })
      .promise()
    if (Item) {
      const { userId, name } = Item
      res.json({ userId, name })
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' })
    }
  } catch (err) {
    res.status(500).json({ error: 'Could not retreive user', message: err })
  }
})

router.post(
  '/',
  Auth,
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
  async (req: Request, res: Response): Promise<void | Response> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    const { name, email, password } = req.body

    try {
      const user = await cognito
        .adminCreateUser({
          UserPoolId: USER_POOL_ID,
          Username: email,
          UserAttributes: [
            {
              Name: 'email',
              Value: email,
            },
            {
              Name: 'email_verified',
              Value: 'true',
            },
          ],
          MessageAction: 'SUPPRESS',
        })
        .promise()
      if (user.User) {
        await cognito
          .adminSetUserPassword({
            Password: password,
            UserPoolId: USER_POOL_ID,
            Username: email,
            Permanent: true,
          })
          .promise()
      }
      const dataObject: PostUserReq = {
        userId: `User-${email}`,
        name,
        createdAt: Date.now(),
      }
      await dynamoDbClient
        .put({
          TableName: USERS_TABLE,
          Item: dataObject,
        })
        .promise()
      return res.status(200).json({ user, userProfile: dataObject })
    } catch (err) {
      return res
        .status(500)
        .json({ error: 'Could not create user', message: err })
    }
  }
)

router.patch(
  '/:userId',
  Auth,
  async (req: Request, res: Response): Promise<void | Response> => {
    try {
      const { Item } = await dynamoDbClient
        .get({
          TableName: USERS_TABLE,
          Key: {
            userId: req.params.userId,
          },
        })
        .promise()
      if (!Item) {
        return res
          .status(404)
          .json({ error: 'Could not find user with provided "userId"' })
      }
      const dataObject: PatchUserReq = { ...req.body, updatedAt: Date.now() }
      const itemKeys = Object.keys(dataObject).filter((key) => {
        return key !== 'createdAt'
      })
      const params = {
        TableName: USERS_TABLE,
        Key: {
          userId: req.params.userId,
        },
        UpdateExpression: `SET ${itemKeys
          .map((_, index) => `#field${index} = :value${index}`)
          .join(', ')}`,
        ExpressionAttributeNames: itemKeys.reduce(
          (accumulator, key, index) => ({
            ...accumulator,
            [`#field${index}`]: key,
          }),
          {}
        ),
        ExpressionAttributeValues: itemKeys.reduce(
          (accumulator, key: string, index: number) => ({
            ...accumulator,
            [`:value${index}`]: dataObject[key as keyof PatchUserReq],
          }),
          {}
        ),
        ReturnValues: 'ALL_NEW',
      }
      await dynamoDbClient.update(params).promise()
      res.json({ ...dataObject, userId: req.params.userId })
    } catch (err) {
      res.status(500).json({ error: 'Could not update user', message: err })
    }
  }
)

// delete user
router.delete(
  '/:userId',
  Auth,
  async (req: Request, res: Response): Promise<void | Response> => {
    try {
      const { Item } = await dynamoDbClient
        .get({
          TableName: USERS_TABLE,
          Key: {
            userId: req.params.userId,
          },
        })
        .promise()
      if (!Item) {
        return res
          .status(404)
          .json({ error: 'Could not find user with provided "userId"' })
      }
      await dynamoDbClient
        .delete({
          TableName: USERS_TABLE,
          Key: {
            userId: req.params.userId,
          },
        })
        .promise()
      res.json({ message: 'Deleted the user' })
    } catch (err) {
      res.status(500).json({ error: 'Could not delete user', message: err })
    }
  }
)

export { router as UsersRouter }
