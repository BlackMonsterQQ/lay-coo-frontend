export function formatCount(value?: number | null): string {
  if (value === null || value === undefined) {
    return '0'
  }
  if (value >= 10000) {
    const wan = value / 10000
    return `${wan >= 10 ? Math.round(wan) : wan.toFixed(1).replace(/\.0$/, '')}万`
  }
  return String(value)
}

export function formatDate(value?: string | null): string {
  if (!value) {
    return ''
  }
  return value.replace('T', ' ').slice(0, 16)
}

export function formatDay(value?: string | null): string {
  if (!value) {
    return ''
  }
  return value.slice(0, 10)
}

export function formatRating(value?: number | null): string {
  if (!value) {
    return '暂无评分'
  }
  return Number(value).toFixed(1)
}

export function coverClass(code?: string | null): string {
  return `cover--${(code || 'SPOT').toLowerCase()}`
}

export function plainText(value?: string | null): string {
  return (value || '').replace(/[#>*`]/g, '').replace(/\s+/g, ' ').trim()
}

export function statusText(status?: string): string {
  switch (status) {
    case 'PUBLISHED':
      return '已发布'
    case 'PENDING':
      return '待审核'
    case 'REJECTED':
      return '未通过'
    case 'DRAFT':
      return '草稿'
    default:
      return status || '未知'
  }
}

export function taskStatusText(status?: string): string {
  switch (status) {
    case 'PENDING':
      return '排队中'
    case 'RUNNING':
      return '生成中'
    case 'SUCCESS':
      return '已完成'
    case 'FAILED':
      return '失败'
    default:
      return status || '未知'
  }
}

export function categoryName(code?: string | null): string {
  const map: Record<string, string> = {
    FOOD: '餐饮美食',
    STAY: '住宿美宿',
    PLAY: '休闲娱乐',
    SHOP: '购物逛街',
    SPOT: '景点地标',
    HERITAGE: '古迹遗址',
    INTANGIBLE: '非遗传承',
    FOLK: '民俗风物',
    FIGURE: '历史人物'
  }
  return map[code || ''] || '本地文旅'
}

export function categoryChar(code?: string | null): string {
  const map: Record<string, string> = {
    FOOD: '味',
    STAY: '宿',
    PLAY: '乐',
    SHOP: '购',
    SPOT: '景',
    HERITAGE: '迹',
    INTANGIBLE: '艺',
    FOLK: '俗',
    FIGURE: '史'
  }
  return map[code || ''] || '岚'
}
