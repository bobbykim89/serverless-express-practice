import AWS from 'aws-sdk'
import { Request, Response } from 'express'
import { validationResult } from 'express-validator'

// import dto
import type { PostUserReq, PatchUserReq } from './dto'

const USERS_TABLE = process.env.USERS_TABLE as string
const USER_POOL_ID = process.env.USER_POOL_ID as string
const dynamoDbClient = new AWS.DynamoDB.DocumentClient()
const cognito = new AWS.CognitoIdentityServiceProvider()

export class UsersController {
  public async getAllUser(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    try {
      const { Items } = await dynamoDbClient
        .scan({
          TableName: USERS_TABLE,
        })
        .promise()
      return res.status(200).json({
        users: Items,
      })
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not retrieve table', error: err })
    }
  }
  public async getUserById(
    req: Request,
    res: Response
  ): Promise<void | Response> {
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
        return res.status(200).json(Item)
      } else {
        return res
          .status(404)
          .json({ message: 'Could not find user with provided "userId"' })
      }
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not retreive user', error: err })
    }
  }
  public async postNewUser(
    req: Request,
    res: Response
  ): Promise<void | Response> {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    const { name, email, password } = req.body

    try {
      const { User } = await cognito
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
      if (User) {
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
      return res.status(200).json({ ...User, ...dataObject })
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not create user', error: err })
    }
  }
  public async patchUserProfile(
    req: Request,
    res: Response
  ): Promise<void | Response> {
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
          .json({ message: 'Could not find user with provided "userId"' })
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
      return res.status(200).json({ ...dataObject, userId: req.params.userId })
    } catch (err) {
      res.status(500).json({ message: 'Could not update user', error: err })
    }
  }
  public async deleteUser(
    req: Request,
    res: Response
  ): Promise<void | Response> {
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
      return res.status(200).json({ message: 'Deleted the user' })
    } catch (err) {
      return res
        .status(500)
        .json({ message: 'Could not delete user', error: err })
    }
  }
}
