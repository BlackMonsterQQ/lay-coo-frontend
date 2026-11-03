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

export interface City {
  id: number
  code: string
  name: string
  province: string
  country: string
  longitude: number
  latitude: number
  hasContent: number
  enabled: number
  sort: number
}

export interface PlanRequest {
  cityCode: string
  originCityCode: string
  transportPreference?: string
  startDate: string
  endDate: string
  preferences: string[]
  extraNote?: string
}

export interface PlanGenerateResponse {
  planNo: string
  status: string
  dayCount: number
  nights: number
}

export interface PlanTimelineItem {
  time: string
  departureTime?: string
  arrivalTime?: string
  from?: string
  transport?: string
  travelMinutes?: number
  durationMinutes: number
  type: string
  title: string
  area?: string
  address?: string
  description: string
  tips?: string
  sourceContentId?: number
}

export interface PlanFood {
  name: string
  reason?: string
  priceRange?: string
  sourceContentId?: number
}

export interface PlanTransport {
  from: string
  to: string
  method: string
  duration: string
  tip?: string
}

export interface PlanDay {
  day: number
  date: string
  theme: string
  summary?: string
  startTime?: string
  endTime?: string
  startPoint?: string
  routeSummary?: string
  timeline: PlanTimelineItem[]
  food?: PlanFood[]
  transport?: PlanTransport[]
}

export interface PlanBudgetItem {
  item: string
  amount: string
}

export interface PlanTransportOption {
  type: string
  label: string
  note?: string
}

export interface PlanTransportLeg {
  date: string
  mode: 'TRAIN' | 'FLIGHT' | 'MIXED' | string
  title: string
  duration: string
  departureWindow: string
  arrivalWindow: string
  options: PlanTransportOption[]
  tip?: string
}

export interface IntercityTransport {
  outbound: PlanTransportLeg
  return: PlanTransportLeg
  note?: string
}

export interface DrivingPlan {
  route: string
  distance: string
  duration: string
  tolls?: string
  fuel?: string
  parking: string
  restStops: string[]
  tips?: string[]
}

export interface TravelPlan {
  title: string
  summary: string
  city: string
  startDate: string
  endDate: string
  dayCount: number
  preferences: string[]
  intercityTransport?: IntercityTransport
  driving?: DrivingPlan
  days: PlanDay[]
  budget?: {
    level?: string
    breakdown?: PlanBudgetItem[]
  }
  rainPlan?: string
  packingTips?: string[]
  warnings?: string[]
}

export interface PlanSummary {
  planNo: string
  city: string
  cityCode: string
  originCity?: string
  originCityCode?: string
  startDate: string
  endDate: string
  dayCount: number
  nights: number
  status: string
  title?: string
  summary?: string
  transportPreference?: string
  model?: string
  createTime?: string
}

export interface PlanDetail {
  planNo: string
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | string
  city: string
  cityCode: string
  originCity?: string
  originCityCode?: string
  transportPreference?: string
  startDate: string
  endDate: string
  dayCount: number
  nights: number
  preferences: string[]
  title?: string
  summary?: string
  plan: TravelPlan | null
  error?: string
  progress: number
  model?: string
  createTime?: string
}
