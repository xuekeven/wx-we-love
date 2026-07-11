import { View, Text, Button, Picker, Textarea, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { post, put } from '../../utils/request'
import { setPreviewMode, usePreviewMode } from '../../store/global'
import './add.scss'

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDisplay(ds: string): string {
  if (!ds) return ''
  const parts = ds.split('-')
  if (parts.length !== 3) return ds
  return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`
}

function parseYMD(ds: string): Date {
  const [y, m, d] = String(ds).slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function daysBetween(startDs: string, endDs: string): number {
  return Math.round((parseYMD(endDs).getTime() - parseYMD(startDs).getTime()) / 86400000)
}

export default function MenstrualAdd() {
  const today = new Date()
  const [startDate, setStartDate] = useState(toYMD(today))
  const [endDate, setEndDate] = useState('')
  const [selectedSymptoms, setSelectedSymptoms] = useState([])
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [recordId, setRecordId] = useState(null)
  const isPreview = usePreviewMode()

  useEffect(() => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      setPreviewMode(true)
      Taro.switchTab({ url: '/pages/index/index' })
      return
    } else {
      setPreviewMode(false)
    }
    // 检查是否为编辑模式或带默认日期新增
    const pages = Taro.getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const options = currentPage.options || {}

    if (options.mode === 'edit' && options.record) {
      try {
        const recordData = JSON.parse(decodeURIComponent(options.record))
        setIsEditMode(true)
        setRecordId(recordData.id)
        setStartDate(recordData.startDate)
        setEndDate(recordData.endDate || '')
        setSelectedSymptoms(recordData.symptoms || [])
        setNote(recordData.note || '')
        Taro.setNavigationBarTitle({ title: '编辑月经记录' })
      } catch (error) {
        console.log('解析记录数据失败:', error)
        Taro.showToast({ title: '加载数据失败', icon: 'none' })
      }
    } else {
      // 从日历点击日期进入时，预填开始日期
      if (options.defaultDate) {
        setStartDate(options.defaultDate)
      }
      Taro.setNavigationBarTitle({ title: '记录月经' })
    }
  }, [])

  // 常见症状列表
  const symptomsList = [
    { id: '1', name: '轻微腹痛', icon: '😌' },
    { id: '2', name: '严重腹痛', icon: '😣' },
    { id: '3', name: '腰酸背痛', icon: '💢' },
    { id: '4', name: '头痛头晕', icon: '😵' },
    { id: '5', name: '情绪波动', icon: '😢' },
    { id: '6', name: '易怒焦虑', icon: '😤' },
    { id: '7', name: '乳房胀痛', icon: '💔' },
    { id: '8', name: '疲劳乏力', icon: '😴' },
    { id: '9', name: '食欲增加', icon: '🍰' },
    { id: '10', name: '失眠多梦', icon: '🌙' },
    { id: '11', name: '水肿', icon: '💧' },
    { id: '12', name: '痛经', icon: '⚡' }
  ]

  const handleStartDateChange = (e) => {
    if (isPreview) return
    setStartDate(e.detail.value)
  }

  const handleEndDateChange = (e) => {
    if (isPreview) return
    setEndDate(e.detail.value)
  }

  const toggleSymptom = (symptomName) => {
    if (isPreview) return
    if (selectedSymptoms.includes(symptomName)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptomName))
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptomName])
    }
  }

  const handleNoteChange = (e) => {
    if (isPreview) return
    setNote(e.detail.value)
  }

  const validateForm = () => {
    if (!startDate) {
      Taro.showToast({ title: '请选择开始日期', icon: 'none' })
      return false
    }

    if (endDate && parseYMD(endDate) < parseYMD(startDate)) {
      Taro.showToast({ title: '结束日期不能早于开始日期', icon: 'none' })
      return false
    }

    const startDateObj = parseYMD(startDate)
    const todayObj = new Date()
    todayObj.setHours(0, 0, 0, 0)
    
    if (startDateObj > todayObj) {
      Taro.showToast({ title: '开始日期不能晚于今天', icon: 'none' })
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (isPreview) {
      Taro.showModal({
        title: '登录后使用',
        content: '登录后才可记录经期信息，是否现在登录？',
        confirmText: '去登录',
        cancelText: '先看看',
        success: (res) => {
          if (res.confirm) Taro.navigateTo({ url: '/pages/login/index' })
        }
      })
      return
    }
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const data = {
        startDate,
        endDate: endDate || null,
        symptoms: selectedSymptoms,
        note: note.trim()
      }

      let res
      if (isEditMode) {
        res = await put(`/api/menstrual/${recordId}`, data)
      } else {
        res = await post('/api/menstrual', data)
      }

      if (res && res.success) {
        Taro.showToast({
          title: res.message || (isEditMode ? '编辑成功' : '记录成功'),
          icon: 'success',
          duration: 1500
        })

        setTimeout(() => {
          Taro.navigateBack()
        }, 1500)
      } else {
        Taro.showToast({
          title: res?.message || '操作失败，请重试',
          icon: 'none'
        })
        setIsSubmitting(false)
      }
    } catch (error) {
      Taro.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      })
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    Taro.navigateBack()
  }

  return (
    <ScrollView scrollY className='menstrual-add-page'>
      <View className='page-header'>
        <Text className='page-title'>🌸 {isEditMode ? '编辑月经记录' : '记录月经'}</Text>
        <Text className='page-subtitle'>{isEditMode ? '修改记录信息' : '记录健康每一天'}</Text>
      </View>

      <View className='form-container'>
        {/* 日期选择 */}
        <View className='form-section'>
          <Text className='section-title'>📅 日期信息</Text>
          
          <View className='form-item'>
            <View className='item-label'>
              <Text className='label-text'>开始日期</Text>
              <Text className='required'>*</Text>
            </View>
            <Picker
              mode='date'
              value={startDate}
              end={toYMD(new Date())}
              onChange={handleStartDateChange}
              disabled={isPreview}
            >
              <View className='picker-value'>
                <Text className={startDate ? 'value-text' : 'placeholder-text'}>
                  {startDate ? fmtDisplay(startDate) : '请选择开始日期'}
                </Text>
                <Text className='arrow'>›</Text>
              </View>
            </Picker>
          </View>

          <View className='form-item'>
            <View className='item-label'>
              <Text className='label-text'>结束日期</Text>
              <Text className='optional'>（选填）</Text>
            </View>
            <Picker
              mode='date'
              value={endDate}
              start={startDate}
              end={toYMD(new Date())}
              onChange={handleEndDateChange}
              disabled={isPreview}
            >
              <View className='picker-value'>
                <Text className={endDate ? 'value-text' : 'placeholder-text'}>
                  {endDate ? fmtDisplay(endDate) : '请选择结束日期'}
                </Text>
                <Text className='arrow'>›</Text>
              </View>
            </Picker>
          </View>

          {endDate && startDate && (
            <View className='duration-tip'>
              <Text className='tip-icon'>⏱</Text>
              <Text className='tip-text'>
                持续 {daysBetween(startDate, endDate) + 1} 天
              </Text>
            </View>
          )}
        </View>

        {/* 症状选择 */}
        <View className='form-section'>
          <Text className='section-title'>💊 身体状况</Text>
          <Text className='section-desc'>选择本次出现的症状（可多选）</Text>
          
          <View className='symptoms-grid'>
            {symptomsList.map((symptom) => (
              <View
                key={symptom.id}
                className={`symptom-item ${selectedSymptoms.includes(symptom.name) ? 'selected' : ''}`}
                onClick={() => toggleSymptom(symptom.name)}
              >
                <Text className='symptom-icon'>{symptom.icon}</Text>
                <Text className='symptom-name'>{symptom.name}</Text>
                {selectedSymptoms.includes(symptom.name) && (
                  <View className='check-icon'>✓</View>
                )}
              </View>
            ))}
          </View>

          {selectedSymptoms.length > 0 && (
            <View className='selected-count'>
              <Text className='count-text'>已选择 {selectedSymptoms.length} 个症状</Text>
            </View>
          )}
        </View>

        {/* 备注 */}
        <View className='form-section'>
          <Text className='section-title'>📝 备注</Text>
          <Text className='section-desc'>记录更多细节（选填）</Text>
          
          <Textarea
            className='note-input'
            placeholder='例如：经量正常，颜色正常，无血块...'
            placeholderClass='note-placeholder'
            value={note}
            onInput={handleNoteChange}
            maxlength={200}
            autoHeight
            disabled={isPreview}
          />
          <Text className='char-count'>{note.length}/200</Text>
        </View>
      </View>

      {/* 底部按钮 */}
      <View className='bottom-actions'>
        <Button 
          className='cancel-btn' 
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button
          className='submit-btn'
          onClick={handleSubmit}
          disabled={isSubmitting || isPreview}
          loading={isSubmitting}
        >
          {isSubmitting ? '保存中...' : (isEditMode ? '保存修改' : '保存记录')}
        </Button>
      </View>
    </ScrollView>
  )
}
