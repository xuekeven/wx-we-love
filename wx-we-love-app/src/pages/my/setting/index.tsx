import { View, Text, Button, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { get, post } from '../../../utils/request'
import { getUserInfo, fetchUserInfo, clearUserData, setPreviewMode, usePreviewMode } from '../../../store/global'
import PreviewBanner from '../../../components/PreviewBanner'
import { PREVIEW } from '../../../config/preview'
import './index.scss'

function clearLocalSession() {
  Taro.removeStorageSync('token')
  Taro.removeStorageSync('userInfo')
  clearUserData()
  setPreviewMode(false)
}

export default function Setting() {
  const [isMatched, setIsMatched] = useState(false)
  const [isUnmatching, setIsUnmatching] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const isPreview = usePreviewMode()

  useEffect(() => {
    loadMatchStatus()
  }, [])

  const loadMatchStatus = async () => {
    try {
      if (!Taro.getStorageSync('token')) {
        setPreviewMode(true)
        setIsMatched(false)
        return
      }
      setPreviewMode(false)
      let data = getUserInfo()
      if (!data) data = await fetchUserInfo()
      setIsMatched(Boolean(data?.isMatched))
    } catch (error) {
      setIsMatched(false)
    }
  }

  const handleUnmatch = () => {
    Taro.showModal({
      title: '确认解除匹配',
      content: '解除后双方不再共享当前空间。纪念日、日记和瞬间等历史记录会保留，并且不会对未来的匹配对象开放。',
      confirmText: '解除匹配',
      cancelText: '取消',
      confirmColor: '#C77B1D',
      success: async (result) => {
        if (!result.confirm) return
        setIsUnmatching(true)
        try {
          await post('/api/user/unmatch')
          clearUserData()
          Taro.showToast({ title: '已解除匹配', icon: 'success' })
          setTimeout(() => Taro.redirectTo({ url: '/pages/match/index' }), 1200)
        } catch (error) {
          Taro.showToast({ title: '解除失败，请重试', icon: 'none' })
          setIsUnmatching(false)
        }
      }
    })
  }

  const handleExport = () => {
    Taro.showModal({
      title: '导出个人数据',
      content: '导出内容包含个人资料和你创建的记录，请妥善保管。确认后将复制为 JSON 文本。',
      confirmText: '确认导出',
      success: async (result) => {
        if (!result.confirm) return
        setIsExporting(true)
        try {
          const response = await get<Record<string, unknown>>('/api/user/export-data')
          if (!response.data) throw new Error('Missing export data')
          await Taro.setClipboardData({ data: JSON.stringify(response.data, null, 2) })
          Taro.showToast({ title: '数据已复制', icon: 'success' })
        } catch (error) {
          Taro.showToast({ title: '导出失败，请重试', icon: 'none' })
        } finally {
          setIsExporting(false)
        }
      }
    })
  }

  const handleLogout = () => {
    if (!Taro.getStorageSync('token')) {
      Taro.navigateTo({ url: '/pages/login/index' })
      return
    }
    Taro.showModal({
      title: '确认退出',
      content: '退出后需要重新进行微信登录。',
      success: async (result) => {
        if (!result.confirm) return
        try {
          await post('/api/user/logout')
        } catch (error) {
          console.warn('服务端令牌撤销失败，本地会话仍将清除:', error)
        } finally {
          clearLocalSession()
          Taro.showToast({ title: '已退出', icon: 'success' })
          setTimeout(() => Taro.redirectTo({ url: '/pages/login/index' }), 1000)
        }
      }
    })
  }

  const openDeleteConfirm = () => {
    Taro.showModal({
      title: '永久注销账号',
      content: '账号和个人数据将永久删除且无法恢复；当前关系会解除，但另一方的个人数据不会被删除。',
      confirmText: '继续',
      confirmColor: '#C83F50',
      success: (result) => {
        if (result.confirm) {
          setDeleteConfirmation('')
          setShowDeleteConfirm(true)
        }
      }
    })
  }

  const deleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return
    setIsDeleting(true)
    try {
      await post('/api/user/delete-account', { confirmation: 'DELETE' })
      clearLocalSession()
      setShowDeleteConfirm(false)
      Taro.showToast({ title: '账号已注销', icon: 'success' })
      setTimeout(() => Taro.redirectTo({ url: '/pages/login/index' }), 1200)
    } catch (error) {
      Taro.showToast({ title: '注销失败，请重试', icon: 'none' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <View className='setting-page'>
      {isPreview && (
        <PreviewBanner
          text={PREVIEW.setting}
          buttonText={PREVIEW.loginButtonText}
          onLogin={() => Taro.navigateTo({ url: '/pages/login/index' })}
        />
      )}

      {!isPreview && (
        <>
          <View className='setting-group'>
            <Text className='group-title'>数据与隐私</Text>
            <Button className='setting-btn neutral' loading={isExporting} disabled={isExporting} onClick={handleExport}>导出个人数据</Button>
          </View>

          {isMatched && (
            <View className='setting-group'>
              <Text className='group-title'>关系管理</Text>
              <Button className='setting-btn warning' loading={isUnmatching} disabled={isUnmatching} onClick={handleUnmatch}>解除匹配</Button>
            </View>
          )}

          <View className='setting-group'>
            <Text className='group-title'>账号</Text>
            <Button className='setting-btn neutral' onClick={handleLogout}>退出登录</Button>
            <Button className='setting-btn danger' onClick={openDeleteConfirm}>永久注销账号</Button>
          </View>
        </>
      )}

      {showDeleteConfirm && (
        <View className='delete-mask'>
          <View className='delete-dialog'>
            <Text className='delete-title'>确认永久注销</Text>
            <Text className='delete-copy'>请输入 DELETE 以确认</Text>
            <Input
              className='delete-input'
              value={deleteConfirmation}
              placeholder='DELETE'
              onInput={(event) => setDeleteConfirmation(event.detail.value)}
            />
            <View className='delete-actions'>
              <Button className='cancel-btn' disabled={isDeleting} onClick={() => setShowDeleteConfirm(false)}>取消</Button>
              <Button className='confirm-btn' loading={isDeleting} disabled={isDeleting || deleteConfirmation !== 'DELETE'} onClick={deleteAccount}>永久删除</Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
