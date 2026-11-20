import { View, Text, Button, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { getWeekDay, getDaysDiff, getWeekOfYear } from '../../utils/date'
import { post } from '../../utils/request'
import ProfileForm from '../../components/ProfileForm'
import PreviewBanner from '../../components/PreviewBanner'
import { clearMomentFeed, preloadMomentFeed } from '../../store/moments'
import { fetchUserInfo, getUserInfo, setUserData, setUserInfoPartial, getLoveDate, getCoupleNames, setPreviewMode, usePreviewMode } from '../../store/global'
import diaryIcon from '../../assets/icons/diary.png'
import anniversaryIcon from '../../assets/icons/anniversary.png'
import cycleIcon from '../../assets/icons/cycle.png'
import './index.scss'

const FEATURES = [
  { id: 'mood-diary', name: '心情日记', icon: diaryIcon, path: '/pages/mood-diary/index' },
  { id: 'anniversary', name: '纪念日', icon: anniversaryIcon, path: '/pages/anniversary/index' },
  { id: 'menstrual', name: '经期记录', icon: cycleIcon, path: '/pages/menstrual/index' },
]
export default function Index() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loveDate, setLoveDate] = useState<string | null>(null)
  const [daysTogether, setDaysTogether] = useState(0)
  const [coupleNames, setCoupleNames] = useState({ name1: '张三', name2: '李四' })
  const [isMatched, setIsMatched] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showLoveDateModal, setShowLoveDateModal] = useState(false)
  const [isSavingLoveDate, setIsSavingLoveDate] = useState(false)
  const PREVIEW_LOVE_DATE = '2025-10-11'
  const isPreview = usePreviewMode()

  useEffect(() => {
    loadUserData()
    const timer = setInterval(() => {
      setCurrentDate(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 从其他页（如「我的」）返回首页时，从全局 store 同步恋爱纪念日等，保证首页显示最新
  useDidShow(() => {
    loadUserData()
    const storedLoveDate = getLoveDate()
    if (storedLoveDate !== undefined) setLoveDate(storedLoveDate)
    const storedCoupleNames = getCoupleNames()
    if (storedCoupleNames) setCoupleNames(storedCoupleNames)
  })

  useEffect(() => {
    if (loveDate) {
      try {
        setDaysTogether(getDaysDiff(loveDate))
      } catch (error) {
        console.error('计算天数失败:', error)
        setDaysTogether(0)
      }
    } else {
      setDaysTogether(0)
    }
  }, [loveDate])

  const loadUserData = async () => {
    setIsLoading(true)
    try {
      const token = Taro.getStorageSync<string>('token')
      if (!token) {
        // 未登录：进入浏览模式，不强制跳转登录
        clearMomentFeed()
        setPreviewMode(true)
        setIsMatched(true)
        setLoveDate(PREVIEW_LOVE_DATE)
        setCoupleNames({ name1: '张三', name2: '李四' })
        setIsLoading(false)
        return
      }
      setPreviewMode(false)
      let userData = getUserInfo()
      if (!userData) userData = await fetchUserInfo()
      if (userData) {
        const matched = userData.isMatched || false
        setIsMatched(matched)
        if (!matched) {
          setIsLoading(false)
          Taro.redirectTo({ url: '/pages/match/index' })
          return
        }
        const loveDateVal = userData.loveDate || null
        setLoveDate(loveDateVal)
        if (!userData.loveDate) setShowLoveDateModal(true)
        const name1 = userData.currentName || '张三'
        const name2 = userData.matchedName || '李四'
        setCoupleNames({ name1, name2 })
        setUserData({ loveDate: loveDateVal, coupleNames: { name1, name2 } })
        if (token === Taro.getStorageSync<string>('token')) {
          void preloadMomentFeed(token).catch(() => {})
        }
      } else {
        setIsMatched(false)
      }
    } catch (error) {
      console.error('加载用户数据失败:', error)
      if (error.statusCode === 401 || error.statusCode === 404) {
        Taro.removeStorageSync('token')
        clearMomentFeed()
        setIsLoading(false)
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      setIsMatched(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFunctionClick = (path: string) => {
    Taro.navigateTo({ url: path })
  }

  // 加载中，显示空白或加载提示
  if (isLoading || isMatched === null) {
    return (
      <View className='index-page'>
        <View className='loading-container'>
          <Text>加载中...</Text>
        </View>
      </View>
    )
  }

  // 如果未匹配，显示匹配提示
  if (!isMatched) {
    return (
      <View className='index-page'>
        <View className='unmatched-container'>
          <View className='unmatched-content'>
            <Text className='unmatched-icon'>💑</Text>
            <Text className='unmatched-title'>还未匹配</Text>
            <Text className='unmatched-desc'>请先完成匹配才能使用所有功能</Text>
            <Button
              className='go-match-btn'
              onClick={() => Taro.redirectTo({ url: '/pages/match/index' })}
            >
              去匹配
            </Button>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='index-page'>
      <PreviewBanner />

      <View className='home-header'>
        <View className='home-heading'>
          <Text className='home-title'>
            {coupleNames.name1}<Text className='home-title-joiner'> 和 </Text>{coupleNames.name2}
          </Text>
        </View>

        <View className='home-date'>
          <Text className='home-date-main'>{currentDate.getMonth() + 1}月{currentDate.getDate()}日</Text>
          <Text className='home-date-meta'>
            {currentDate.getFullYear()}年 · 第{getWeekOfYear(currentDate)}周 · {getWeekDay(currentDate)}
          </Text>
        </View>
      </View>

      <View className='love-days-section'>
        <View className='day-count'>
          <Text className='day-label'>今天是我们在一起的第</Text>
          <View className='day-value'>
            <Text className='day-number'>{daysTogether}</Text>
            <Text className='day-unit'>天</Text>
          </View>
        </View>
        <View className='heart-stamp' aria-hidden>
          <Text>♥</Text>
          <Text>✦</Text>
        </View>
      </View>

      <View className='feature-list'>
        {FEATURES.map((item) => (
          <Button
            key={item.id}
            className='feature-item'
            onClick={() => handleFunctionClick(item.path)}
          >
            <View className={`feature-icon-tile ${item.id}`}>
              <Image className='feature-icon' src={item.icon} mode='aspectFit' />
            </View>
            <Text className='feature-name'>{item.name}</Text>
            <View className='feature-chevron' aria-hidden />
          </Button>
        ))}
      </View>

      {/* 完善纪念日弹层：匹配成功且未设置恋爱纪念日时弹出 */}
      <ProfileForm
        visible={!isPreview && showLoveDateModal}
        title='完善纪念日'
        showLoveDate
        initialLoveDate=''
        submitButtonText='保存'
        loading={isSavingLoveDate}
        onSubmit={async (values) => {
          if (!values.loveDate) return
          setIsSavingLoveDate(true)
          try {
            await post('/api/user/info', { loveDate: values.loveDate })
            setUserInfoPartial({ loveDate: values.loveDate })
            setLoveDate(values.loveDate)
            setShowLoveDateModal(false)
            Taro.showToast({ title: '已保存', icon: 'success' })
          } catch (e) {
            Taro.showToast({ title: '保存失败，请重试', icon: 'none' })
          } finally {
            setIsSavingLoveDate(false)
          }
        }}
      />
    </View>
  )
}
