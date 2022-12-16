const AWS = require("aws-sdk");
const express = require("express");
const { check, validationResult } = require("express-validator");

const router = express.Router();
const PROD_TABLE = process.env.PROD_TABLE;
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

router.get("/", async (req, res) => {
  try {
    const { Items } = await dynamoDbClient
      .scan({
        TableName: PROD_TABLE,
      })
      .promise();
    res.json({
      products: Items,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not retrieve table", message: err });
  }
});

router.get("/:prodId", async (req, res) => {
  try {
    const { Item } = await dynamoDbClient
      .get({
        TableName: PROD_TABLE,
        Key: {
          userId: req.params.prodId,
        },
      })
      .promise();
    if (Item) {
      const { prodId, name } = Item;
      res.json({ prodId, name });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find product with provided "prodId"' });
    }
  } catch (err) {
    res.status(500).json({ error: "Could not retreive product", message: err });
  }
});

router.post(
  "/",
  [
    check("prodId").isString().not().isEmpty(),
    check("name").isString().not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { prodId, name } = req.body;
    try {
      await dynamoDbClient
        .put({
          TableName: PROD_TABLE,
          Item: {
            prodId,
            name,
          },
        })
        .promise();
      res.json({ prodId, name });
    } catch (err) {
      res.status(500).json({ error: "Could not create product" });
    }
  }
);

module.exports = router;
