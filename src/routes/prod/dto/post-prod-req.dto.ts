export interface PostProdReq {
  prodId: string
  name: string
  description?: string
  userId: string
  createdAt: number
  imageId?: string
  originalImage?: string
  thumbUrl?: string
  imageUrl?: string
}
