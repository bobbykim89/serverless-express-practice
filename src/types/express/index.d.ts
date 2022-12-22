import type { UserType } from '@/types/custom'

export {}

declare global {
  namespace Express {
    export interface Request {
      user?: UserType | any
    }
  }
}
