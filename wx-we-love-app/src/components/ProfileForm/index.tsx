import { View, Text, Button, Image, Input, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import config from '../../config'
import './index.scss'

// 仅当为本地临时路径（需上传）时返回 true；http/https 的远程 URL 不再上传
const isLocalTempAvatar = (url) => {
  if (!url || typeof url !== 'string') return false
  const u = url.trim().toLowerCase()
  if (!u) return false
  if (u.startsWith('wxfile://') || u.startsWith('file://')) return true
  if (u.startsWith('/tmp/') || u.startsWith('tmp/')) return true
  // 微信临时地址常见为 http(s)://tmp/...
  if (/^https?:\/\/tmp([/:]|$)/.test(u)) return true
  if (u.startsWith('http://') || u.startsWith('https://')) return false
  return true
}

export interface ProfileFormProps {
  visible: boolean
  onClose?: () => void
  title: string
  subtitle?: string
  /** 是否展示姓名、头像、恋爱纪念日 */
  showName?: boolean
  showAvatar?: boolean
  showLoveDate?: boolean
  initialName?: string
  initialAvatar?: string
  initialLoveDate?: string
  submitButtonText: string
  /** 是否显示底部「取消」按钮（次要），与主按钮「保存」并列 */
  showCancel?: boolean
  onSubmit: (values: { name?: string; avatar?: string; loveDate?: string }) => Promise<void> | void
  /** 未写入 storage 时传 token，用于上传和 POST /api/user/info */
  token?: string
  loading?: boolean
}

export default function ProfileForm({
  visible,
  onClose,
  title,
  subtitle,
  showName = false,
  showAvatar = false,
  showLoveDate = false,
  initialName = '',
  initialAvatar = '',
  initialLoveDate = '',
  submitButtonText,
  showCancel = false,
  onSubmit,
  token,
  loading = false
}: ProfileFormProps) {
  const [name, setName] = useState(initialName)
  const [avatar, setAvatar] = useState(initialAvatar)
  const [loveDate, setLoveDate] = useState(initialLoveDate)

  useEffect(() => {
    if (visible) {
      setName(initialName)
      setAvatar(initialAvatar)
      setLoveDate(initialLoveDate)
    }
  }, [visible, initialName, initialAvatar, initialLoveDate])

  const handleChooseAvatar = (e) => {
    if (e?.detail?.avatarUrl) {
      setAvatar(e.detail.avatarUrl)
      return
    }
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        if (res.tempFilePaths?.[0]) setAvatar(res.tempFilePaths[0])
      }
    })
  }

  const handleDateChange = (e) => {
    setLoveDate(e.detail.value || '')
  }

  const handleSubmit = async () => {
    if (showName && !name.trim()) {
      Taro.showToast({ title: '请填写姓名', icon: 'none' })
      return
    }
    if (showLoveDate && !loveDate) {
      Taro.showToast({ title: '请选择恋爱纪念日', icon: 'none' })
      return
    }

    let avatarToSave = avatar || ''
    if (showAvatar && avatarToSave && isLocalTempAvatar(avatarToSave)) {
      try {
        const uploadRes = await new Promise((resolve, reject) => {
          Taro.uploadFile({
            url: `${config.apiBaseUrl}/api/upload`,
            filePath: avatarToSave,
            name: 'file',
            header: token ? { Authorization: `Bearer ${token}` } : {},
            success: (res) => {
              if (res.statusCode === 200) {
                try {
                  const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
                  resolve(data)
                } catch {
                  reject(new Error('解析上传结果失败'))
                }
              } else {
                const errData = typeof res.data === 'string' ? {} : (res.data || {})
                reject(new Error(errData?.message || '上传失败'))
              }
            },
            fail: (err) => reject(err)
          })
        })
        if (uploadRes?.success && uploadRes?.data?.url) {
          avatarToSave = uploadRes.data.url
        }
      } catch (err) {
        console.error('头像上传失败:', err)
        Taro.showToast({ title: '头像上传失败，请重试', icon: 'none' })
        return
      }
    }

    const values: { name?: string; avatar?: string; loveDate?: string } = {}
    if (showName) values.name = name.trim()
    if (showAvatar) values.avatar = avatarToSave
    if (showLoveDate) values.loveDate = loveDate

    try {
      await Promise.resolve(onSubmit(values))
    } catch (e) {
      // 由父组件处理错误提示
    }
  }

  if (!visible) return null

  return (
    <View className='profile-form-mask'>
      <View className='profile-form-modal'>
        <Text className='modal-title'>{title}</Text>
        {subtitle ? <Text className='modal-subtitle'>{subtitle}</Text> : null}

        {showName && (
          <View className='form-item'>
            <Text className='form-label'>姓名</Text>
            <Input
              className='form-input'
              placeholder='请输入你的姓名'
              type='nickname'
              value={name}
              onInput={(e) => setName(e.detail.value)}
              maxlength={12}
            />
          </View>
        )}

        {showAvatar && (
          <View className='form-item'>
            <Text className='form-label'>头像</Text>
            <View className='avatar-row'>
              <Image className='avatar-preview' src={avatar} mode='aspectFill' />
              <Button
                className='upload-avatar-btn'
                openType='chooseAvatar'
                onChooseAvatar={handleChooseAvatar}
                size='mini'
              >
                上传头像
              </Button>
            </View>
          </View>
        )}

        {showLoveDate && (
          <View className='form-item'>
            <Text className='form-label'>恋爱纪念日</Text>
            <Picker
              mode='date'
              value={loveDate}
              onChange={handleDateChange}
              end={new Date().toISOString().slice(0, 10)}
            >
              <View className={`form-picker ${!loveDate ? 'placeholder' : ''}`}>
                {loveDate || '请选择恋爱的第一天'}
              </View>
            </Picker>
          </View>
        )}

        <View className='modal-actions'>
          {showCancel && (
            <Button
              className='modal-btn cancel'
              onClick={onClose}
              disabled={loading}
            >
              取消
            </Button>
          )}
          <Button
            className='modal-btn confirm'
            onClick={handleSubmit}
            loading={loading}
            disabled={loading}
          >
            {submitButtonText}
          </Button>
        </View>
      </View>
    </View>
  )
}
