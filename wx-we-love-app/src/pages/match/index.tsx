import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { post } from '../../utils/request'
import { fetchUserInfo, getUserInfo } from '../../store/global'
import './index.scss'

export default function Match() {
  const [matchCode, setMatchCode] = useState('')
  const [myMatchCode, setMyMatchCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    // 隐藏系统导航栏右上角的 home 按钮，避免视觉干扰
    if (Taro.hideHomeButton) {
      try {
        Taro.hideHomeButton()
      } catch (e) {
        // 某些基础库版本可能不支持，忽略错误即可
      }
    }

    loadUserInfo()
  }, [])

  const loadUserInfo = async () => {
    try {
      const token = Taro.getStorageSync('token')
      if (!token) {
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      let data = getUserInfo()
      if (!data) data = await fetchUserInfo()
      if (data) {
        if (data.isMatched) {
          Taro.switchTab({ url: '/pages/index/index' })
          return
        }
        setMyMatchCode(data.matchCode || '')
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
      if (error.statusCode === 401 || error.statusCode === 404) {
        Taro.removeStorageSync('token')
        Taro.redirectTo({ url: '/pages/login/index' })
      }
    }
  }

  const handleGenerateCode = async () => {
    // 如果已有匹配码，则直接复制到剪贴板
    if (myMatchCode) {
      handleCopyCode()
      return
    }

    // 如果还没有匹配码，则先生成再复制
    setIsGenerating(true)
    try {
      const res = await post('/api/user/generate-match-code', {})
      if (res && res.success && res.data) {
        const code = res.data.matchCode
        setMyMatchCode(code)
        Taro.setClipboardData({
          data: code,
          success: () => {
            Taro.showToast({
              title: '匹配码已生成并复制',
              icon: 'success'
            })
          }
        })
      } else {
        Taro.showToast({
          title: res?.message || '生成失败',
          icon: 'none'
        })
      }
    } catch (error) {
      console.error('生成匹配码失败:', error)
      Taro.showToast({
        title: '生成失败，请重试',
        icon: 'none'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleMatch = async () => {
    if (!matchCode.trim()) {
      Taro.showToast({ title: '请输入匹配码', icon: 'none' })
      return
    }

    if (matchCode.length !== 6) {
      Taro.showToast({ title: '匹配码为6位数字', icon: 'none' })
      return
    }

    setIsLoading(true)

    try {
      const res = await post('/api/user/match', { matchCode: matchCode.trim() })
      if (res && res.success && res.data) {
        Taro.showToast({
          title: '匹配成功！',
          icon: 'success',
          duration: 2000
        })

        setTimeout(() => {
          Taro.switchTab({ url: '/pages/index/index' })
        }, 2000)
      } else {
        Taro.showToast({
          title: res?.message || '匹配失败',
          icon: 'none'
        })
        setIsLoading(false)
      }
    } catch (error) {
      console.error('匹配失败:', error)
      Taro.showToast({
        title: '匹配失败，请重试',
        icon: 'none'
      })
      setIsLoading(false)
    }
  }

  const handleCopyCode = () => {
    if (myMatchCode) {
      Taro.setClipboardData({
        data: myMatchCode,
        success: () => {
          Taro.showToast({
            title: '匹配码已复制',
            icon: 'success'
          })
        }
      })
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadUserInfo()
    setIsRefreshing(false)
    Taro.showToast({ title: '已刷新', icon: 'success' })
  }

  return (
    <View className='match-page'>
      <View className='match-container'>
        <View className='match-header'>
          <Text className='match-title'>💑 寻找你的另一半</Text>
          <Text className='match-subtitle'>输入匹配码或生成匹配码来完成匹配</Text>
        </View>

        {/* 我的匹配码 */}
        <View className='my-match-code-section'>
          <Text className='section-title'>我的匹配码</Text>
          <View className='match-code-display'>
            <Text className='match-code-text'>
              {myMatchCode || '------'}
            </Text>
          </View>
          <Button
            className='generate-btn'
            onClick={handleGenerateCode}
            loading={isGenerating}
            disabled={isGenerating}
          >
            {isGenerating ? '处理中...' : '复制匹配码'}
          </Button>
        </View>

        {/* 刷新匹配状态 */}
        <View className='refresh-section'>
          <Button
            className='refresh-btn'
            onClick={handleRefresh}
            loading={isRefreshing}
            disabled={isRefreshing}
          >
            {isRefreshing ? '刷新中...' : '刷新匹配状态'}
          </Button>
        </View>

        {/* 输入匹配码 */}
        <View className='input-match-section'>
          <Text className='section-title'>输入对方的匹配码</Text>
          <Input
            className='match-code-input'
            placeholder='请输入6位匹配码'
            value={matchCode}
            onInput={(e) => setMatchCode(e.detail.value)}
            type='number'
            maxlength={6}
          />
          <Button
            className='match-btn'
            onClick={handleMatch}
            loading={isLoading}
            disabled={isLoading || !matchCode.trim()}
          >
            {isLoading ? '匹配中...' : '开始匹配'}
          </Button>
        </View>

        {/* 提示信息 */}
        <View className='match-tips'>
          <Text className='tips-title'>💡 使用说明</Text>
          <Text className='tips-item'>1. 点击"生成匹配码"获取你的专属匹配码</Text>
          <Text className='tips-item'>2. 将匹配码分享给另一半</Text>
          <Text className='tips-item'>3. 对方输入你的匹配码即可完成匹配</Text>
          <Text className='tips-item'>4. 匹配成功后即可使用所有功能</Text>
        </View>
      </View>
    </View>
  )
}
