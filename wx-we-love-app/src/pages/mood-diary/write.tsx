import { View, Text, Textarea, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { post } from '../../utils/request'
import { MOODS } from './constants'
import './write.scss'

export default function MoodDiaryWrite() {
  const [topSafeHeight, setTopSafeHeight] = useState(44)
  const [dateStr, setDateStr] = useState('')
  const [moodId, setMoodId] = useState('')
  const [content, setContent] = useState('')
  const [dateDisplay, setDateDisplay] = useState({ day: '', monthYear: '' })
  const [moodInfo, setMoodInfo] = useState<{ name: string; emoji: string } | null>(null)

  useEffect(() => {
    const sys = Taro.getSystemInfoSync() as any
    const safeTop = sys.safeArea?.top ?? sys.safeAreaInsets?.top
    const statusBar = sys.statusBarHeight ?? 20
    setTopSafeHeight(typeof safeTop === 'number' ? safeTop : statusBar + 24)
  }, [])

  useEffect(() => {
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

  const [saving, setSaving] = useState(false)

  const handleComplete = async () => {
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

  return (
    <View className='write-page'>
      <View
        className='write-nav'
        style={{ paddingTop: `${topSafeHeight}px` }}
      >
        <View className='write-nav-inner'>
          <View className='write-nav-left' onClick={() => Taro.navigateBack()}>
            <Text className='write-nav-back'>{'<'}</Text>
          </View>
          <Text className='write-nav-title'>写日记</Text>
          <Button className='write-nav-btn' onClick={handleComplete} disabled={saving}>
            {saving ? '保存中...' : '完成'}
          </Button>
        </View>
      </View>

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
        />
      </View>
    </View>
  )
}
