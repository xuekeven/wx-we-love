import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { getWeekDay, getDaysDiff, getWeekOfYear } from '../../utils/date'
import { get } from '../../utils/request'
import './index.scss'

// FunctionItem: { id, name, icon, path, order }

export default function Index() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loveDate, setLoveDate] = useState(null)
  const [daysTogether, setDaysTogether] = useState(0)
  const [coupleNames, setCoupleNames] = useState({ name1: '张三', name2: '李四' })
  const [isMatched, setIsMatched] = useState(null) // null表示加载中，true/false表示已加载
  const [isLoading, setIsLoading] = useState(true)
  const [functions, setFunctions] = useState([
    { id: '1', name: '心愿清单', icon: '💝', path: '/pages/wishlist/index', order: 1 },
    { id: '2', name: '约会记录', icon: '🌹', path: '/pages/date-record/index', order: 2 },
    { id: '3', name: '纪念日', icon: '🎂', path: '/pages/anniversary/index', order: 3 },
    { id: '4', name: '记事本', icon: '📝', path: '/pages/notebook/index', order: 4 },
    { id: '6', name: '经期记录', icon: '🌸', path: '/pages/menstrual/index', order: 5 },
    { id: '5', name: '存钱罐', icon: '🐷', path: '/pages/piggy-bank/index', order: 6 },
  ])
  const [longPressItem, setLongPressItem] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    loadUserData()
    const timer = setInterval(() => {
      setCurrentDate(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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
        // 没有token，跳转到登录页
        setIsLoading(false)
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }

      const res = await get('/api/user/info')
      if (res && res.success && res.data) {
        const userData = res.data
        const matched = userData.isMatched || false
        setIsMatched(matched)
        
        // 如果未匹配，跳转到匹配页面
        if (!matched) {
          setIsLoading(false)
          Taro.redirectTo({ url: '/pages/match/index' })
          return
        }

        // 设置恋爱日期
        setLoveDate(userData.loveDate || null)
        
        // 设置情侣名字（优先使用name1和name2，如果没有则使用昵称）
        const name1 = userData.name1 || (userData.matchedUser?.nickname ? userData.nickname : '张三')
        const name2 = userData.name2 || (userData.matchedUser?.nickname ? userData.matchedUser.nickname : '李四')
        setCoupleNames({ name1, name2 })
        
        // 设置功能排序
        if (userData.functionOrder && typeof userData.functionOrder === 'object') {
          const sortedFunctions = [...functions].sort((a, b) => {
            const orderA = userData.functionOrder[a.id] || a.order
            const orderB = userData.functionOrder[b.id] || b.order
            return orderA - orderB
          })
          setFunctions(sortedFunctions)
        }
      } else {
        console.error('加载用户数据失败:', res?.message || '')
        // token无效，清除并跳转登录
        if (res && (res.statusCode === 401 || res.statusCode === 404)) {
          Taro.removeStorageSync('token')
          setIsLoading(false)
          Taro.redirectTo({ url: '/pages/login/index' })
          return
        }
        setIsMatched(false)
      }
    } catch (error) {
      console.error('加载用户数据失败:', error)
      // 如果是认证错误，清除token并跳转登录
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

  const handleFunctionClick = (path) => {
    if (!isDragging) {
      Taro.navigateTo({ url: path })
    }
  }

  const handleLongPress = (id) => {
    setLongPressItem(id)
    setIsDragging(true)
    Taro.vibrateShort({ type: 'heavy' })
  }

  const handleTouchEnd = () => {
    setLongPressItem(null)
    setIsDragging(false)
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
        {/* 日期区域 */}
        <View className='date-section'>
          <View className='date-main'>
            <Text className='date-day'>{currentDate.getDate()}</Text>
            <View className='date-info'>
              <Text className='date-solar'>
                {currentDate.getFullYear()}年{String(currentDate.getMonth() + 1).padStart(2, '0')}月{String(currentDate.getDate()).padStart(2, '0')}日
              </Text>
              <Text className='date-week'>
                第{getWeekOfYear(currentDate)}周 {getWeekDay(currentDate)}
              </Text>
            </View>
          </View>
          <View className='weather-icon'>
            <Text className='emoji'>😊</Text>
          </View>
        </View>

        {/* 相识天数 */}
        <View className='love-days-section'>
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

        {/* 功能区 */}
        <View className='function-section'>
          <View className='function-grid'>
            {functions.map((item) => (
              <View
                key={item.id}
                className={`function-item ${longPressItem === item.id ? 'shaking' : ''}`}
                onClick={() => handleFunctionClick(item.path)}
                onLongPress={() => handleLongPress(item.id)}
                onTouchEnd={handleTouchEnd}
              >
                <View className='function-icon-wrapper'>
                  <Text className='function-icon'>{item.icon}</Text>
                </View>
                <Text className='function-name'>{item.name}</Text>
              </View>
            ))}
          </View>
          {isDragging && (
            <View className='drag-tip'>
              <Text>长按拖动可调整顺序</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

