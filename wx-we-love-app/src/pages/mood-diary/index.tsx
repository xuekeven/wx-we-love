import { View, Text, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useEffect, useMemo, useRef } from 'react'
import { get } from '../../utils/request'
import { getWeekDayLong } from '../../utils/date'
import { MOODS } from './constants'
import PreviewBanner from '../../components/PreviewBanner'
import { PREVIEW } from '../../config/preview'
import { setPreviewMode, usePreviewMode } from '../../store/global'
import './index.scss'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getFirstWeekday(year: number, month: number) {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7
}

export default function MoodDiary() {
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear())
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth() + 1)
  const [touchStartX, setTouchStartX] = useState(0)
  const [showMoodModal, setShowMoodModal] = useState(false)
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false)
  const [monthEntriesSelf, setMonthEntriesSelf] = useState<Record<string, { moodId: string }>>({})
  const [monthEntriesMatched, setMonthEntriesMatched] = useState<Record<string, { moodId: string }>>({})
  const [selectedDateForModal, setSelectedDateForModal] = useState('')
  const isPreview = usePreviewMode()
  const hasShownRef = useRef(false)

  const today = useMemo(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
  }, [])

  const loadMonthEntries = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        setPreviewMode(true)
        const monthStr = String(displayMonth).padStart(2, '0')
        const d1 = `${displayYear}-${monthStr}-03`
        const d2 = `${displayYear}-${monthStr}-14`
        const d3 = `${displayYear}-${monthStr}-21`
        setMonthEntriesSelf({ [d1]: { moodId: 'happy' }, [d2]: { moodId: 'heartbeat' } })
        setMonthEntriesMatched({ [d3]: { moodId: 'calm' } })
        return
      }
      setPreviewMode(false)
      const res = await get('/api/mood-diary', { year: displayYear, month: displayMonth })
      const selfList = Array.isArray(res?.data?.self) ? res.data.self : []
      const matchedList = Array.isArray(res?.data?.matched) ? res.data.matched : []
      const selfMap: Record<string, { moodId: string }> = {}
      const matchedMap: Record<string, { moodId: string }> = {}
      const toDateKey = (d: unknown): string => {
        if (d == null) return ''
        const s = String(d)
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
        const date = new Date(s)
        if (Number.isNaN(date.getTime())) return ''
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }
      selfList.forEach((item: { date?: string; moodId?: string }) => {
        const key = toDateKey(item?.date)
        if (key && item?.moodId) selfMap[key] = { moodId: item.moodId }
      })
      matchedList.forEach((item: { date?: string; moodId?: string }) => {
        const key = toDateKey(item?.date)
        if (key && item?.moodId) matchedMap[key] = { moodId: item.moodId }
      })
      setMonthEntriesSelf(selfMap)
      setMonthEntriesMatched(matchedMap)
    } catch (e) {
      setMonthEntriesSelf({})
      setMonthEntriesMatched({})
    }
  }

  useEffect(() => {
    loadMonthEntries()
  }, [displayYear, displayMonth])

  useDidShow(() => {
    if (hasShownRef.current) {
      loadMonthEntries()
    } else {
      hasShownRef.current = true
    }
  })

  const calendarGrid = useMemo(() => {
    const daysInMonth = getDaysInMonth(displayYear, displayMonth)
    const firstWeekday = getFirstWeekday(displayYear, displayMonth)
    const prevMonth = displayMonth === 1 ? 12 : displayMonth - 1
    const prevYear = displayMonth === 1 ? displayYear - 1 : displayYear
    const prevDaysInMonth = getDaysInMonth(prevYear, prevMonth)
    const cells: { type: 'prev' | 'curr' | 'next'; day: number }[] = []
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ type: 'prev', day: prevDaysInMonth - firstWeekday + 1 + i })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ type: 'curr', day: d })
    }
    const total = cells.length
    const rest = total % 7 === 0 ? 0 : 7 - (total % 7)
    for (let i = 1; i <= rest; i++) {
      cells.push({ type: 'next', day: i })
    }
    return cells
  }, [displayYear, displayMonth])

  const goPrevMonth = () => {
    if (displayMonth === 1) {
      setDisplayYear((y) => y - 1)
      setDisplayMonth(12)
    } else {
      setDisplayMonth((m) => m - 1)
    }
  }

  const goNextMonth = () => {
    if (displayMonth === 12) {
      setDisplayYear((y) => y + 1)
      setDisplayMonth(1)
    } else {
      setDisplayMonth((m) => m + 1)
    }
  }

  const goToday = () => {
    setDisplayYear(today.year)
    setDisplayMonth(today.month)
  }

  const onTouchStart = (e: any) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const onTouchEnd = (e: any) => {
    const endX = e.changedTouches[0].clientX
    const delta = endX - touchStartX
    if (delta > 60) goPrevMonth()
    else if (delta < -60) goNextMonth()
  }

  const isToday = (type: string, day: number) =>
    type === 'curr' &&
    displayYear === today.year &&
    displayMonth === today.month &&
    day === today.day

  const todayDateStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const getDateStr = (type: string, day: number) => {
    if (type !== 'curr') return ''
    return `${displayYear}-${String(displayMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const isPastOrToday = (type: string, day: number) => {
    if (type !== 'curr') return false
    const dateStr = getDateStr(type, day)
    if (!dateStr) return false
    return dateStr <= todayDateStr
  }

  const getMoodEmoji = (type: string, day: number, who: 'self' | 'matched') => {
    const dateStr = getDateStr(type, day)
    const entries = who === 'self' ? monthEntriesSelf : monthEntriesMatched
    const entry = dateStr ? entries[dateStr] : null
    if (!entry) return null
    const mood = MOODS.find((m) => m.id === entry.moodId)
    return mood ? mood.emoji : null
  }

  const openMoodModalForDate = (dateStr: string) => {
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
    setSelectedDateForModal(dateStr)
    setShowMoodModal(true)
  }

  const handleFabClick = () => {
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
    setSelectedDateForModal(todayDateStr)
    const existing = monthEntriesSelf[todayDateStr]
    if (existing?.moodId) {
      setShowEditConfirmModal(true)
    } else {
      setShowMoodModal(true)
    }
  }

  const handleEditConfirmCancel = () => {
    setShowEditConfirmModal(false)
  }

  const handleEditConfirmOk = () => {
    if (isPreview) {
      Taro.showModal({
        title: '登录后使用',
        content: '登录后可修改心情日记，是否现在登录？',
        confirmText: '去登录',
        cancelText: '先看看',
        success: (res) => {
          if (res.confirm) Taro.navigateTo({ url: '/pages/login/index' })
        }
      })
      return
    }
    const moodId = monthEntriesSelf[todayDateStr]?.moodId
    setShowEditConfirmModal(false)
    if (moodId) {
      Taro.navigateTo({
        url: `/pages/mood-diary/write?date=${todayDateStr}&mood=${moodId}`,
      })
    }
  }

  const handleMoodSelect = (moodId: string) => {
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
    const date = selectedDateForModal || todayDateStr
    setShowMoodModal(false)
    Taro.navigateTo({
      url: `/pages/mood-diary/write?date=${date}&mood=${moodId}`,
    })
  }

  const modalDisplayDate = useMemo(() => {
    const str = selectedDateForModal || todayDateStr
    const [y, m, d] = str.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return {
      monthDay: `${date.getMonth() + 1}月${date.getDate()}日`,
      week: getWeekDayLong(date),
    }
  }, [selectedDateForModal, todayDateStr])

  return (
    <View className='mood-diary-page'>
      {isPreview && (
        <PreviewBanner
          className='preview-banner-inset'
          text={PREVIEW.moodDiary}
          buttonText={PREVIEW.loginButtonText}
          onLogin={() => Taro.navigateTo({ url: '/pages/login/index' })}
        />
      )}
      <View className='page-header'>
        <View className='page-header-row'>
          <View className='page-header-left'>
            <Text className='page-header-month'>{displayMonth}月</Text>
            <Text className='page-header-year'>{displayYear}年</Text>
          </View>
          <View className='page-header-right' onClick={goToday}>
            <Button className='page-header-today'>回到今天</Button>
          </View>
        </View>
      </View>

      <View
        className='calendar-wrap'
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <View className='weekday-row'>
          {WEEKDAYS.map((w) => (
            <Text key={w} className='weekday-cell'>
              {w}
            </Text>
          ))}
        </View>
        <View className='calendar-grid'>
          {calendarGrid.map((cell, i) => {
            const dateStr = getDateStr(cell.type, cell.day)
            const selfEmoji = cell.type === 'curr' ? getMoodEmoji(cell.type, cell.day, 'self') : null
            const matchedEmoji = cell.type === 'curr' ? getMoodEmoji(cell.type, cell.day, 'matched') : null
            const showSelfCircle = cell.type === 'curr' && isPastOrToday(cell.type, cell.day) && !selfEmoji && dateStr
            return (
              <View
                key={i}
                className={`day-cell ${cell.type} ${isToday(cell.type, cell.day) ? 'today' : ''}`}
              >
                <Text className='day-num'>{cell.day}</Text>
                <View className='day-mood'>
                  <View className='day-mood-row day-mood-self'>
                    {selfEmoji ? (
                      <Text
                        className='day-mood-emoji day-mood-emoji-click'
                        onClick={() => {
                          Taro.navigateTo({ url: '/pages/mood-diary/list' })
                        }}
                      >
                        {selfEmoji}
                      </Text>
                    ) : showSelfCircle ? (
                      <View
                        className='day-mood-circle'
                        onClick={() => openMoodModalForDate(dateStr)}
                      />
                    ) : null}
                  </View>
                  <View className='day-mood-row day-mood-matched'>
                    {matchedEmoji ? (
                      <Text
                        className='day-mood-emoji day-mood-emoji-click'
                        onClick={() => {
                          Taro.navigateTo({ url: '/pages/mood-diary/list' })
                        }}
                      >
                        {matchedEmoji}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      </View>

      <View className='fab-wrap' onClick={handleFabClick}>
        <View className='fab'>
          <Text className='fab-icon'>✏️</Text>
        </View>
      </View>

      {showMoodModal && (
        <View className='mood-modal-mask' onClick={() => setShowMoodModal(false)}>
          <View className='mood-modal' catchMove>
            <View className='mood-modal-header'>
              <View className='mood-modal-date'>
                <Text className='mood-modal-date-num'>{modalDisplayDate.monthDay}</Text>
                <Text className='mood-modal-week'>{modalDisplayDate.week}</Text>
              </View>
              <View className='mood-modal-close' onClick={() => setShowMoodModal(false)}>
                <Text className='mood-modal-close-x'>×</Text>
              </View>
            </View>
            <Text className='mood-modal-title'>Hi，今天心情怎么样</Text>
            <View className='mood-modal-grid'>
              {MOODS.map((m) => (
                <View
                  key={m.id}
                  className='mood-modal-item'
                  onClick={() => handleMoodSelect(m.id)}
                >
                  <View className='mood-modal-icon'>
                    <Text className='mood-modal-emoji'>{m.emoji}</Text>
                  </View>
                  <Text className='mood-modal-name'>{m.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {showEditConfirmModal && (
        <View className='mood-modal-mask' onClick={handleEditConfirmCancel}>
          <View className='edit-confirm-modal' catchMove onClick={(e) => (e as any)?.stopPropagation?.()}>
            <Text className='edit-confirm-text'>今天的日记已经添加啦，是否要前往修改呢</Text>
            <View className='edit-confirm-actions'>
              <Button className='edit-confirm-btn edit-confirm-cancel' onClick={handleEditConfirmCancel}>
                取消
              </Button>
              <Button className='edit-confirm-btn edit-confirm-ok' onClick={handleEditConfirmOk}>
                确定
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
