import AWS from 'aws-sdk'
import express, { Request, Response } from 'express'
import { check, validationResult } from 'express-validator'
import { v4 as uuid } from 'uuid'

// import dto
import { PostProdReq } from './dto'

const router = express.Router()
const PROD_TABLE = process.env.PROD_TABLE as string
const dynamoDbClient = new AWS.DynamoDB.DocumentClient()

// get all prod
router.get('/', async (_, res: Response): Promise<void> => {
  try {
    const { Items } = await dynamoDbClient
      .scan({
        TableName: PROD_TABLE,
      })
      .promise()
    res.json({
      products: Items,
    })
  } catch (err) {
    res.status(500).json({ error: 'Could not retrieve table', message: err })
  }
})

router.get('/:prodId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { Item } = await dynamoDbClient
      .get({
        TableName: PROD_TABLE,
        Key: {
          prodId: req.params.prodId,
        },
      })
      .promise()
    if (Item) {
      res.json({ product: Item })
    } else {
      res
        .status(404)
        .json({ error: 'Could not find product with provided "prodId"' })
    }
  } catch (err) {
    res.status(500).json({ error: 'Could not retreive product', message: err })
  }
})

// get prod by user
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { Items } = await dynamoDbClient
      .scan({
        TableName: PROD_TABLE,
        FilterExpression: 'userId = :r',
        ExpressionAttributeValues: { ':r': req.params.userId },
      })
      .promise()
    res.json({ products: Items })
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Could not retreive product by "userId"', message: err })
  }
})

router.post(
  '/',
  [
    check('name').isString().not().isEmpty(),
    check('description').isString(),
    check('userId').isString().not().isEmpty(),
  ],
  async (req: Request, res: Response): Promise<void | Response> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    const { name, description, userId } = req.body
    const uid = `Prod-${uuid()}`
    const dataObject: PostProdReq = {
      prodId: uid,
      name,
      description,
      userId,
      createdAt: Date.now(),
    }
    try {
      await dynamoDbClient
        .put({
          TableName: PROD_TABLE,
          Item: dataObject,
        })
        .promise()
      res.json({ data: dataObject })
    } catch (err) {
      res.status(500).json({ error: 'Could not create product', message: err })
    }
  }
)

router.delete(
  '/:prodId',
  async (req: Request, res: Response): Promise<void | Response> => {
    try {
      const { Item } = await dynamoDbClient
        .get({
          TableName: PROD_TABLE,
          Key: {
            prodId: req.params.userId,
          },
        })
        .promise()
      if (!Item) {
        return res
          .status(404)
          .json({ error: 'Could not find prod with provided "userId"' })
      }
      await dynamoDbClient
        .delete({
          TableName: PROD_TABLE,
          Key: {
            userId: req.params.userId,
          },
        })
        .promise()
      res.json({ message: 'Deleted the prod' })
    } catch (err) {
      res.status(500).json({ error: 'Could not delete prod', message: err })
    }
  }
)

export { router }
