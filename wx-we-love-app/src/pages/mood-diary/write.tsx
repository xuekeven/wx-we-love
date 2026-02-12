import { View, Text, Textarea, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get, post } from '../../utils/request'
import { MOODS } from './constants'
import PreviewBanner from '../../components/PreviewBanner'
import { PREVIEW } from '../../config/preview'
import { setPreviewMode, usePreviewMode } from '../../store/global'
import './write.scss'

export default function MoodDiaryWrite() {
  const [dateStr, setDateStr] = useState('')
  const [moodId, setMoodId] = useState('')
  const [content, setContent] = useState('')
  const [dateDisplay, setDateDisplay] = useState({ day: '', monthYear: '' })
  const [moodInfo, setMoodInfo] = useState<{ name: string; emoji: string } | null>(null)
  const isPreview = usePreviewMode()

  useEffect(() => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      setPreviewMode(true)
    } else {
      setPreviewMode(false)
    }
    const router = Taro.getCurrentInstance().router
    const params = (router?.params || {}) as { date?: string; mood?: string }
    const d = params.date || ''
    const m = params.mood || ''
    setDateStr(d)
    setMoodId(m)
    if (d) {
      const parts = d.split('-').map(Number)
      if (parts.length >= 3) {
        const [y, mo, day] = parts
        setDateDisplay({
          day: String(day),
          monthYear: `${mo}月, ${y}`,
        })
      } else {
        const now = new Date()
        setDateDisplay({
          day: String(now.getDate()),
          monthYear: `${now.getMonth() + 1}月, ${now.getFullYear()}`,
        })
      }
    } else {
      const now = new Date()
      setDateDisplay({
        day: String(now.getDate()),
        monthYear: `${now.getMonth() + 1}月, ${now.getFullYear()}`,
      })
    }
    const mood = MOODS.find((x) => x.id === m)
    if (mood) setMoodInfo({ name: mood.name, emoji: mood.emoji })
  }, [])

  useEffect(() => {
    if (!dateStr || isPreview) return
    const fetchEntry = async () => {
      try {
        const res = await get('/api/mood-diary/entry', { date: dateStr })
        if (res?.success && res?.data?.content != null) {
          setContent(res.data.content)
        }
      } catch (_) {}
    }
    fetchEntry()
  }, [dateStr])

  const [saving, setSaving] = useState(false)

  const handleComplete = async () => {
    if (isPreview) {
      Taro.showModal({
        title: '登录后使用',
        content: '登录后可记录心情日记，是否现在登录？',
        confirmText: '去登录',
        cancelText: '先看看',
        success: (res) => {
          if (res.confirm) Taro.navigateTo({ url: '/pages/login/index' })
        }
      })
      return
    }
    if (!dateStr || !moodId) {
      Taro.showToast({ title: '请选择日期和心情', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      await post('/api/mood-diary', {
        date: dateStr,
        moodId,
        content: content.trim() || undefined
      })
      Taro.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 1500)
    } catch (e) {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    Taro.navigateBack()
  }

  return (
    <View className='write-page'>
      {isPreview && (
        <PreviewBanner
          className='preview-banner-inset'
          text={PREVIEW.moodDiaryWrite}
          buttonText={PREVIEW.loginButtonText}
          onLogin={() => Taro.navigateTo({ url: '/pages/login/index' })}
        />
      )}
      <View className='write-content'>
        <View className='write-date-row'>
          <Text className='write-date-day'>{dateDisplay.day}</Text>
          <Text className='write-date-rest'> / {dateDisplay.monthYear}</Text>
        </View>
        {moodInfo && (
          <View className='write-mood-row'>
            <View className='write-mood-icon'>
              <Text className='write-mood-emoji'>{moodInfo.emoji}</Text>
            </View>
            <View className='write-mood-chip'>
              <Text className='write-mood-name'>{moodInfo.name}</Text>
            </View>
          </View>
        )}
        <Text className='write-placeholder'>记录详细内容吧，将成为珍贵的回忆哟~</Text>
        <Textarea
          className='write-textarea'
          placeholder=''
          value={content}
          onInput={(e) => setContent(e.detail.value)}
          placeholderClass='write-textarea-placeholder'
          autoHeight
          disabled={isPreview}
        />
      </View>
      <View className='write-actions'>
        <Button className='write-cancel-btn' onClick={handleCancel} disabled={saving}>
          取消
        </Button>
        <Button className='write-complete-btn' onClick={handleComplete} disabled={saving || isPreview}>
          {saving ? '保存中...' : '完成'}
        </Button>
      </View>
    </View>
  )
}
