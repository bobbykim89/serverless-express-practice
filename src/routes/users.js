const AWS = require("aws-sdk");
const express = require("express");
const { check, validationResult } = require("express-validator");

const router = express.Router();
const USERS_TABLE = process.env.USERS_TABLE;
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

router.get("/", async (req, res) => {
  try {
    const { Items } = await dynamoDbClient
      .scan({
        TableName: USERS_TABLE,
      })
      .promise();
    res.json({
      users: Items,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not retrieve table", message: err });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const { Item } = await dynamoDbClient
      .get({
        TableName: USERS_TABLE,
        Key: {
          userId: req.params.userId,
        },
      })
      .promise();
    if (Item) {
      const { userId, name } = Item;
      res.json({ userId, name });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }
  } catch (err) {
    res.status(500).json({ error: "Could not retreive user", message: err });
  }
});

router.post(
  "/",
  [
    check("userId").isString().not().isEmpty(),
    check("name").isString().not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { userId, name } = req.body;
    try {
      await dynamoDbClient
        .put({
          TableName: USERS_TABLE,
          Item: { userId, name },
        })
        .promise();
      res.json({ userId, name });
    } catch (err) {
      res.status(500).json({ error: "Could not create user", message: err });
    }
  }
);

router.patch("/:userId", async (req, res) => {
  try {
    const { Item } = await dynamoDbClient
      .get({
        TableName: USERS_TABLE,
        Key: {
          userId: req.params.userId,
        },
      })
      .promise();
    if (!Item) {
      return res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }

    const itemKeys = Object.keys(req.body).filter((key) => key !== "userId");
    const params = {
      TableName: USERS_TABLE,
      Key: {
        userId: req.params.userId,
      },
      UpdateExpression: `SET ${itemKeys
        .map((key, index) => `#field${index} = :value${index}`)
        .join(", ")}`,
      ExpressionAttributeNames: itemKeys.reduce(
        (accumulator, key, index) => ({
          ...accumulator,
          [`#field${index}`]: key,
        }),
        {}
      ),
      ExpressionAttributeValues: itemKeys.reduce(
        (accumulator, key, index) => ({
          ...accumulator,
          [`:value${index}`]: req.body[key],
        }),
        {}
      ),
      ReturnValues: "ALL_NEW",
    };
    await dynamoDbClient.update(params).promise();
    res.json({ ...req.body });
  } catch (err) {
    res.status(500).json({ error: "Could not update user", message: err });
  }
});

module.exports = router;
