import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { getWeekDay, getDaysDiff } from '../../utils/date'
import { get } from '../../utils/request'
import './index.scss'

// FunctionItem: { id, name, icon, path, order }

export default function Index() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loveDate, setLoveDate] = useState('2025-10-11')
  const [daysTogether, setDaysTogether] = useState(0)
  const [coupleNames, setCoupleNames] = useState({ name1: '张三', name2: '李四' })
  const [functions, setFunctions] = useState([
    { id: '1', name: '心愿清单', icon: '💝', path: '/pages/wishlist/index', order: 1 },
    { id: '2', name: '约会记录', icon: '🌹', path: '/pages/date-record/index', order: 2 },
    { id: '3', name: '纪念日', icon: '🎂', path: '/pages/anniversary/index', order: 3 },
    { id: '4', name: '记事本', icon: '📝', path: '/pages/notebook/index', order: 4 },
    { id: '5', name: '存钱罐', icon: '🐷', path: '/pages/piggy-bank/index', order: 5 },
    { id: '6', name: '经期记录', icon: '🌸', path: '/pages/menstrual/index', order: 6 }
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
      setDaysTogether(getDaysDiff(loveDate))
    }
  }, [loveDate])

  const loadUserData = async () => {
    try {
      const res = await get('/api/user/info')
      if (res && res.success && res.data) {
        const userData = res.data
        setLoveDate(userData.loveDate || '2025-10-11')
        setCoupleNames({
          name1: userData.name1 || '张三',
          name2: userData.name2 || '李四'
        })
        if (userData.functionOrder && typeof userData.functionOrder === 'object') {
          const sortedFunctions = [...functions].sort((a, b) => {
            const orderA = userData.functionOrder[a.id] || a.order
            const orderB = userData.functionOrder[b.id] || b.order
            return orderA - orderB
          })
          setFunctions(sortedFunctions)
        }
      } else {
        console.log('加载用户数据失败，使用默认数据', res?.message || '')
      }
    } catch (error) {
      console.log('加载用户数据失败，使用默认数据', error)
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

  return (
    <View className='index-page'>
      {/* Topbar */}
      <View className='topbar'>
        <View className='topbar-content'>
          <Text className='heart-icon'>💗</Text>
          <Text className='title'>{coupleNames.name1}和{coupleNames.name2}的恋爱空间</Text>
        </View>
      </View>

      <View className='content'>
        {/* 日期区域 */}
        <View className='date-section'>
          <View className='date-main'>
            <Text className='date-day'>{currentDate.getDate()}</Text>
            <View className='date-info'>
              <Text className='date-year'>{currentDate.getFullYear()}年{String(currentDate.getMonth() + 1).padStart(2, '0')}月</Text>
              <Text className='date-week'>{getWeekDay(currentDate)}</Text>
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

