import { View, Text, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useEffect, useRef, useMemo } from 'react'
import { get, del } from '../../utils/request'
import PreviewBanner from '../../components/PreviewBanner'
import BaseCalendar, { type CalCell } from '../../components/BaseCalendar'
import { PREVIEW } from '../../config/preview'
import { setPreviewMode, usePreviewMode } from '../../store/global'
import './index.scss'

// ── 功能开关 ──────────────────────────────────────────
// 可育窗口（排卵预测区间）：改为 true 开启在日历和预测卡片中展示
const ENABLE_FERTILE_WINDOW = false
// ────────────────────────────────────────────────────

const PHASE_INFOS = [
  {
    name: '月经期',
    desc: '从出血第 1 天开始。子宫内膜脱落并排出，可能出现腹痛、疲惫或腰酸等感受，程度因人而异。'
  },
  {
    name: '卵泡期',
    desc: '本页将经期结束后至预计排卵前标记为卵泡期。卵泡逐渐发育，子宫内膜也在为下一阶段做准备。'
  },
  {
    name: '排卵期',
    desc: '表示预计排卵附近的时间。部分人会发现分泌物更清亮润滑或一侧轻微不适，也可能没有明显感觉；仅凭日期不能确认排卵。'
  },
  {
    name: '黄体期',
    desc: '排卵后至下次月经前。部分人可能出现乳房胀、疲惫、食欲或情绪变化，也可能没有明显不适。'
  },
  {
    name: '等待中',
    desc: '最近一次记录的开始日期晚于今天，暂时无法判断当前阶段。请检查记录日期是否正确。'
  },
  {
    name: '已延迟',
    desc: '今天已超过根据历史周期估算的经期开始日。预测不等于诊断；如持续未至、存在怀孕可能或对此担心，建议咨询专业医务人员。'
  }
]

const CYCLE_PHASE_NAMES = new Set(['月经期', '卵泡期', '排卵期', '黄体期'])

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYMD(ds: string): Date {
  const [y, m, d] = String(ds).slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000)
}

function daysBetween(startDs: string, endDs: string): number {
  const start = parseYMD(startDs)
  const end = parseYMD(endDs)
  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

function sortRecords(list: any[]): any[] {
  return [...list].sort((a, b) => parseYMD(b.startDate).getTime() - parseYMD(a.startDate).getTime())
}

function fmtShort(ds: string): string {
  if (!ds) return ''
  const parts = ds.split('-')
  if (parts.length < 3) return ds
  return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
}

function fmtRange(startDs: string, endDs: string): string {
  if (!endDs) return fmtShort(startDs)
  const sp = startDs.split('-')
  const ep = endDs.split('-')
  if (sp[0] === ep[0] && sp[1] === ep[1]) {
    return `${parseInt(sp[1])}月${parseInt(sp[2])}日 - ${parseInt(ep[2])}日`
  }
  return `${fmtShort(startDs)} - ${fmtShort(endDs)}`
}

export default function Menstrual() {
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const todayStr = toYMD(todayDate)

  const [records, setRecords] = useState<any[]>([])
  const [calYear, setCalYear] = useState(todayDate.getFullYear())
  const [calMonth, setCalMonth] = useState(todayDate.getMonth())
  const [sheetRecord, setSheetRecord] = useState<any>(null)
  const [showPhaseInfo, setShowPhaseInfo] = useState(false)
  const isPreview = usePreviewMode()
  const hasShownRef = useRef(false)

  useEffect(() => { loadRecords() }, [])

  useDidShow(() => {
    if (hasShownRef.current) {
      loadRecords()
    } else {
      hasShownRef.current = true
    }
  })

  const loadRecords = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        setPreviewMode(true)
        const cycle = 28
        const lastStart = addDays(todayDate, -10)
        const lastEnd = addDays(lastStart, 4)
        const prevStart = addDays(lastStart, -cycle)
        const prevEnd = addDays(prevStart, 4)
        setRecords([
          { id: 'p1', startDate: toYMD(lastStart), endDate: toYMD(lastEnd), symptoms: ['轻微腹痛', '疲劳乏力'], note: '注意休息' },
          { id: 'p2', startDate: toYMD(prevStart), endDate: toYMD(prevEnd), symptoms: ['情绪波动'], note: '' }
        ])
        return
      }
      setPreviewMode(false)
      const res = await get('/api/menstrual')
      if (res?.success && Array.isArray(res.data)) {
        setRecords(sortRecords(res.data))
      } else {
        setRecords([])
      }
    } catch {
      setRecords([])
    }
  }

  const cycleStats = useMemo(() => {
    if (records.length < 2) return { days: 28, isHistorical: false }
    const diffs: number[] = []
    for (let i = 0; i < records.length - 1; i++) {
      const diff = daysBetween(records[i + 1].startDate, records[i].startDate)
      if (diff >= 15 && diff <= 60) diffs.push(diff)
    }
    if (!diffs.length) return { days: 28, isHistorical: false }
    return {
      days: Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length),
      isHistorical: true
    }
  }, [records])
  const avgCycle = cycleStats.days

  const durationStats = useMemo(() => {
    const withEnd = records.filter(r => r.endDate)
    if (!withEnd.length) return { days: 5, isHistorical: false }
    const total = withEnd.reduce((sum, r) => {
      return sum + daysBetween(r.startDate, r.endDate) + 1
    }, 0)
    return {
      days: Math.round(total / withEnd.length),
      isHistorical: true
    }
  }, [records])
  const avgDuration = durationStats.days

  // Map dateStr → { record, dayNum }，dayNum = 该日期是这次月经第几天
  const periodMap = useMemo<Record<string, { record: any; dayNum: number }>>(() => {
    const map: Record<string, { record: any; dayNum: number }> = {}
    for (const r of records) {
      const s = parseYMD(r.startDate); s.setHours(0, 0, 0, 0)
      const e = r.endDate ? parseYMD(r.endDate) : addDays(s, avgDuration - 1)
      e.setHours(0, 0, 0, 0)
      let dayNum = 1
      for (let d = new Date(s); d <= e; d = addDays(d, 1)) {
        map[toYMD(d)] = { record: r, dayNum }
        dayNum++
      }
    }
    return map
  }, [records, avgDuration])

  // 预测下次经期日期集合
  const predictedSet = useMemo<Set<string>>(() => {
    const set = new Set<string>()
    if (!records.length) return set
    const lastStart = parseYMD(records[0].startDate); lastStart.setHours(0, 0, 0, 0)
    const predStart = addDays(lastStart, avgCycle)
    const predEnd = addDays(predStart, avgDuration - 1)
    for (let d = new Date(predStart); d <= predEnd; d = addDays(d, 1)) {
      const s = toYMD(d)
      if (!periodMap[s]) set.add(s)
    }
    return set
  }, [records, avgCycle, avgDuration, periodMap])

  // 可育窗口：排卵日前 4 天到排卵日后 1 天（共 6 天）
  // 排卵日 = 下次经期开始 - 14 天；受 ENABLE_FERTILE_WINDOW 开关控制
  const fertileMap = useMemo<Record<string, 'fertile' | 'peak'>>(() => {
    if (!ENABLE_FERTILE_WINDOW || !records.length) return {}
    const lastStart = parseYMD(records[0].startDate); lastStart.setHours(0, 0, 0, 0)
    const nextPeriodStart = addDays(lastStart, avgCycle)
    const ovDate = addDays(nextPeriodStart, -14)
    const map: Record<string, 'fertile' | 'peak'> = {}
    for (let i = -4; i <= 1; i++) {
      const d = addDays(ovDate, i)
      const s = toYMD(d)
      if (!periodMap[s] && !predictedSet.has(s)) {
        map[s] = i === 0 ? 'peak' : 'fertile'
      }
    }
    return map
  }, [records, avgCycle, periodMap, predictedSet])

  const phase = useMemo(() => {
    if (!records.length) return ''
    const r = records[0]
    const s = parseYMD(r.startDate); s.setHours(0, 0, 0, 0)
    const e = r.endDate ? parseYMD(r.endDate) : addDays(s, avgDuration - 1)
    e.setHours(23, 59, 59, 999)
    const t = new Date(todayDate)
    const expectedStart = addDays(s, avgCycle)
    if (t < s) return '等待中'
    if (t <= e) return '月经期'
    if (t > expectedStart) return '已延迟'
    const days = Math.floor((t.getTime() - s.getTime()) / 86400000)
    if (days <= 13) return '卵泡期'
    if (days <= 16) return '排卵期'
    return '黄体期'
  }, [records, avgCycle, avgDuration, todayDate])

  const nextPred = useMemo(() => {
    if (!records.length) return null
    const lastStart = parseYMD(records[0].startDate); lastStart.setHours(0, 0, 0, 0)
    const predDate = addDays(lastStart, avgCycle)
    const predEndDate = addDays(predDate, avgDuration - 1)
    const daysUntil = Math.ceil((predDate.getTime() - todayDate.getTime()) / 86400000)
    // 可育窗口开始（排卵日 - 4 天）
    const ovDate = addDays(predDate, -14)
    const fertileStart = addDays(ovDate, -4)
    return {
      daysUntil,
      dateStr: toYMD(predDate),
      endDateStr: toYMD(predEndDate),
      fertileStartStr: toYMD(fertileStart),
      ovulationStr: toYMD(ovDate),
    }
  }, [records, avgCycle, avgDuration, todayDate])

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  // renderCell：将 BaseCalendar 提供的基础 cell 转换成经期日历的具体 UI
  const renderMenstrualCell = (cell: CalCell, idx: number) => {
    if (cell.type === 'empty') {
      return <View key={idx} className='day-cell empty' />
    }
    const ds = cell.dateStr
    const periodInfo = periodMap[ds]
    const isPeriod = !!periodInfo
    const periodDayNum = periodInfo?.dayNum ?? 0
    const record = periodInfo?.record ?? null
    const isPredicted = predictedSet.has(ds)
    const fertileType = fertileMap[ds] ?? null
    const isFuture = ds > todayStr

    const prevDs = toYMD(addDays(parseYMD(ds), -1))
    const nextDs = toYMD(addDays(parseYMD(ds), 1))

    const cls = ['day-cell']
    if (cell.isToday) cls.push('today')
    if (isFuture && !isPeriod && !isPredicted && !fertileType) cls.push('future')
    if (isPeriod) {
      cls.push('period')
      if (cell.colIndex > 0 && !!periodMap[prevDs]) cls.push('period-has-prev')
      if (cell.colIndex < 6 && !!periodMap[nextDs]) cls.push('period-has-next')
    }
    if (isPredicted) {
      cls.push('predicted')
      if (cell.colIndex > 0 && predictedSet.has(prevDs)) cls.push('pred-has-prev')
      if (cell.colIndex < 6 && predictedSet.has(nextDs)) cls.push('pred-has-next')
      if (!predictedSet.has(prevDs)) cls.push('pred-start')
      if (!predictedSet.has(nextDs)) cls.push('pred-end')
    }
    if (fertileType) {
      cls.push(fertileType === 'peak' ? 'fertile-peak' : 'fertile')
      if (cell.colIndex > 0 && !!fertileMap[prevDs]) cls.push('fertile-has-prev')
      if (cell.colIndex < 6 && !!fertileMap[nextDs]) cls.push('fertile-has-next')
    }

    const handleCellClick = () => {
      if (isPeriod && record) {
        setSheetRecord(record)
      } else if (!isPeriod && !isPredicted && !isFuture) {
        if (isPreview) return
        Taro.navigateTo({ url: `/pages/menstrual/add?defaultDate=${ds}` })
      }
    }

    return (
      <View key={idx} className={cls.join(' ')} onClick={handleCellClick}>
        <View className='cell-inner'>
          <View className='day-circle'>
            <Text className='day-num'>{cell.day}</Text>
          </View>
        </View>
        {isPeriod && periodDayNum === 1 && <Text className='period-day-tag'>D1</Text>}
        {fertileType === 'peak' && <View className='ov-peak-dot' />}
      </View>
    )
  }

  const handleAdd = () => {
    if (isPreview) {
      Taro.showModal({
        title: '登录后使用',
        content: '登录后可记录与管理经期信息，是否现在登录？',
        confirmText: '去登录',
        cancelText: '先看看',
        success: (res) => { if (res.confirm) Taro.navigateTo({ url: '/pages/login/index' }) }
      })
      return
    }
    Taro.navigateTo({ url: '/pages/menstrual/add' })
  }

  const handleEdit = () => {
    if (!sheetRecord) return
    setSheetRecord(null)
    Taro.navigateTo({ url: `/pages/menstrual/add?mode=edit&record=${encodeURIComponent(JSON.stringify(sheetRecord))}` })
  }

  const handleDelete = () => {
    if (!sheetRecord) return
    const id = sheetRecord.id
    setSheetRecord(null)
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const r = await del(`/api/menstrual/${id}`)
            if (r?.success) {
              setRecords(prev => prev.filter(rec => rec.id !== id))
              Taro.showToast({ title: '删除成功', icon: 'success' })
            } else {
              Taro.showToast({ title: r?.message || '删除失败', icon: 'none' })
            }
          } catch {
            Taro.showToast({ title: '删除失败，请重试', icon: 'none' })
          }
        }
      }
    })
  }

  const getDuration = (r: any): number | null => {
    if (!r.endDate) return null
    return daysBetween(r.startDate, r.endDate) + 1
  }

  const currentPhaseInfo = PHASE_INFOS.find(item => item.name === phase)
  const otherPhaseInfos = PHASE_INFOS.filter(
    item => item.name !== phase && CYCLE_PHASE_NAMES.has(item.name)
  )

  return (
    <View className='menstrual-page'>
      {isPreview && (
        <PreviewBanner
          className='preview-banner-inset'
          text={PREVIEW.menstrual}
          buttonText={PREVIEW.loginButtonText}
          onLogin={() => Taro.navigateTo({ url: '/pages/login/index' })}
        />
      )}

      {/* 顶部占位，让内容不被导航栏遮挡 */}

      {/* 日历卡片 */}
      <View className='calendar-card'>
        <BaseCalendar
          year={calYear}
          month={calMonth}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          weekStartsSunday
          showAdjacentDays={false}
          renderCell={renderMenstrualCell}
          footer={
            <View className='legend-row'>
              <View className='legend-item'>
                <View className='legend-dot ld-period' />
                <Text className='legend-txt'>月经期</Text>
              </View>
              <View className='legend-item'>
                <View className='legend-dot ld-predicted' />
                <Text className='legend-txt'>预测经期</Text>
              </View>
              {ENABLE_FERTILE_WINDOW && (
                <>
                  <View className='legend-item'>
                    <View className='legend-dot ld-fertile' />
                    <Text className='legend-txt'>可育窗口</Text>
                  </View>
                  <View className='legend-item'>
                    <View className='legend-dot ld-ov' />
                    <Text className='legend-txt'>排卵日</Text>
                  </View>
                </>
              )}
            </View>
          }
        />
      </View>

      {/* 信息卡片：统计 + 预测 */}
      <View className='pred-card'>
        {/* 三项统计 */}
        <View className='pred-stats-row'>
          <View className='pred-stat-item'>
            <View className='phase-title-row'>
              <Text className={`pred-stat-val ${phase === '月经期' ? 'phase-pink' : ''} ${phase === '已延迟' ? 'phase-delayed' : ''}`}>{phase || '--'}</Text>
              {phase && (
                <View className='phase-help-btn' onClick={() => setShowPhaseInfo(true)}>
                  <Text className='phase-help-icon'>?</Text>
                </View>
              )}
            </View>
            <Text className='pred-stat-lbl'>当前阶段</Text>
          </View>
          <View className='pred-stat-sep' />
          <View className='pred-stat-item'>
            <Text className='pred-stat-val'>{avgCycle}</Text>
            <Text className='pred-stat-lbl'>{cycleStats.isHistorical ? '平均周期（天）' : '参考周期（天）'}</Text>
          </View>
          <View className='pred-stat-sep' />
          <View className='pred-stat-item'>
            <Text className='pred-stat-val'>{avgDuration}</Text>
            <Text className='pred-stat-lbl'>{durationStats.isHistorical ? '平均经期（天）' : '参考经期（天）'}</Text>
          </View>
        </View>

        {/* 分隔线 */}
        {nextPred && <View className='pred-divider' />}

        {/* 下次月经预测 */}
        {nextPred && (
          <View className='pred-row'>
            <View className='pred-item'>
              <Text className='pred-icon'>🌸</Text>
              <View className='pred-main'>
                <Text className='pred-label'>预计经期</Text>
                <Text className='pred-value'>{fmtRange(nextPred.dateStr, nextPred.endDateStr)}</Text>
              </View>
              {nextPred.daysUntil > 0 ? (
                <Text className='pred-badge'>{nextPred.daysUntil}天后</Text>
              ) : nextPred.daysUntil === 0 ? (
                <Text className='pred-badge pred-badge-soon'>预计今天</Text>
              ) : (
                <Text className='pred-badge pred-badge-delayed'>已延迟{Math.abs(nextPred.daysUntil)}天</Text>
              )}
            </View>
          </View>
        )}

        {/* 可育窗口（受开关控制）*/}
        {ENABLE_FERTILE_WINDOW && nextPred && (
          <>
            <View className='pred-divider' />
            <View className='pred-row'>
              <View className='pred-item'>
                <Text className='pred-icon'>🥚</Text>
                <View>
                  <Text className='pred-label'>预测可育窗口</Text>
                  <Text className='pred-value'>{fmtShort(nextPred.fertileStartStr)} - {fmtShort(nextPred.ovulationStr)}</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </View>

      {/* 记录月经按钮 */}
      <View className='add-btn' onClick={handleAdd}>
        <Text className='add-btn-icon'>+</Text>
        <Text className='add-btn-text'>记录月经</Text>
      </View>

      {/* 历史记录列表 */}
      {records.length > 0 && (
        <View className='history-section'>
          <Text className='history-title'>历史记录</Text>
          <ScrollView scrollY>
            {records.map((r) => {
              const dur = getDuration(r)
              return (
                <View key={r.id} className='history-item' onClick={() => setSheetRecord(r)}>
                  <View className='history-left'>
                    <View className='history-dot' />
                    <View>
                      <Text className='history-date'>{fmtRange(r.startDate, r.endDate)}</Text>
                      <Text className='history-meta'>
                        {dur ? `${dur}天` : '未记录结束'}
                        {r.symptoms?.length > 0 ? `  ·  ${r.symptoms.slice(0, 2).join('、')}${r.symptoms.length > 2 ? '...' : ''}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Text className='history-arrow'>›</Text>
                </View>
              )
            })}
          </ScrollView>
        </View>
      )}

      {records.length === 0 && (
        <View className='empty-state'>
          <Text className='empty-icon'>🌺</Text>
          <Text className='empty-text'>还没有记录，点击上方按钮开始添加吧～</Text>
        </View>
      )}

      {/* 记录详情底部弹层 */}
      {sheetRecord && (
        <View className='sheet-mask' catchMove onClick={() => setSheetRecord(null)}>
          <View className='sheet' onClick={(e) => (e as any)?.stopPropagation?.()}>
            <View className='sheet-handle' />
            <View className='sheet-header'>
              <Text className='sheet-title'>经期记录</Text>
              <View className='sheet-close' onClick={() => setSheetRecord(null)}>
                <Text className='sheet-close-icon'>×</Text>
              </View>
            </View>

            <View className='sheet-body'>
              <View className='detail-row'>
                <Text className='detail-label'>开始日期</Text>
                <Text className='detail-value'>{fmtShort(sheetRecord.startDate)}</Text>
              </View>
              {sheetRecord.endDate && (
                <View className='detail-row'>
                  <Text className='detail-label'>结束日期</Text>
                  <Text className='detail-value'>{fmtShort(sheetRecord.endDate)}</Text>
                </View>
              )}
              {sheetRecord.endDate && (
                <View className='detail-row'>
                  <Text className='detail-label'>持续天数</Text>
                  <Text className='detail-value'>
                    {daysBetween(sheetRecord.startDate, sheetRecord.endDate) + 1} 天
                  </Text>
                </View>
              )}
              {sheetRecord.symptoms?.length > 0 && (
                <View className='detail-row detail-row-wrap'>
                  <Text className='detail-label'>症状</Text>
                  <View className='symptoms-wrap'>
                    {sheetRecord.symptoms.map((s, i) => (
                      <Text key={i} className='symptom-chip'>{s}</Text>
                    ))}
                  </View>
                </View>
              )}
              {sheetRecord.note ? (
                <View className='detail-row'>
                  <Text className='detail-label'>备注</Text>
                  <Text className='detail-value detail-note'>{sheetRecord.note}</Text>
                </View>
              ) : null}
            </View>

            <View className='sheet-actions'>
              <View className='sheet-btn sheet-edit' onClick={handleEdit}>
                <Text>编辑</Text>
              </View>
              <View className='sheet-btn sheet-delete' onClick={handleDelete}>
                <Text>删除</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {showPhaseInfo && (
        <View className='sheet-mask' catchMove onClick={() => setShowPhaseInfo(false)}>
          <View className='sheet phase-sheet' onClick={(e) => (e as any)?.stopPropagation?.()}>
            <View className='sheet-handle' />
            <View className='sheet-header'>
              <Text className='sheet-title'>周期阶段说明</Text>
              <View className='sheet-close' onClick={() => setShowPhaseInfo(false)}>
                <Text className='sheet-close-icon'>×</Text>
              </View>
            </View>

            <ScrollView scrollY enhanced showScrollbar={false} className='phase-sheet-body'>
              {currentPhaseInfo && (
                <View className='phase-info-item phase-current-item active'>
                  <View className='phase-info-head'>
                    <Text className='phase-info-name'>{currentPhaseInfo.name}</Text>
                    <Text className='phase-info-tag'>当前阶段</Text>
                  </View>
                  <Text className='phase-info-desc'>{currentPhaseInfo.desc}</Text>
                </View>
              )}

              <View className='phase-list-heading'>
                <Text className='phase-list-title'>其他阶段</Text>
                <Text className='phase-list-note'>根据历史记录估算，仅供日常参考</Text>
              </View>

              {otherPhaseInfos.map(item => (
                <View key={item.name} className='phase-info-item'>
                  <View className='phase-info-head'>
                    <Text className='phase-info-name'>{item.name}</Text>
                  </View>
                  <Text className='phase-info-desc'>{item.desc}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  )
}
