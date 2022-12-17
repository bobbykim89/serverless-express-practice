import AWS from 'aws-sdk'
import express, { Request, Response } from 'express'
import { check, validationResult } from 'express-validator'
import { v4 as uuid } from 'uuid'

// import types
import type { PostUserReq, PatchUserReq } from './dto'

const router = express.Router()
const USERS_TABLE = process.env.USERS_TABLE as string
const dynamoDbClient = new AWS.DynamoDB.DocumentClient()

router.get('/', async (_, res: Response) => {
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

router.get('/:userId', async (req: Request, res: Response) => {
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
  [check('name').isString().not().isEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    const { name } = req.body
    const uid = `User-${uuid()}`
    const dataObject: PostUserReq = {
      userId: uid,
      name,
      createdAt: Date.now(),
    }
    try {
      await dynamoDbClient
        .put({
          TableName: USERS_TABLE,
          Item: dataObject,
        })
        .promise()
      res.json({ ...dataObject })
    } catch (err) {
      res.status(500).json({ error: 'Could not create user', message: err })
    }
  }
)

router.patch('/:userId', async (req: Request, res: Response) => {
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
    const dateNow: number = Date.now()
    const dataObject: PatchUserReq = { ...req.body, updatedAt: dateNow }
    const itemKeys = Object.keys(dataObject).filter((key) => {
      return key !== 'createdAt'
    })
    const params = {
      TableName: USERS_TABLE,
      Key: {
        userId: req.params.userId,
      },
      UpdateExpression: `SET ${itemKeys
        .map((key, index) => `#field${index} = :value${index}`)
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
})

export { router }
