import { View, Text, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { getWeekDay, getDaysDiff, getWeekOfYear } from '../../utils/date'
import { post } from '../../utils/request'
import ProfileForm from '../../components/ProfileForm'
import PreviewBanner from '../../components/PreviewBanner'
import { PREVIEW } from '../../config/preview'
import { fetchUserInfo, getUserInfo, setUserData, setUserInfoPartial, getLoveDate, getCoupleNames, setPreviewMode, usePreviewMode } from '../../store/global'
import './index.scss'

// 第一行：3 个功能，图标在上、名称在下
const ROW1_FUNCTIONS = [
  { id: 'mood-diary', name: '心情日记', icon: '📔', path: '/pages/mood-diary/index' },
  { id: 'anniversary', name: '纪念日', icon: '🎂', path: '/pages/anniversary/index' },
  { id: 'menstrual', name: '经期记录', icon: '🌸', path: '/pages/menstrual/index' },
]
// 第二行：2 个功能，卡片样式（左标题右图标）
const ROW2_FUNCTIONS = [
  { id: 'piggy-bank', name: '一起Better', icon: '🌱', path: '/pages/piggy-bank/index' },
  { id: 'wishlist', name: '恋爱惊喜', icon: '🎁', path: '/pages/wishlist/index' },
]
// 点击时仅提示「功能正在开发中」、不跳转的入口
const DEVELOPING_IDS = ['piggy-bank', 'wishlist']

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
      const token = Taro.getStorageSync('token')
      if (!token) {
        // 未登录：进入浏览模式，不强制跳转登录
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
      } else {
        setIsMatched(false)
      }
    } catch (error) {
      console.error('加载用户数据失败:', error)
      if (error.statusCode === 401 || error.statusCode === 404) {
        Taro.removeStorageSync('token')
        setIsLoading(false)
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      setIsMatched(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFunctionClick = (id: string, path: string) => {
    if (DEVELOPING_IDS.includes(id)) {
      Taro.showToast({ title: '功能正在开发中', icon: 'none' })
      return
    }
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
      {/* 顶部标题区域 */}
      <View className='topbar'>
        <View className='topbar-content'>
        <Text className='heart-icon'>💗</Text>
          <Text className='title' numberOfLines={1}>
            {coupleNames.name1}和{coupleNames.name2}的恋爱空间
          </Text>
        </View>
      </View>

      <View className='content'>
        {isPreview && (
          <PreviewBanner
            text={PREVIEW.home}
            buttonText={PREVIEW.loginButtonText}
            onLogin={() => Taro.navigateTo({ url: '/pages/login/index' })}
          />
        )}
        {/* 相识天数 */}
        <View className='love-days-section'>
          <View className='love-date-meta'>
            <Text className='love-date-text'>
              {currentDate.getFullYear()}年{String(currentDate.getMonth() + 1).padStart(2, '0')}月{String(currentDate.getDate()).padStart(2, '0')}日
            </Text>
            <Text className='love-date-sub'>
              第{getWeekOfYear(currentDate)}周 {getWeekDay(currentDate)}
            </Text>
          </View>
          <View className='love-days-content'>
            <View className='love-text-container'>
              <Text className='love-text'>今天是在一起的第</Text>
              <Text className='days-number'>{daysTogether}</Text>
              <Text className='love-text'>天</Text>
            </View>
          </View>
          <View className='love-animation'>
            <View className='bear-container'>
              <Text className='bear bear-left'>🐻</Text>
              <Text className='heart-beat'>💕</Text>
              <Text className='bear bear-right'>🐻</Text>
            </View>
          </View>
        </View>

        {/* 功能区：第一行 3 个（图标上、名称下） */}
        <View className='function-section'>
          <View className='function-row function-row-1'>
            {ROW1_FUNCTIONS.map((item) => (
              <View
                key={item.id}
                className='function-item-top'
                onClick={() => handleFunctionClick(item.id, item.path)}
              >
                <View className='function-icon-wrapper function-icon-circle'>
                  <Text className='function-icon'>{item.icon}</Text>
                </View>
                <Text className='function-name'>{item.name}</Text>
              </View>
            ))}
          </View>
          {/* 第二行 2 个（卡片：左标题右图标） */}
          <View className='function-row function-row-2'>
            {ROW2_FUNCTIONS.map((item) => (
              <View
                key={item.id}
                className='function-item-card'
                onClick={() => handleFunctionClick(item.id, item.path)}
              >
                <View className='function-content'>
                  <Text className='function-name'>{item.name}</Text>
                </View>
                <View className='function-icon-wrapper function-icon-circle'>
                  <Text className='function-icon'>{item.icon}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
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
