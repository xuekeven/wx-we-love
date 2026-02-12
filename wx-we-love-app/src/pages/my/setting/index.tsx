import { View, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { post } from '../../../utils/request'
import { getUserInfo, fetchUserInfo, clearUserData, setPreviewMode, usePreviewMode } from '../../../store/global'
import PreviewBanner from '../../../components/PreviewBanner'
import { PREVIEW } from '../../../config/preview'
import './index.scss'

export default function Setting() {
  const [isMatched, setIsMatched] = useState(false)
  const [isUnmatching, setIsUnmatching] = useState(false)
  const isPreview = usePreviewMode()

  useEffect(() => {
    loadMatchStatus()
  }, [])

  const loadMatchStatus = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        setPreviewMode(true)
        setIsMatched(false)
        return
      }
      setPreviewMode(false)
      let data = getUserInfo()
      if (!data) data = await fetchUserInfo()
      if (data) {
        setIsMatched(data.isMatched || false)
      } else {
        setIsMatched(false)
      }
    } catch (error) {
      setIsMatched(false)
    }
  }

  const handleUnmatch = () => {
    Taro.showModal({
      title: '确认解绑',
      content: '解绑后会清空所有数据，重新匹配后需要重新开始，确定要解绑吗？',
      confirmText: '确认解绑',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          setIsUnmatching(true)
          try {
            const unmatchRes = await post('/api/user/unmatch', {})
            if (unmatchRes && unmatchRes.success) {
              clearUserData()
              Taro.showToast({
                title: '解绑成功',
                icon: 'success',
                duration: 2000
              })
              setTimeout(() => {
                Taro.redirectTo({ url: '/pages/match/index' })
              }, 2000)
            } else {
              Taro.showToast({
                title: unmatchRes?.message || '解绑失败',
                icon: 'none'
              })
              setIsUnmatching(false)
            }
          } catch (error) {
            console.error('解绑失败:', error)
            Taro.showToast({
              title: '解绑失败，请重试',
              icon: 'none'
            })
            setIsUnmatching(false)
          }
        }
      }
    })
  }

  const handleLogout = () => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      Taro.navigateTo({ url: '/pages/login/index' })
      return
    }
    Taro.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync('token')
          Taro.removeStorageSync('userInfo')
          clearUserData()
          setPreviewMode(false)
          Taro.showToast({ title: '已退出', icon: 'success' })
          setTimeout(() => {
            Taro.redirectTo({ url: '/pages/login/index' })
          }, 1500)
        }
      }
    })
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
      {isMatched && (
        <View className='setting-section'>
          <Button
            className='unmatch-btn'
            onClick={handleUnmatch}
            loading={isUnmatching}
            disabled={isUnmatching}
          >
            {isUnmatching ? '解绑中...' : '解除匹配'}
          </Button>
        </View>
      )}

      <View className='setting-section'>
        <Button className='logout-btn' onClick={handleLogout}>
          退出登录
        </Button>
      </View>
    </View>
  )
}
