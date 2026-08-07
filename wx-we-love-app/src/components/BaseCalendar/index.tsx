/**
 * BaseCalendar — 基础日历骨架
 *
 * 负责：月份导航（可选箭头）、星期表头、格子生成、触摸滑动（可选）。
 * 格子内容完全由父组件通过 renderCell 控制，实现差异化展示。
 */
import { View, Text } from '@tarojs/components'
import { useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import './index.scss'

// 格子数据，父组件 renderCell 收到后可按需扩展
export type CalCell = {
  /** 格子类型：空占位 / 上月溢出 / 当月 / 下月溢出 */
  type: 'empty' | 'prev' | 'curr' | 'next'
  day: number
  /** YYYY-MM-DD，仅 type==='curr' 时有值 */
  dateStr: string
  isToday: boolean
  /** 在当前行中的列下标（0-6） */
  colIndex: number
}

export type BaseCalendarProps = {
  year: number
  month: number          // 0-indexed（0 = 1月）
  onPrevMonth: () => void
  onNextMonth: () => void
  canGoNext?: boolean
  /** true = 周日作为每周第一天（日一二…六）；false = 周一（一二…日）*/
  weekStartsSunday?: boolean
  /** true = 用上/下月日期填充首尾；false = 空格占位 */
  showAdjacentDays?: boolean
  /** 渲染每个格子的内容，返回 null 则空白 */
  renderCell: (cell: CalCell, idx: number) => ReactNode
  /** 导航行右侧插槽（如"回到今天"按钮）*/
  headerRight?: ReactNode
  /** 导航行左侧插槽（如自定义标题，不传则默认渲染 Year年Month月）*/
  headerLeft?: ReactNode
  /** 日历底部插槽（如图例）*/
  footer?: ReactNode
  /** 是否显示顶部导航箭头，默认 true */
  showNavArrows?: boolean
  /** 是否启用左右滑动换月，默认 false */
  enableSwipe?: boolean
  className?: string
}

const WEEKDAYS_MON = ['一', '二', '三', '四', '五', '六', '日']
const WEEKDAYS_SUN = ['日', '一', '二', '三', '四', '五', '六']

export default function BaseCalendar(props: BaseCalendarProps) {
  const {
    year,
    month,
    onPrevMonth,
    onNextMonth,
    canGoNext = true,
    weekStartsSunday = false,
    showAdjacentDays = false,
    renderCell,
    headerRight,
    headerLeft,
    footer,
    showNavArrows = true,
    enableSwipe = false,
    className = '',
  } = props

  const touchStartX = useRef(0)

  const todayStr = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  const cells = useMemo((): CalCell[] => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const totalDays = lastDay.getDate()

    // 计算前缀偏移（从周日/周一开始）
    const rawFirstDow = firstDay.getDay()  // 0=Sun
    const startOffset = weekStartsSunday ? rawFirstDow : (rawFirstDow + 6) % 7

    const arr: CalCell[] = []

    // 前缀：上月溢出日 或 空格
    if (showAdjacentDays && startOffset > 0) {
      const prevMonthIdx = month === 0 ? 11 : month - 1
      const prevYear = month === 0 ? year - 1 : year
      const prevLastDay = new Date(prevYear, prevMonthIdx + 1, 0).getDate()
      for (let i = startOffset - 1; i >= 0; i--) {
        arr.push({ type: 'prev', day: prevLastDay - i, dateStr: '', isToday: false, colIndex: startOffset - 1 - i })
      }
    } else {
      for (let i = 0; i < startOffset; i++) {
        arr.push({ type: 'empty', day: 0, dateStr: '', isToday: false, colIndex: i })
      }
    }

    // 当月日期
    for (let d = 1; d <= totalDays; d++) {
      const m2 = String(month + 1).padStart(2, '0')
      const day = String(d).padStart(2, '0')
      const dateStr = `${year}-${m2}-${day}`
      const colIndex = (startOffset + d - 1) % 7
      arr.push({ type: 'curr', day: d, dateStr, isToday: dateStr === todayStr, colIndex })
    }

    // 后缀：下月溢出日（mood diary 需要填满 6 行）
    if (showAdjacentDays) {
      const trailing = arr.length % 7 === 0 ? 0 : 7 - (arr.length % 7)
      for (let i = 1; i <= trailing; i++) {
        arr.push({ type: 'next', day: i, dateStr: '', isToday: false, colIndex: (arr.length) % 7 })
      }
    }

    return arr
  }, [year, month, weekStartsSunday, showAdjacentDays, todayStr])

  const weekdays = weekStartsSunday ? WEEKDAYS_SUN : WEEKDAYS_MON

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: any) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > 60) onPrevMonth()
    else if (delta < -60) onNextMonth()
  }

  return (
    <View className={`base-calendar ${className}`}>
      {/* 月份导航行 */}
      {showNavArrows && (
        <View className='base-cal-nav'>
          <View className='base-cal-arrow' onClick={onPrevMonth}>
            <View className='base-cal-chevron base-cal-chevron-left' />
          </View>
          <View className='base-cal-nav-center'>
            {headerLeft ?? <Text className='base-cal-month-label'>{year}年{month + 1}月</Text>}
            {headerRight}
          </View>
          <View
            className={`base-cal-arrow ${!canGoNext ? 'base-cal-arrow-disabled' : ''}`}
            onClick={canGoNext ? onNextMonth : undefined}
          >
            <View className='base-cal-chevron base-cal-chevron-right' />
          </View>
        </View>
      )}

      {/* 星期表头 */}
      <View className='base-cal-weekdays'>
        {weekdays.map((w, i) => {
          const isWeekend = weekStartsSunday ? (i === 0 || i === 6) : i === 6
          return (
            <Text key={w} className={`base-cal-weekday ${isWeekend ? 'weekend' : ''}`}>{w}</Text>
          )
        })}
      </View>

      {/* 格子网格 */}
      <View
        className='base-cal-grid'
        onTouchStart={enableSwipe ? handleTouchStart : undefined}
        onTouchEnd={enableSwipe ? handleTouchEnd : undefined}
      >
        {cells.map((cell, idx) => renderCell(cell, idx))}
      </View>

      {footer}
    </View>
  )
}
