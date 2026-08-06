import { View, Text, Button, ScrollView, Input, Picker, Switch } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { del, get, post, put } from '../../utils/request'
import { formatDate } from '../../utils/date'
import PreviewBanner from '../../components/PreviewBanner'
import { PREVIEW } from '../../config/preview'
import { setPreviewMode, usePreviewMode } from '../../store/global'
import './index.scss'

type AnniversaryType = 'birthday' | 'anniversary' | 'custom'

interface AnniversaryItem {
  id: string
  title: string
  date: string
  type: AnniversaryType
  isYearly: boolean
  reminder: boolean
}

interface AnniversaryDraft {
  title: string
  date: string
  type: AnniversaryType
  isYearly: boolean
  reminder: boolean
}

const TYPE_OPTIONS: Array<{ value: AnniversaryType; label: string; icon: string }> = [
  { value: 'anniversary', label: '纪念日', icon: '💍' },
  { value: 'birthday', label: '生日', icon: '🎂' },
  { value: 'custom', label: '其他', icon: '🎉' }
]

const EMPTY_DRAFT: AnniversaryDraft = {
  title: '',
  date: '',
  type: 'anniversary',
  isYearly: true,
  reminder: true
}

function localDate(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month, 0).getDate()
  return new Date(year, month - 1, Math.min(day, lastDay))
}

function countdown(item: AnniversaryItem): string {
  const [year, month, day] = item.date.split('-').map(Number)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let target = localDate(year, month, day)

  if (item.isYearly) {
    target = localDate(today.getFullYear(), month, day)
    if (target < today) target = localDate(today.getFullYear() + 1, month, day)
  }

  const days = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (days === 0) return '就是今天！'
  if (days > 0) return `还有 ${days} 天`
  return '已过去'
}

export default function Anniversary() {
  const [anniversaries, setAnniversaries] = useState<AnniversaryItem[]>([])
  const [draft, setDraft] = useState<AnniversaryDraft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const isPreview = usePreviewMode()

  useEffect(() => {
    loadAnniversaries()
  }, [])

  const loadAnniversaries = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        setPreviewMode(true)
        setAnniversaries([
          { id: 'p1', title: '第一次见面', date: '2024-02-14', type: 'anniversary', isYearly: true, reminder: true },
          { id: 'p2', title: 'Ta 的生日', date: '2024-05-20', type: 'birthday', isYearly: true, reminder: true },
          { id: 'p3', title: '旅行纪念', date: '2027-10-01', type: 'custom', isYearly: false, reminder: false }
        ])
        return
      }
      setPreviewMode(false)
      const response = await get<AnniversaryItem[]>('/api/anniversaries')
      setAnniversaries(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('加载纪念日失败:', error)
      setAnniversaries([])
    }
  }

  const requireLogin = () => {
    Taro.showModal({
      title: '登录后使用',
      content: '登录后可添加与管理纪念日，是否现在登录？',
      confirmText: '去登录',
      cancelText: '先看看',
      success: (result) => {
        if (result.confirm) Taro.navigateTo({ url: '/pages/login/index' })
      }
    })
  }

  const openAdd = () => {
    if (isPreview) return requireLogin()
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setShowForm(true)
  }

  const openEdit = (item: AnniversaryItem) => {
    if (isPreview) return requireLogin()
    setEditingId(item.id)
    setDraft({
      title: item.title,
      date: item.date,
      type: item.type,
      isYearly: item.isYearly,
      reminder: item.reminder
    })
    setShowForm(true)
  }

  const saveAnniversary = async () => {
    if (!draft.title.trim()) {
      Taro.showToast({ title: '请填写标题', icon: 'none' })
      return
    }
    if (!draft.date) {
      Taro.showToast({ title: '请选择日期', icon: 'none' })
      return
    }

    setSaving(true)
    try {
      const payload = { ...draft, title: draft.title.trim() }
      const response = editingId
        ? await put<AnniversaryItem>(`/api/anniversaries/${editingId}`, payload)
        : await post<AnniversaryItem>('/api/anniversaries', payload)
      if (!response.data) throw new Error('Missing anniversary response')
      setAnniversaries((current) => editingId
        ? current.map((item) => item.id === editingId ? response.data as AnniversaryItem : item)
        : [...current, response.data as AnniversaryItem])
      setShowForm(false)
      Taro.showToast({ title: editingId ? '已更新' : '已添加', icon: 'success' })
    } catch (error) {
      Taro.showToast({ title: '保存失败，请重试', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id: string) => {
    if (isPreview) return requireLogin()
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这个纪念日吗？',
      confirmColor: '#D94F5F',
      success: async (result) => {
        if (!result.confirm) return
        try {
          await del(`/api/anniversaries/${id}`)
          setAnniversaries((current) => current.filter((item) => item.id !== id))
          Taro.showToast({ title: '删除成功', icon: 'success' })
        } catch (error) {
          Taro.showToast({ title: '删除失败，请重试', icon: 'none' })
        }
      }
    })
  }

  const typeOption = (type: AnniversaryType) => TYPE_OPTIONS.find((item) => item.value === type) || TYPE_OPTIONS[2]

  return (
    <View className='anniversary-page'>
      {isPreview && (
        <PreviewBanner
          className='preview-banner-inset'
          text={PREVIEW.anniversary}
          buttonText={PREVIEW.loginButtonText}
          onLogin={() => Taro.navigateTo({ url: '/pages/login/index' })}
        />
      )}
      <View className='page-header'>
        <Text className='page-title'>纪念日</Text>
        <Text className='page-subtitle'>铭记每一个重要时刻</Text>
      </View>

      <Button className='add-btn' onClick={openAdd}>
        <Text className='add-icon'>+</Text>
        <Text>添加纪念日</Text>
      </Button>

      <ScrollView scrollY className='anniversary-list'>
        {anniversaries.map((item) => (
          <View key={item.id} className='anniversary-item'>
            <View className='item-icon'>
              <Text className='icon'>{typeOption(item.type).icon}</Text>
            </View>
            <View className='item-content' onClick={() => openEdit(item)}>
              <Text className='item-title'>{item.title}</Text>
              <Text className='item-date'>{formatDate(localDate(...item.date.split('-').map(Number) as [number, number, number]))}</Text>
              <Text className='countdown-text'>{countdown(item)}</Text>
            </View>
            <View className='item-actions'>
              <View className='edit-btn' onClick={() => openEdit(item)}><Text>编辑</Text></View>
              <View className='delete-btn' onClick={() => handleDelete(item.id)}><Text>删除</Text></View>
            </View>
          </View>
        ))}

        {anniversaries.length === 0 && (
          <View className='empty-state'>
            <Text className='empty-icon'>🎊</Text>
            <Text className='empty-text'>还没有纪念日，快来添加吧</Text>
          </View>
        )}
      </ScrollView>

      {showForm && (
        <View className='form-mask' onClick={() => !saving && setShowForm(false)}>
          <View className='form-sheet' catchMove onClick={(event) => event.stopPropagation()}>
            <Text className='form-title'>{editingId ? '编辑纪念日' : '添加纪念日'}</Text>
            <View className='form-field'>
              <Text className='form-label'>标题</Text>
              <Input
                className='form-input'
                value={draft.title}
                placeholder='例如：第一次见面'
                maxlength={80}
                onInput={(event) => setDraft((value) => ({ ...value, title: event.detail.value }))}
              />
            </View>
            <View className='form-field'>
              <Text className='form-label'>类型</Text>
              <View className='type-options'>
                {TYPE_OPTIONS.map((option) => (
                  <View
                    key={option.value}
                    className={`type-option ${draft.type === option.value ? 'active' : ''}`}
                    onClick={() => setDraft((value) => ({ ...value, type: option.value }))}
                  >
                    <Text>{option.icon} {option.label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View className='form-field'>
              <Text className='form-label'>日期</Text>
              <Picker mode='date' value={draft.date} onChange={(event) => setDraft((value) => ({ ...value, date: event.detail.value }))}>
                <View className={`date-picker ${draft.date ? '' : 'placeholder'}`}>{draft.date || '请选择日期'}</View>
              </Picker>
            </View>
            <View className='switch-row'>
              <Text>每年重复</Text>
              <Switch color='#D94F7F' checked={draft.isYearly} onChange={(event) => setDraft((value) => ({ ...value, isYearly: event.detail.value }))} />
            </View>
            <View className='switch-row'>
              <Text>开启提醒</Text>
              <Switch color='#D94F7F' checked={draft.reminder} onChange={(event) => setDraft((value) => ({ ...value, reminder: event.detail.value }))} />
            </View>
            <View className='form-actions'>
              <Button className='cancel-btn' disabled={saving} onClick={() => setShowForm(false)}>取消</Button>
              <Button className='save-btn' loading={saving} disabled={saving} onClick={saveAnniversary}>保存</Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
