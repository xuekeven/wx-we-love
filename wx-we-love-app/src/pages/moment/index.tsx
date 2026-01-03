import { View, Text } from '@tarojs/components'
import './index.scss'

export default function Moment() {
  return (
    <View className='moment-page'>
      <View className='coming-soon'>
        <Text className='coming-soon-icon'>⏰</Text>
        <Text className='coming-soon-text'>敬请期待</Text>
        <Text className='coming-soon-desc'>Moment 功能正在开发中...</Text>
      </View>
    </View>
  )
}

