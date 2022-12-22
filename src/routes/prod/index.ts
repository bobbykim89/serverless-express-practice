import AWS from 'aws-sdk'
import express, { Request, Response } from 'express'
import { check, validationResult } from 'express-validator'
import { v4 as uuid } from 'uuid'

// import dto
import { PostProdReq } from './dto'
// import middleware
import { Auth, upload, Cloudinary } from '@/middleware'

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
    res.status(200).json(Items)
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
      res.status(200).json(Item)
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
router.get('/user/:userId', Auth, async (req: Request, res: Response) => {
  try {
    const { Items } = await dynamoDbClient
      .scan({
        TableName: PROD_TABLE,
        FilterExpression: 'userId = :r',
        ExpressionAttributeValues: { ':r': req.params.userId },
      })
      .promise()
    res.status(200).json(Items)
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Could not retreive product by "userId"', message: err })
  }
})

router.post(
  '/',
  Auth,
  upload.single('image'),
  [check('name').isString().not().isEmpty(), check('description').isString()],
  async (req: Request, res: Response): Promise<void | Response> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    const { name, description } = req.body
    const { email } = req.user
    const uid = `Prod-${uuid()}`

    try {
      const { public_id, secure_url } = await Cloudinary.uploader.upload(
        req.file!.path,
        {
          folder: 'serverless-practice',
        },
        // looks like custom error handler is not working as expected
        (error, _) => {
          if (error) {
            return res
              .status(403)
              .json({ message: 'Failed to upload image', error })
          }
        }
      )

      const dataObject: PostProdReq = {
        prodId: uid,
        name,
        description,
        userId: `User-${email}`,
        imageId: public_id,
        originalImage: secure_url,
        thumbUrl: secure_url.replace('/upload', '/upload/c_scale,w_250/f_auto'),
        imageUrl: secure_url.replace(
          '/upload',
          '/upload/c_scale,w_1200/q_auto'
        ),
        createdAt: Date.now(),
      }
      await dynamoDbClient
        .put({
          TableName: PROD_TABLE,
          Item: dataObject,
        })
        .promise()
      return res.status(200).json(dataObject)
    } catch (err) {
      return res.status(500).json({
        error: 'Could not create product',
        message: err,
      })
    }
  }
)

router.delete(
  '/:prodId',
  Auth,
  async (req: Request, res: Response): Promise<void | Response> => {
    try {
      const { Item } = await dynamoDbClient
        .get({
          TableName: PROD_TABLE,
          Key: {
            prodId: req.params.prodId,
          },
        })
        .promise()
      if (!Item) {
        return res
          .status(404)
          .json({ error: 'Could not find prod with provided "userId"' })
      }
      await Cloudinary.uploader.destroy(Item.imageId)
      await dynamoDbClient
        .delete({
          TableName: PROD_TABLE,
          Key: {
            prodId: req.params.prodId,
          },
        })
        .promise()
      return res.status(200).json({ message: 'Deleted the prod', item: Item })
    } catch (err) {
      return res
        .status(500)
        .json({ error: 'Could not delete prod', message: err })
    }
  }
)

export { router as ProdRouter }
