const AWS = require("aws-sdk");
const express = require("express");

// routes
const users = require("./routes/users");
const prod = require("./routes/prod");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.json({ message: "listening through aws lambda" });
});

// define routes
app.use("/users", users);
app.use("/prod", prod);

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

module.exports = app;
