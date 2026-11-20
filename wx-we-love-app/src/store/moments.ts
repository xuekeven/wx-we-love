import Taro from '@tarojs/taro'
import { get } from '../utils/request'

export interface MomentItem {
  id: string
  content: string
  imageUrl?: string | null
  location?: string | null
  occurredAt: string
  authorName: string
  authorAvatar?: string
  isBySelf: boolean
}

export interface MomentPage {
  items: MomentItem[]
  nextCursor: string | null
}

const FIRST_PAGE_SIZE = 3
const NEXT_PAGE_SIZE = 5
const FRESH_FOR_MS = 30_000

let cached: { token: string; page: MomentPage; fetchedAt: number } | null = null
let pending: { token: string; promise: Promise<MomentPage> } | null = null
let webviewPreloaded = false
let preloadedPhotos: string[] = []

export function readMomentFeed(token: string): MomentPage | null {
  return cached?.token === token ? cached.page : null
}

async function requestMomentPage(token: string, limit: number, cursor?: string): Promise<MomentPage> {
  const { success, data } = await get<MomentPage>(
    '/api/moments', cursor ? { limit, cursor } : { limit }, { token, silent: true }
  )
  if (!success || !data || !Array.isArray(data.items)
    || (data.nextCursor !== null && typeof data.nextCursor !== 'string')) {
    throw new Error('Invalid moments page')
  }
  return data
}

export function fetchMoreMoments(token: string, cursor: string): Promise<MomentPage> {
  return requestMomentPage(token, NEXT_PAGE_SIZE, cursor)
}

export function fetchMomentFeed(token: string, force = false): Promise<MomentPage> {
  if (!force && pending?.token === token) return pending.promise
  if (!force && cached?.token === token && Date.now() - cached.fetchedAt < FRESH_FOR_MS) {
    return Promise.resolve(cached.page)
  }

  const promise = requestMomentPage(token, FIRST_PAGE_SIZE)
    .then((page) => {
      if (pending?.promise === promise && token === Taro.getStorageSync<string>('token')) {
        cached = { token, page, fetchedAt: Date.now() }
      }
      return page
    })
    .then((page) => {
      if (pending?.promise === promise) pending = null
      return page
    }, (error) => {
      if (pending?.promise === promise) pending = null
      throw error
    })

  pending = { token, promise }
  return promise
}

export async function preloadMomentFeed(token: string) {
  const page = await fetchMomentFeed(token)

  Taro.nextTick(() => {
    const pages = Taro.getCurrentPages()
    const route = pages[pages.length - 1]?.route
    if (route !== 'pages/index/index' || token !== Taro.getStorageSync<string>('token')
      || cached?.page !== page) return

    if (!webviewPreloaded && Taro.canIUse('preloadWebview')) {
      webviewPreloaded = true
      void Taro.preloadWebview({}).catch(() => { webviewPreloaded = false })
    }

    if (!Taro.canIUse('preloadAssets')) return
    const photos = Array.from(new Set(page.items.slice(0, FIRST_PAGE_SIZE)
      .map(({ imageUrl }) => imageUrl)
      .filter((url): url is string => typeof url === 'string' && /^https:\/\//i.test(url))))
    const uncached = photos.filter((url) => !preloadedPhotos.includes(url))
    preloadedPhotos = photos
    if (!uncached.length) return

    void Taro.preloadAssets({ data: uncached.map((src) => ({ type: 'image', src })) })
      .catch(() => {
        if (preloadedPhotos === photos) {
          preloadedPhotos = photos.filter((url) => !uncached.includes(url))
        }
      })
  })
}

export function removeCachedMoment(token: string, id: string) {
  if (pending?.token === token) pending = null
  if (cached?.token === token) {
    cached = {
      ...cached,
      fetchedAt: 0,
      page: { ...cached.page, items: cached.page.items.filter((item) => item.id !== id) }
    }
  }
}

export function clearMomentFeed() {
  cached = null
  pending = null
  preloadedPhotos = []
}
