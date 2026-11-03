import http from './http'
import type {
  AdminStats,
  AiStats,
  AiTask,
  AuthResult,
  Category,
  CommentItem,
  ContentCard,
  ContentDetail,
  ContentQuery,
  City,
  InteractionStats,
  PageResult,
  PlanDetail,
  PlanGenerateResponse,
  PlanRequest,
  RecommendItem,
  TagCount,
  UserInfo
} from '@/types'

export const authApi = {
  login: (payload: { username: string; password: string }) =>
    http.post<AuthResult, AuthResult>('/user/login', payload),
  register: (payload: { username: string; password: string; nickname?: string }) =>
    http.post<AuthResult, AuthResult>('/user/register', payload),
  info: () => http.get<UserInfo, UserInfo>('/user/info'),
  update: (payload: { nickname?: string; avatar?: string }) =>
    http.put<UserInfo, UserInfo>('/user/info', payload)
}

export const contentApi = {
  list: (params: ContentQuery) => http.get<PageResult<ContentCard>, PageResult<ContentCard>>('/content/list', { params }),
  detail: (id: number | string) => http.get<ContentDetail, ContentDetail>(`/content/${id}`),
  related: (id: number | string, size = 6) =>
    http.get<ContentCard[], ContentCard[]>(`/content/${id}/related`, { params: { size } }),
  areas: () => http.get<string[], string[]>('/content/areas'),
  categories: () => http.get<Category[], Category[]>('/category/list'),
  hotTags: (limit = 12) => http.get<TagCount[], TagCount[]>('/tag/hot', { params: { limit } }),
  search: (params: ContentQuery) => http.get<PageResult<ContentCard>, PageResult<ContentCard>>('/search', { params }),
  hotKeywords: () => http.get<string[], string[]>('/search/hot')
}

export const recommendApi = {
  home: (size = 8) => http.get<RecommendItem[], RecommendItem[]>('/recommend/home', { params: { size } }),
  hot: (limit = 8) => http.get<RecommendItem[], RecommendItem[]>('/recommend/hot', { params: { limit } }),
  similar: (contentId: number | string, size = 6) =>
    http.get<RecommendItem[], RecommendItem[]>(`/recommend/similar/${contentId}`, { params: { size } })
}

export const cityApi = {
  list: () => http.get<City[], City[]>('/city/list')
}

export const planApi = {
  generate: (payload: PlanRequest) =>
    http.post<PlanGenerateResponse, PlanGenerateResponse>('/plan/generate', payload),
  detail: (planNo: string) => http.get<PlanDetail, PlanDetail>(`/plan/${planNo}`),
  retry: (planNo: string) => http.post<PlanDetail, PlanDetail>(`/plan/${planNo}/retry`)
}

export const interactionApi = {
  stats: (contentId: number | string) =>
    http.get<InteractionStats, InteractionStats>('/interaction/stats', { params: { contentId } }),
  favoriteAdd: (contentId: number) =>
    http.post<{ favorited: boolean; count: number }, { favorited: boolean; count: number }>('/favorite', { contentId }),
  favoriteRemove: (contentId: number) =>
    http.delete<{ favorited: boolean; count: number }, { favorited: boolean; count: number }>(`/favorite/${contentId}`),
  favoriteList: (page = 1, size = 12) =>
    http.get<PageResult<ContentCard>, PageResult<ContentCard>>('/favorite/list', { params: { page, size } }),
  likeAdd: (contentId: number) =>
    http.post<{ liked: boolean; count: number }, { liked: boolean; count: number }>('/like', { contentId }),
  likeRemove: (contentId: number) =>
    http.delete<{ liked: boolean; count: number }, { liked: boolean; count: number }>(`/like/${contentId}`),
  commentAdd: (payload: { contentId: number; content: string; parentId?: number }) =>
    http.post<CommentItem, CommentItem>('/comment', payload),
  commentList: (contentId: number, page = 1, size = 10) =>
    http.get<PageResult<CommentItem>, PageResult<CommentItem>>('/interaction/comment/list', {
      params: { contentId, page, size }
    }),
  commentMine: (page = 1, size = 10) =>
    http.get<PageResult<CommentItem>, PageResult<CommentItem>>('/interaction/comment/mine', { params: { page, size } }),
  commentDelete: (id: number) => http.delete<void, void>(`/comment/${id}`),
  rate: (contentId: number, score: number) =>
    http.post<{ avg: number; count: number; mine: number }, { avg: number; count: number; mine: number }>('/rate', {
      contentId,
      score
    }),
  rateSummary: (contentId: number) =>
    http.get<{ avg: number; count: number; mine: number | null }, { avg: number; count: number; mine: number | null }>(
      '/rate/summary',
      { params: { contentId } }
    )
}

export const adminApi = {
  contents: (params: ContentQuery) =>
    http.get<PageResult<ContentCard>, PageResult<ContentCard>>('/admin/content/list', { params }),
  contentDetail: (id: number) => http.get<ContentDetail, ContentDetail>(`/admin/content/${id}`),
  stats: () => http.get<AdminStats, AdminStats>('/admin/content/stats'),
  audit: (payload: { id: number; action: 'APPROVE' | 'REJECT'; remark?: string }) =>
    http.post<void, void>('/admin/content/audit', payload),
  remove: (id: number) => http.delete<void, void>(`/admin/content/${id}`)
}

export const aiApi = {
  createTask: (payload: { categoryCode: string; area?: string; count?: number; keywords?: string }) =>
    http.post<AiTask, AiTask>('/admin/ai/task', payload),
  tasks: (params: { page?: number; size?: number; status?: string }) =>
    http.get<PageResult<AiTask>, PageResult<AiTask>>('/admin/ai/task/list', { params }),
  task: (id: number) => http.get<AiTask, AiTask>(`/admin/ai/task/${id}`),
  stats: () => http.get<AiStats, AiStats>('/admin/ai/task/stats'),
  retry: (id: number) => http.post<AiTask, AiTask>(`/admin/ai/task/${id}/retry`)
}
