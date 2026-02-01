/**
 * 全局用户相关数据，供首页、我的页等共享
 * /api/user/info 只请求一次并缓存，各页从缓存读取；编辑资料后同步更新缓存
 */

import { get } from '../utils/request'

/** /api/user/info 返回的 data 结构 */
export interface UserInfoData {
  id?: number
  openId?: string
  phone?: string
  matchCode?: string
  isMatched?: boolean
  matchedUserId?: number | null
  currentName?: string
  currentAvatar?: string
  matchedName?: string
  matchedAvatar?: string
  matchedUser?: { id: number } | null
  loveDate?: string | null
  functionOrder?: Record<string, number>
}

let userInfoCache: UserInfoData | null = null
let fetchPromise: Promise<UserInfoData | null> | null = null

/** 从缓存读取，不发起请求 */
export function getUserInfo(): UserInfoData | null {
  return userInfoCache
}

/**
 * 拉取用户信息：有缓存则直接返回，否则请求一次并缓存（并发调用共用一个请求）
 * @param forceRefresh 为 true 时忽略缓存，强制请求接口
 */
export async function fetchUserInfo(forceRefresh?: boolean): Promise<UserInfoData | null> {
  if (forceRefresh) {
    userInfoCache = null
    fetchPromise = null
  }
  if (userInfoCache) return userInfoCache
  if (fetchPromise) return fetchPromise
  fetchPromise = (async () => {
    try {
      const res = await get('/api/user/info')
      if (res && res.success && res.data) {
        userInfoCache = res.data
        return userInfoCache
      }
      return null
    } catch (e) {
      fetchPromise = null
      throw e
    } finally {
      fetchPromise = null
    }
  })()
  return fetchPromise
}

/** 编辑资料等本地更新后，合并到缓存，避免其他页读到旧数据 */
export function setUserInfoPartial(partial: Partial<UserInfoData>) {
  if (!userInfoCache) userInfoCache = {}
  userInfoCache = { ...userInfoCache, ...partial }
}

/** 兼容旧用法：从缓存取恋爱纪念日 */
export function getLoveDate(): string | null | undefined {
  return userInfoCache?.loveDate
}

/** 兼容旧用法：从缓存取情侣名字 */
export function getCoupleNames(): { name1: string; name2: string } | undefined {
  if (!userInfoCache) return undefined
  return {
    name1: userInfoCache.currentName || '张三',
    name2: userInfoCache.matchedName || '李四'
  }
}

/** 兼容旧用法：一次性设置多项（由 fetchUserInfo 写入后已有，一般无需单独调） */
export function setUserData(data: Partial<Pick<UserInfoData, 'loveDate'>> & { coupleNames?: { name1: string; name2: string } }) {
  if (!userInfoCache) userInfoCache = {}
  if (data.loveDate !== undefined) userInfoCache.loveDate = data.loveDate
  if (data.coupleNames) {
    userInfoCache.currentName = data.coupleNames.name1
    userInfoCache.matchedName = data.coupleNames.name2
  }
}

/** 退出登录时清空缓存 */
export function clearUserData() {
  userInfoCache = null
  fetchPromise = null
}
