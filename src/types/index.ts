export interface ApiResponse<T> {
  code: number
  msg: string
  data: T
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface Category {
  id: number
  name: string
  code: string
  type: 'LIFE' | 'HUMANITY'
  icon: string
  sort: number
  description: string
}

export interface ContentCard {
  id: number
  title: string
  summary: string
  categoryId: number
  categoryName: string
  categoryCode: string
  categoryType: string
  categoryIcon: string
  area: string
  address: string
  coverDesc: string
  tags: string[]
  source: string
  status: string
  viewCount: number
  favoriteCount: number
  likeCount: number
  commentCount: number
  rating: number
  ratingCount: number
  publishTime: string | null
  createTime: string | null
}

export interface ContentDetail extends ContentCard {
  body: string
  highlights: string[]
  tips: string
  openingHours: string
  priceRange: string
  auditRemark?: string | null
  aiTaskId?: number | null
}

export interface RecommendItem {
  content: ContentCard
  reason: string
  score: number
  scene: string
}

export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar: string
  role: string
  createTime: string
}

export interface AuthResult {
  token: string
  user: UserInfo
}

export interface InteractionStats {
  favoriteCount: number
  likeCount: number
  commentCount: number
  favorited: boolean
  liked: boolean
  rating: number
  ratingCount: number
  myRating: number | null
}

export interface CommentItem {
  id: number
  userId: number
  nickname: string
  avatar: string
  contentId: number
  contentTitle?: string
  parentId: number
  content: string
  createTime: string
  mine: boolean
  deletable: boolean
}

export interface AiTask {
  id: number
  categoryCode: string
  area: string
  targetCount: number
  keywords: string
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | string
  model: string
  prompt?: string
  result?: string
  error?: string
  costTokens: number
  createTime: string
  updateTime: string
}

export interface AdminStats {
  total: number
  published: number
  pending: number
  rejected: number
  totalViews: number
  byCategory: { name: string; code: string; count: number }[]
}

export interface AiStats {
  total: number
  pending: number
  running: number
  success: number
  failed: number
  costTokens: number
  model: string
  llmEnabled: boolean
  provider: string
}

export interface TagCount {
  id: number
  name: string
  count: number
}

export interface ContentQuery {
  categoryId?: number
  categoryCode?: string
  type?: string
  area?: string
  tag?: string
  keyword?: string
  sort?: string
  status?: string
  source?: string
  page?: number
  size?: number
}
