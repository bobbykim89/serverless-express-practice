import express from 'express'
import { check } from 'express-validator'

// import controller
import { ProdController } from './prod.controller'
// import middleware
import { Auth, upload } from '@/middleware'

const router = express.Router()
const prodController = new ProdController()

// get all prod
router.get('/', prodController.getAllProd)

router.get('/:prodId', prodController.getProdById)

// get prod by user
router.get('/user/:userId', prodController.getProdByUser)

router.post(
  '/',
  Auth,
  upload.single('image'),
  [check('name').isString().not().isEmpty(), check('description').isString()],
  prodController.postNewProd
)

router.delete('/:prodId', Auth, prodController.deleteProd)

export { router as ProdRouter }
