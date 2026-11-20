import { View, Text, Image, Input, Textarea, Button } from '@tarojs/components'
import Taro, { useDidShow, useReachBottom } from '@tarojs/taro'
import { useRef, useState } from 'react'
import config from '../../config'
import type { ApiResponse } from '../../utils/request'
import { ApiError, del, post } from '../../utils/request'
import PreviewBanner from '../../components/PreviewBanner'
import { setPreviewMode } from '../../store/global'
import { fetchMomentFeed, fetchMoreMoments, readMomentFeed, removeCachedMoment } from '../../store/moments'
import type { MomentItem, MomentPage } from '../../store/moments'
import './index.scss'

const PREVIEW_MOMENTS: MomentItem[] = [
  {
    id: 'preview-1',
    content: '下班后绕路去看了晚霞，风很舒服。',
    location: '江边步道',
    occurredAt: '2026-08-05T11:20:00.000Z',
    authorName: '小满',
    isBySelf: true
  }
]

interface MomentFeed {
  token: string
  page: MomentPage | null
  loadedMore: boolean
}

function refreshFirstPage(current: MomentFeed | null, token: string, page: MomentPage): MomentFeed {
  if (current?.token === token && current.page === page) return current

  // Keep the previously loaded tail if the new first page still joins it.
  const lastItem = page.items[page.items.length - 1]
  if (current?.token === token && current.loadedMore && current.page && page.nextCursor && lastItem) {
    const index = current.page.items.findIndex((item) => item.id === lastItem.id)
    if (index >= 0) {
      const tail = current.page.items.slice(index + 1)
      if (tail.length) {
        return {
          token,
          page: { items: [...page.items, ...tail], nextCursor: current.page.nextCursor },
          loadedMore: true
        }
      }
    }
  }
  return { token, page, loadedMore: false }
}

function readToken() {
  return Taro.getStorageSync<string>('token') || ''
}

function formatMomentTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function Moment() {
  const [token, setToken] = useState(readToken)
  const [feed, setFeed] = useState<MomentFeed | null>(() => {
    const page = readMomentFeed(token)
    return page ? { token, page, loadedMore: false } : null
  })
  const loadVersion = useRef(0)
  const pendingMore = useRef<symbol | null>(null)
  const [moreStatus, setMoreStatus] = useState<'idle' | 'loading' | 'failed'>('idle')
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [pendingImagePath, setPendingImagePath] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const isPreview = !token
  const currentFeed = feed?.token === token ? feed : null
  const moments = isPreview ? PREVIEW_MOMENTS : currentFeed?.page?.items
  const nextCursor = currentFeed?.page?.nextCursor
  const uploading = Boolean(pendingImagePath)
  const previewImage = pendingImagePath || imageUrl

  useDidShow(() => {
    loadMoments()
  })

  useReachBottom(() => {
    if (moreStatus === 'idle') void loadMore()
  })

  const loadMoments = async (force = false) => {
    const currentToken = readToken()
    const version = ++loadVersion.current
    if (currentToken !== token) {
      pendingMore.current = null
      setMoreStatus('idle')
      setToken(currentToken)
    }
    setPreviewMode(!currentToken)
    if (!currentToken) {
      setFeed(null)
      return
    }

    const showFirstPage = (page: MomentPage) => {
      setFeed((current) => refreshFirstPage(current, currentToken, page))
    }
    const cachedPage = readMomentFeed(currentToken)
    if (cachedPage) {
      setFeed((current) => current?.token === currentToken && current.page
        ? current
        : { token: currentToken, page: cachedPage, loadedMore: false })
    }

    const isCurrentRequest = () => version === loadVersion.current && currentToken === readToken()
    try {
      const page = await fetchMomentFeed(currentToken, force)
      if (isCurrentRequest()) showFirstPage(page)
    } catch (error) {
      if (!isCurrentRequest()) return
      console.error('加载瞬间失败:', error)
      setFeed((current) => current?.token === currentToken
        ? current
        : { token: currentToken, page: null, loadedMore: false })
    }
  }

  const loadMore = async () => {
    if (!token || token !== readToken() || !nextCursor || pendingMore.current) return
    const request = Symbol()
    pendingMore.current = request
    setMoreStatus('loading')
    try {
      const page = await fetchMoreMoments(token, nextCursor)
      if (pendingMore.current !== request || token !== readToken()) return
      setFeed((current) => {
        if (current?.token !== token || current.page?.nextCursor !== nextCursor) return current
        const ids = new Set(current.page.items.map((item) => item.id))
        return {
          token,
          page: { items: [...current.page.items, ...page.items.filter((item) => !ids.has(item.id))], nextCursor: page.nextCursor },
          loadedMore: true
        }
      })
      setMoreStatus('idle')
    } catch (error) {
      if (pendingMore.current === request && token === readToken()) {
        console.error('加载更多瞬间失败:', error)
        setMoreStatus('failed')
      }
    } finally {
      if (pendingMore.current === request) pendingMore.current = null
    }
  }

  const requireLogin = () => {
    Taro.showModal({
      title: '登录后使用',
      content: '登录后可记录你们的瞬间，是否现在登录？',
      confirmText: '去登录',
      cancelText: '先看看',
      success: (result) => {
        if (result.confirm) Taro.navigateTo({ url: '/pages/login/index' })
      }
    })
  }

  const chooseImage = async () => {
    if (isPreview) return requireLogin()
    try {
      const selected = await Taro.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] })
      const filePath = selected.tempFilePaths?.[0]
      if (!filePath) return
      setPendingImagePath(filePath)
      const token = Taro.getStorageSync<string>('token')
      const upload = await Taro.uploadFile({
        url: `${config.apiBaseUrl}/api/upload`,
        filePath,
        name: 'file',
        header: { Authorization: `Bearer ${token}` }
      })
      let body: ApiResponse<{ url: string }>
      try {
        body = typeof upload.data === 'string' ? JSON.parse(upload.data) : upload.data
      } catch {
        throw new Error('图片上传响应无效')
      }
      if (upload.statusCode < 200 || upload.statusCode >= 300 || !body.success || !body.data?.url) {
        throw new Error(body.message || '图片上传失败')
      }
      setImageUrl(body.data.url)
    } catch (error) {
      const errMsg = (error as { errMsg?: string }).errMsg || ''
      if (!errMsg.includes('cancel')) Taro.showToast({ title: '图片上传失败', icon: 'none' })
    } finally {
      setPendingImagePath('')
    }
  }

  const submitMoment = async () => {
    if (isPreview) return requireLogin()
    if (!content.trim()) {
      Taro.showToast({ title: '写点想记录的内容吧', icon: 'none' })
      return
    }
    if (uploading) {
      Taro.showToast({ title: '图片还在上传', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      const response = await post<MomentItem>('/api/moments', {
        content: content.trim(),
        imageUrl: imageUrl || null,
        location: location.trim() || null,
        occurredAt: new Date().toISOString()
      })
      if (!response.data) throw new Error('Missing moment response')
      setContent('')
      setLocation('')
      setImageUrl('')
      await loadMoments(true)
      Taro.showToast({ title: '已记录', icon: 'success' })
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 410) {
        setImageUrl('')
        Taro.showToast({ title: error.message, icon: 'none' })
      } else {
        Taro.showToast({ title: '记录失败，请重试', icon: 'none' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const deleteMoment = (id: string) => {
    Taro.showModal({
      title: '删除瞬间',
      content: '删除后无法恢复，确定继续吗？',
      confirmColor: '#D94F5F',
      success: async (result) => {
        if (!result.confirm) return
        try {
          await del(`/api/moments/${id}`)
          if (token !== readToken()) return
          ++loadVersion.current
          pendingMore.current = null
          setMoreStatus('idle')
          removeCachedMoment(token, id)
          setFeed((current) => current?.token === token && current.page
            ? { ...current, page: { ...current.page, items: current.page.items.filter((item) => item.id !== id) } }
            : current)
          Taro.showToast({ title: '已删除', icon: 'success' })
        } catch (error) {
          Taro.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  }

  return (
    <View className='moment-page'>
      <PreviewBanner visible={isPreview} />

      <View className='moment-header'>
        <Text className='moment-title'>瞬间</Text>
        <Text className='moment-subtitle'>一起收藏想记住的小事</Text>
      </View>

      <View className='composer'>
        <Textarea
          className='composer-input'
          value={content}
          maxlength={1000}
          placeholder='今天发生了什么？'
          onInput={(event) => setContent(event.detail.value)}
        />
        {previewImage && (
          <View className='image-preview-wrap'>
            <Image className='image-preview' src={previewImage} mode='aspectFill' />
            {!uploading && !submitting && (
              <Button className='remove-image' aria-label='移除照片' onClick={() => setImageUrl('')}>
                <Text aria-hidden>×</Text>
              </Button>
            )}
          </View>
        )}
        <Input
          className='location-input'
          value={location}
          maxlength={120}
          placeholder='添加位置（选填）'
          onInput={(event) => setLocation(event.detail.value)}
        />
        <View className='composer-actions'>
          <Button className='image-btn' disabled={submitting || uploading} onClick={chooseImage}>
            {uploading && <View className='action-spinner' aria-hidden />}
            <Text>{uploading ? '上传中' : imageUrl ? '更换照片' : '添加照片'}</Text>
          </Button>
          <Button className='publish-btn' disabled={submitting || uploading} onClick={submitMoment}>
            {submitting && <View className='action-spinner' aria-hidden />}
            <Text>{submitting ? '发布中' : '发布'}</Text>
          </Button>
        </View>
      </View>

      <View className='timeline'>
        {!isPreview && currentFeed?.page === null && (
          <Button className='state-retry' onClick={() => loadMoments()}>加载失败，点击重试</Button>
        )}
        {moments?.length === 0 && !nextCursor && (
          <Text className='state-text'>还没有瞬间，从今天开始记录吧</Text>
        )}
        {moments?.map((item) => (
          <View key={item.id} className='timeline-item'>
            <View className='timeline-meta'>
              <View className='author'>
                {item.authorAvatar ? <Image className='author-avatar' src={item.authorAvatar} mode='aspectFill' /> : <View className='author-avatar placeholder' />}
                <Text className='author-name'>{item.authorName}</Text>
              </View>
              {item.isBySelf && <Text className='delete-action' onClick={() => deleteMoment(item.id)}>删除</Text>}
            </View>
            <Text className='timeline-content'>{item.content}</Text>
            {item.imageUrl && <Image className='timeline-image' src={item.imageUrl} mode='widthFix' />}
            <View className='timeline-footer'>
              <Text>{formatMomentTime(item.occurredAt)}</Text>
              {item.location && <Text> · {item.location}</Text>}
            </View>
          </View>
        ))}
        {!isPreview && nextCursor && (
          <Button className='state-retry' disabled={moreStatus === 'loading'} onClick={loadMore}>
            {moreStatus === 'loading' ? '加载中…' : moreStatus === 'failed' ? '加载失败，点击重试' : '加载更多'}
          </Button>
        )}
      </View>
    </View>
  )
}
