import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get } from '../../utils/request'
import { MOODS } from './constants'
import './list.scss'

interface DiaryEntry {
  id: string
  date: string
  moodId: string
  content: string
  userId: number
  authorName: string
  authorAvatar: string
  readByMatched: boolean
}

export default function MoodDiaryList() {
  const [list, setList] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadList = async () => {
    if (!refreshing) setLoading(true)
    try {
      const res = await get('/api/mood-diary/all')
      const data = Array.isArray(res?.data) ? res.data : []
      setList(data)
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

  return (
    <View className='mood-diary-list-page'>
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
                      <Text className='list-item-action-icon'>💬</Text>
                      <Text className='list-item-action-icon'>⋯</Text>
                    </View>
                  </View>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
