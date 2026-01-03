import { View, Text, Button, ScrollView, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get, post, del } from '../../utils/request'
import { formatDate } from '../../utils/date'
import './index.scss'

// MenstrualRecord: { id, startDate, endDate, cycleLength, symptoms, note, createdAt }

export default function Menstrual() {
  const [records, setRecords] = useState([])
  const [nextPrediction, setNextPrediction] = useState(null)
  const [averageCycle, setAverageCycle] = useState(28)
  const [currentPhase, setCurrentPhase] = useState('')

  useEffect(() => {
    loadRecords()
  }, [])

  useEffect(() => {
    if (records.length > 0) {
      calculateCycle()
      predictNext()
      calculatePhase()
    }
  }, [records])

  const loadRecords = async () => {
    try {
      const res = await get('/api/menstrual')
      if (res && res.data) {
        setRecords(res.data)
      }
    } catch (error) {
      console.log('加载经期记录失败')
    }
  }

  // 计算平均周期
  const calculateCycle = () => {
    if (records.length < 2) return
    
    const cycles = []
    for (let i = 0; i < records.length - 1; i++) {
      const current = new Date(records[i].startDate)
      const next = new Date(records[i + 1].startDate)
      const diff = Math.abs(current - next) / (1000 * 60 * 60 * 24)
      cycles.push(diff)
    }
    
    if (cycles.length > 0) {
      const avg = Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
      setAverageCycle(avg)
    }
  }

  // 预测下次月经
  const predictNext = () => {
    if (records.length === 0) return
    
    const lastRecord = records[0]
    const lastDate = new Date(lastRecord.startDate)
    const predictedDate = new Date(lastDate.getTime() + averageCycle * 24 * 60 * 60 * 1000)
    const today = new Date()
    const daysUntil = Math.ceil((predictedDate - today) / (1000 * 60 * 60 * 24))
    
    setNextPrediction({
      date: predictedDate,
      daysUntil: daysUntil
    })
  }

  // 计算当前阶段
  const calculatePhase = () => {
    if (records.length === 0) return
    
    const lastRecord = records[0]
    const lastDate = new Date(lastRecord.startDate)
    const today = new Date()
    const daysSince = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24))
    
    if (daysSince < 0) {
      setCurrentPhase('等待中')
    } else if (daysSince <= 7) {
      setCurrentPhase('月经期')
    } else if (daysSince <= 14) {
      setCurrentPhase('卵泡期')
    } else if (daysSince <= 16) {
      setCurrentPhase('排卵期')
    } else if (daysSince <= 28) {
      setCurrentPhase('黄体期')
    } else {
      setCurrentPhase('可能延迟')
    }
  }

  const handleAdd = () => {
    Taro.navigateTo({ url: '/pages/menstrual/add' })
  }

  const handleEdit = (record) => {
    // 将记录数据编码为JSON字符串，通过URL参数传递
    const recordData = encodeURIComponent(JSON.stringify(record))
    Taro.navigateTo({
      url: `/pages/menstrual/add?mode=edit&record=${recordData}`
    })
  }

  const handleDelete = async (id) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await del(`/api/menstrual/${id}`)
            setRecords(records.filter(r => r.id !== id))
            Taro.showToast({ title: '删除成功', icon: 'success' })
          } catch (error) {
            console.log('删除失败')
          }
        }
      }
    })
  }

  const getDaysAgo = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const days = Math.floor((today - date) / (1000 * 60 * 60 * 24))
    return days === 0 ? '今天' : `${days}天前`
  }

  return (
    <View className='menstrual-page'>
      <View className='page-header'>
        <Text className='page-title'>🌸 经期记录</Text>
        <Text className='page-subtitle'>关爱女性健康</Text>
      </View>

      {/* 周期统计卡片 */}
      <View className='cycle-card'>
        <View className='cycle-header'>
          <Text className='cycle-title'>周期概览</Text>
          <Text className='cycle-phase'>{currentPhase}</Text>
        </View>
        
        <View className='cycle-stats'>
          <View className='stat-item'>
            <Text className='stat-value'>{averageCycle}</Text>
            <Text className='stat-label'>平均周期(天)</Text>
          </View>
          {nextPrediction && (
            <View className='stat-item'>
              <Text className='stat-value'>{nextPrediction.daysUntil}</Text>
              <Text className='stat-label'>距下次(天)</Text>
            </View>
          )}
          <View className='stat-item'>
            <Text className='stat-value'>{records.length}</Text>
            <Text className='stat-label'>记录次数</Text>
          </View>
        </View>

        {nextPrediction && nextPrediction.daysUntil > 0 && (
          <View className='prediction'>
            <Text className='prediction-text'>
              预计下次月经：{formatDate(nextPrediction.date)}
            </Text>
          </View>
        )}
      </View>

      <Button className='add-btn' onClick={handleAdd}>
        <Text className='add-icon'>+</Text>
        <Text>记录本次月经</Text>
      </Button>

      <ScrollView scrollY className='record-list'>
        <View className='list-header'>
          <Text className='list-title'>历史记录</Text>
        </View>

        {records.map((record) => (
          <View key={record.id} className='record-item'>
            <View className='record-header'>
              <View className='record-date-info'>
                <Text className='record-start-date'>
                  {formatDate(new Date(record.startDate))}
                </Text>
                {record.endDate && (
                  <Text className='record-duration'>
                    持续 {Math.ceil((new Date(record.endDate) - new Date(record.startDate)) / (1000 * 60 * 60 * 24))} 天
                  </Text>
                )}
              </View>
              <Text className='record-time-ago'>{getDaysAgo(record.startDate)}</Text>
            </View>

            {record.cycleLength && (
              <View className='record-cycle'>
                <Text className='cycle-label'>周期：</Text>
                <Text className='cycle-value'>{record.cycleLength} 天</Text>
              </View>
            )}

            {record.symptoms && record.symptoms.length > 0 && (
              <View className='record-symptoms'>
                {record.symptoms.map((symptom, index) => (
                  <View key={index} className='symptom-tag'>
                    <Text>{symptom}</Text>
                  </View>
                ))}
              </View>
            )}

            {record.note && (
              <Text className='record-note'>{record.note}</Text>
            )}

            <View className='record-actions'>
              <View className='edit-btn' onClick={() => handleEdit(record)}>
                <Text>编辑</Text>
              </View>
              <View className='delete-btn' onClick={() => handleDelete(record.id)}>
                <Text>删除</Text>
              </View>
            </View>
          </View>
        ))}

        {records.length === 0 && (
          <View className='empty-state'>
            <Text className='empty-icon'>🌺</Text>
            <Text className='empty-text'>还没有记录，快来添加吧～</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

