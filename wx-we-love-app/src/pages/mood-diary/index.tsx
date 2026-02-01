import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useEffect, useMemo } from 'react'
import { get } from '../../utils/request'
import { getWeekDayLong } from '../../utils/date'
import { MOODS } from './constants'
import './index.scss'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function getFirstWeekday(year: number, month: number) {
  return (new Date(year, month - 1, 1).getDay() + 6) % 7
}

export default function MoodDiary() {
  const [topSafeHeight, setTopSafeHeight] = useState(44)
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear())
  const [displayMonth, setDisplayMonth] = useState(new Date().getMonth() + 1)
  const [touchStartX, setTouchStartX] = useState(0)
  const [showMoodModal, setShowMoodModal] = useState(false)
  const [monthEntries, setMonthEntries] = useState<Record<string, { moodId: string }>>({})

  const today = useMemo(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
  }, [])

  useEffect(() => {
    const sys = Taro.getSystemInfoSync() as any
    const safeTop = sys.safeArea?.top ?? sys.safeAreaInsets?.top
    const statusBar = sys.statusBarHeight ?? 20
    setTopSafeHeight(typeof safeTop === 'number' ? safeTop : statusBar + 24)
  }, [])

  const loadMonthEntries = async () => {
    try {
      const res = await get('/api/mood-diary', { year: displayYear, month: displayMonth })
      const list = (res?.data && Array.isArray(res.data)) ? res.data : []
      const map: Record<string, { moodId: string }> = {}
      list.forEach((item: { date: string; moodId: string }) => {
        map[item.date] = { moodId: item.moodId }
      })
      setMonthEntries(map)
    } catch (e) {
      setMonthEntries({})
    }
  }

  useEffect(() => {
    loadMonthEntries()
  }, [displayYear, displayMonth])

  useDidShow(() => {
    loadMonthEntries()
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

  const todayDisplay = useMemo(() => {
    const d = new Date()
    return {
      monthDay: `${d.getMonth() + 1}月${d.getDate()}日`,
      week: getWeekDayLong(d),
    }
  }, [])

  const handleMoodSelect = (moodId: string) => {
    setShowMoodModal(false)
    Taro.navigateTo({
      url: `/pages/mood-diary/write?date=${todayDateStr}&mood=${moodId}`,
    })
  }

  const getDateStr = (type: string, day: number) => {
    if (type !== 'curr') return ''
    return `${displayYear}-${String(displayMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const getMoodEmoji = (type: string, day: number) => {
    const dateStr = getDateStr(type, day)
    const entry = dateStr ? monthEntries[dateStr] : null
    if (!entry) return null
    const mood = MOODS.find((m) => m.id === entry.moodId)
    return mood ? mood.emoji : null
  }

  return (
    <View className='mood-diary-page'>
      <View
        className='custom-nav'
        style={{ paddingTop: `${topSafeHeight}px` }}
      >
        <View className='nav-inner'>
          <View className='nav-left' onClick={() => Taro.navigateBack()}>
            <Text className='nav-back'>{'<'}</Text>
          </View>
          <View className='nav-center'>
            <Text className='nav-month'>{displayMonth}月</Text>
            <Text className='nav-year'>{displayYear}年</Text>
          </View>
          <View className='nav-right'>
            <Text className='nav-today' onClick={goToday}>
              今天
            </Text>
            <Text className='nav-icon'>☀️</Text>
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
          {calendarGrid.map((cell, i) => (
            <View
              key={i}
              className={`day-cell ${cell.type} ${isToday(cell.type, cell.day) ? 'today' : ''}`}
            >
              <Text className='day-num'>{cell.day}</Text>
              <View className='day-mood'>
                {cell.type === 'curr' && getMoodEmoji(cell.type, cell.day) && (
                  <Text className='day-mood-emoji'>{getMoodEmoji(cell.type, cell.day)}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className='fab-wrap' onClick={() => setShowMoodModal(true)}>
        <View className='fab'>
          <Text className='fab-icon'>✏️</Text>
        </View>
      </View>

      {showMoodModal && (
        <View className='mood-modal-mask' onClick={() => setShowMoodModal(false)}>
          <View className='mood-modal' catchMove>
            <View className='mood-modal-header'>
              <View className='mood-modal-date'>
                <Text className='mood-modal-date-num'>{todayDisplay.monthDay}</Text>
                <Text className='mood-modal-week'>{todayDisplay.week}</Text>
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
    </View>
  )
}
