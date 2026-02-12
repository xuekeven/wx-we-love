import { View, Text, ScrollView, Image, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useRef } from 'react'
import { get, post, del } from '../../utils/request'
import { MOODS } from './constants'
import PreviewBanner from '../../components/PreviewBanner'
import { PREVIEW } from '../../config/preview'
import { setPreviewMode, usePreviewMode } from '../../store/global'
import './list.scss'

interface CommentItem {
  id: number
  userId: number
  authorName: string
  content: string
  createdAt: string
}

interface DiaryEntry {
  id: string
  date: string
  moodId: string
  content: string
  userId: number
  authorName: string
  authorAvatar: string
  readByMatched: boolean
  comments: CommentItem[]
}

export default function MoodDiaryList() {
  const [list, setList] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [commentDiaryId, setCommentDiaryId] = useState<string | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const isPreview = usePreviewMode()
  const commentInputRef = useRef<any>(null)

  const loadList = async () => {
    if (!refreshing) setLoading(true)
    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        setPreviewMode(true)
        setList([
          {
            id: 'p1',
            date: '2024-11-08',
            moodId: 'happy',
            content: '今天一起散步，心情超级好。',
            userId: 1,
            authorName: '我',
            authorAvatar: '',
            readByMatched: false,
            comments: []
          }
        ])
        return
      }
      setPreviewMode(false)
      const res = await get('/api/mood-diary/all')
      const data = Array.isArray(res?.data) ? res.data : []
      setList(data.map((e) => ({ ...e, comments: e.comments || [] })))
    } catch (e) {
      setList([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadList()
  }

  useEffect(() => {
    loadList()
  }, [])

  const getMoodInfo = (moodId: string) => MOODS.find((m) => m.id === moodId) || { name: '', emoji: '' }

  const formatEntryDate = (dateStr: string) => {
    const parts = dateStr.split('-')
    if (parts.length !== 3) return { day: '', monthYear: '' }
    const [, m, d] = parts
    const y = parts[0]
    return { day: d, monthYear: `${m}月,${y}` }
  }

  const openCommentInput = (diaryId: string) => {
    if (isPreview) {
      Taro.showModal({
        title: '登录后使用',
        content: '登录后可评论心情日记，是否现在登录？',
        confirmText: '去登录',
        cancelText: '先看看',
        success: (res) => {
          if (res.confirm) Taro.navigateTo({ url: '/pages/login/index' })
        }
      })
      return
    }
    setCommentDiaryId(diaryId)
    setCommentInput('')
    setTimeout(() => {
      commentInputRef.current?.focus?.()
    }, 100)
  }

  const closeCommentInput = () => {
    setCommentDiaryId(null)
    setCommentInput('')
  }

  const submitComment = async () => {
    if (isPreview) {
      Taro.showModal({
        title: '登录后使用',
        content: '登录后可评论心情日记，是否现在登录？',
        confirmText: '去登录',
        cancelText: '先看看',
        success: (res) => {
          if (res.confirm) Taro.navigateTo({ url: '/pages/login/index' })
        }
      })
      return
    }
    const diaryId = commentDiaryId
    const content = commentInput.trim()
    if (!diaryId || !content) return
    setCommentSubmitting(true)
    try {
      await post('/api/mood-diary/comment', { diaryId, content })
      const res = await get('/api/mood-diary/comments', { diaryId })
      const comments = Array.isArray(res?.data) ? res.data : []
      setList((prev) =>
        prev.map((e) => (e.id === diaryId ? { ...e, comments } : e))
      )
      closeCommentInput()
      Taro.showToast({ title: '评论成功', icon: 'success' })
    } catch (_) {
      Taro.showToast({ title: '评论失败', icon: 'none' })
    } finally {
      setCommentSubmitting(false)
    }
  }

  const showEntryActions = (entry: DiaryEntry) => {
    if (isPreview) {
      Taro.showModal({
        title: '登录后使用',
        content: '登录后可编辑或删除日记，是否现在登录？',
        confirmText: '去登录',
        cancelText: '先看看',
        success: (res) => {
          if (res.confirm) Taro.navigateTo({ url: '/pages/login/index' })
        }
      })
      return
    }
    Taro.showActionSheet({
      itemList: ['修改', '删除', '取消'],
      success: (res) => {
        if (res.tapIndex === 0) {
          Taro.navigateTo({
            url: `/pages/mood-diary/write?date=${entry.date}&mood=${entry.moodId}`,
          })
        } else if (res.tapIndex === 1) {
          Taro.showModal({
            title: '确认删除',
            content: '确定要删除这条日记吗？',
            success: async (modalRes) => {
              if (modalRes.confirm) {
                try {
                  await del(`/api/mood-diary/${entry.id}`)
                  Taro.showToast({ title: '已删除', icon: 'success' })
                  loadList()
                } catch (_) {
                  Taro.showToast({ title: '删除失败', icon: 'none' })
                }
              }
            },
          })
        }
      },
    })
  }

  return (
    <View className='mood-diary-list-page'>
      {isPreview && (
        <PreviewBanner
          text={PREVIEW.moodDiaryList}
          buttonText={PREVIEW.loginButtonText}
          onLogin={() => Taro.navigateTo({ url: '/pages/login/index' })}
        />
      )}
      {loading ? (
        <View className='list-loading'>
          <Text className='list-loading-text'>加载中...</Text>
        </View>
      ) : list.length === 0 ? (
        <View className='list-empty'>
          <Text className='list-empty-text'>还没有日记，去日历里记录吧</Text>
        </View>
      ) : (
        <ScrollView
          scrollY
          className='list-scroll'
          refresherEnabled
          refresherTriggered={refreshing}
          onRefresherRefresh={onRefresh}
        >
          {list.map((entry, index) => {
            const mood = getMoodInfo(entry.moodId)
            const { day, monthYear } = formatEntryDate(entry.date)
            return (
              <View key={entry.id} className='list-item-wrap'>
                {index > 0 && <View className='list-item-wave' />}
                <View className='list-item'>
                  <View className='list-item-top'>
                    <View className='list-item-date'>
                      <Text className='list-item-day'>{day}</Text>
                      <Text className='list-item-month-year'>{monthYear}</Text>
                    </View>
                    {!entry.readByMatched && (
                      <View className='list-item-badge'>
                        <Text className='list-item-badge-text'>未读</Text>
                      </View>
                    )}
                  </View>
                  <View className='list-item-mood'>
                    <View className='list-item-mood-icon'>
                      <Text className='list-item-mood-emoji'>{mood.emoji}</Text>
                    </View>
                    <View className='list-item-mood-chip'>
                      <Text className='list-item-mood-name'>{mood.name}</Text>
                    </View>
                  </View>
                  {entry.content ? (
                    <Text className='list-item-content'>{entry.content}</Text>
                  ) : null}
                  <View className='list-item-author'>
                    {entry.authorAvatar ? (
                      <Image
                        className='list-item-avatar'
                        src={entry.authorAvatar}
                        mode='aspectFill'
                      />
                    ) : (
                      <View className='list-item-avatar list-item-avatar-placeholder'>
                        <Text className='list-item-avatar-text'>
                          {entry.authorName ? entry.authorName.slice(0, 1) : '?'}
                        </Text>
                      </View>
                    )}
                    <Text className='list-item-nickname'>{entry.authorName}</Text>
                    <View className='list-item-actions'>
                      <View
                        className='list-item-action-icon list-item-action-bubble'
                        onClick={() => openCommentInput(entry.id)}
                      >
                        <Text className='list-item-action-bubble-inner'>💬</Text>
                      </View>
                      <View
                        className='list-item-action-icon list-item-action-more'
                        onClick={() => showEntryActions(entry)}
                      >
                        <Text>⋯</Text>
                      </View>
                    </View>
                  </View>
                  {(entry.comments?.length ?? 0) > 0 && (
                    <View className='list-item-comments'>
                      <Text className='list-item-comments-title'>
                        评论{entry.comments.length}条
                      </Text>
                      {entry.comments.map((c) => (
                        <Text key={c.id} className='list-item-comment-row'>
                          <Text className='list-item-comment-meta'>{c.authorName}: </Text>
                          <Text className='list-item-comment-content'>{c.content} </Text>
                          <Text className='list-item-comment-meta'>{c.createdAt}</Text>
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}

      {commentDiaryId && !isPreview && (
        <View className='comment-input-wrap'>
          <Input
            ref={commentInputRef}
            className='comment-input'
            placeholder='输入评论...'
            value={commentInput}
            onInput={(e) => setCommentInput(e.detail.value)}
            focus
            confirmType='发送'
            onConfirm={submitComment}
          />
          <Button
            className='comment-send-btn'
            onClick={submitComment}
            disabled={commentSubmitting || !commentInput.trim()}
          >
            {commentSubmitting ? '发送中...' : '发送'}
          </Button>
        </View>
      )}
    </View>
  )
}
