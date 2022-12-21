import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

const checkAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  const token = req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return res
      .status(401)
      .json({ message: 'There is no token, authorization denied' })
  }
  try {
    const decodedToken = jwt.decode(token)
    req.body.user = decodedToken
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid' })
  }
}

export { checkAuth }
