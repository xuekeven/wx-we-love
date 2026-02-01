import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { getNavBarTopHeight } from '../../utils/system'
import './index.scss'

export interface CustomNavBarProps {
  /** 中间标题（与 center 二选一） */
  title?: string
  /** 中间自定义内容（与 title 二选一） */
  center?: React.ReactNode
  /** 右侧内容 */
  right?: React.ReactNode
  /** 点击返回时的回调，默认 navigateBack */
  onBack?: () => void
}

/**
 * 自定义导航栏：与纪念日、经期记录等页面的系统导航栏一致（粉底、白字返回箭头），
 * 用于 navigationStyle: 'custom' 的页面，可复用。
 */
export default function CustomNavBar({ title, center, right, onBack }: CustomNavBarProps) {
  const [topHeight, setTopHeight] = useState(0)

  useEffect(() => {
    setTopHeight(getNavBarTopHeight())
  }, [])

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      Taro.navigateBack()
    }
  }

  return (
    <View
      className='custom-nav-bar'
      style={{ paddingTop: `${topHeight}px` }}
    >
      <View className='custom-nav-bar-inner'>
        <View className='custom-nav-bar-left' onClick={handleBack}>
          <Text className='custom-nav-bar-back'>{'‹'}</Text>
        </View>
        <View className='custom-nav-bar-center'>
          {center !== undefined ? center : (title ? <Text className='custom-nav-bar-title'>{title}</Text> : null)}
        </View>
        <View className='custom-nav-bar-right'>
          {right ?? null}
        </View>
      </View>
    </View>
  )
}
