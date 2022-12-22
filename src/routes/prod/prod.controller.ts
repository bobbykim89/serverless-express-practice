import AWS from 'aws-sdk'
import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { v4 as uuid } from 'uuid'

// import dto
import { PostProdReq } from './dto'
// import middleware
import { Cloudinary } from '@/middleware'

const PROD_TABLE = process.env.PROD_TABLE as string
const dynamoDbClient = new AWS.DynamoDB.DocumentClient()

export class ProdController {
  public async getAllProd(_: Request, res: Response): Promise<void | Response> {
    try {
      const { Items } = await dynamoDbClient
        .scan({
          TableName: PROD_TABLE,
        })
        .promise()
      return res.status(200).json(Items)
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not retrieve table', error: err })
    }
  }
  public async getProdById(
    req: Request,
    res: Response
  ): Promise<void | Response> {
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
        return res.status(200).json(Item)
      } else {
        return res
          .status(404)
          .json({ error: 'Could not find product with provided "prodId"' })
      }
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not retreive product', error: err })
    }
  }
  public async getProdByUser(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    try {
      const { Items } = await dynamoDbClient
        .scan({
          TableName: PROD_TABLE,
          FilterExpression: 'userId = :r',
          ExpressionAttributeValues: { ':r': req.params.userId },
        })
        .promise()
      return res.status(200).json(Items)
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not retreive product by "userId"', error: err })
    }
  }
  public async postNewProd(
    req: Request,
    res: Response
  ): Promise<void | Response> {
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
        message: 'Could not create product',
        error: err,
      })
    }
  }
  public async deleteProd(
    req: Request,
    res: Response
  ): Promise<void | Response> {
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
        .json({ message: 'Could not delete prod', error: err })
    }
  }
}
