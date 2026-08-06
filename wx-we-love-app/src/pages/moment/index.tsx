import { View, Text, Image, Input, Textarea, Button, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState } from 'react'
import config from '../../config'
import type { ApiResponse } from '../../utils/request'
import { del, get, post } from '../../utils/request'
import PreviewBanner from '../../components/PreviewBanner'
import { PREVIEW } from '../../config/preview'
import { setPreviewMode, usePreviewMode } from '../../store/global'
import './index.scss'

interface MomentItem {
  id: string
  content: string
  imageUrl?: string | null
  location?: string | null
  occurredAt: string
  authorName: string
  authorAvatar?: string
  isBySelf: boolean
}

function formatMomentTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export default function Moment() {
  const [moments, setMoments] = useState<MomentItem[]>([])
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isPreview = usePreviewMode()

  useDidShow(() => {
    loadMoments()
  })

  const loadMoments = async () => {
    setLoading(true)
    try {
      if (!Taro.getStorageSync('token')) {
        setPreviewMode(true)
        setMoments([
          {
            id: 'preview-1',
            content: '下班后绕路去看了晚霞，风很舒服。',
            location: '江边步道',
            occurredAt: '2026-08-05T11:20:00.000Z',
            authorName: '小满',
            isBySelf: true
          }
        ])
        return
      }
      setPreviewMode(false)
      const response = await get<MomentItem[]>('/api/moments')
      setMoments(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('加载瞬间失败:', error)
      setMoments([])
    } finally {
      setLoading(false)
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
      setUploading(true)
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
      setUploading(false)
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
      await loadMoments()
      Taro.showToast({ title: '已记录', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: '记录失败，请重试', icon: 'none' })
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
          setMoments((current) => current.filter((item) => item.id !== id))
          Taro.showToast({ title: '已删除', icon: 'success' })
        } catch (error) {
          Taro.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    })
  }

  return (
    <View className='moment-page'>
      {isPreview && (
        <PreviewBanner
          text={PREVIEW.moment || '登录后记录只属于你们的瞬间'}
          buttonText={PREVIEW.loginButtonText}
          onLogin={() => Taro.navigateTo({ url: '/pages/login/index' })}
        />
      )}

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
        {imageUrl && (
          <View className='image-preview-wrap'>
            <Image className='image-preview' src={imageUrl} mode='aspectFill' />
            <View className='remove-image' onClick={() => setImageUrl('')}><Text>×</Text></View>
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
          <Button className='image-btn' loading={uploading} disabled={uploading} onClick={chooseImage}>
            {imageUrl ? '更换照片' : '添加照片'}
          </Button>
          <Button className='publish-btn' loading={submitting} disabled={submitting || uploading} onClick={submitMoment}>发布</Button>
        </View>
      </View>

      <ScrollView scrollY className='timeline'>
        {loading ? (
          <Text className='state-text'>加载中...</Text>
        ) : moments.length === 0 ? (
          <Text className='state-text'>还没有瞬间，从今天开始记录吧</Text>
        ) : moments.map((item) => (
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
      </ScrollView>
    </View>
  )
}
