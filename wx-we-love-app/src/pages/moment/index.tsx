import { View, Text } from '@tarojs/components'
import './index.scss'

export default function Moment() {
  return (
    <View className='moment-page'>
      <View className='coming-soon'>
        <View className='moment-symbol'>
          <Text className='moment-symbol-text'>M</Text>
        </View>
        <Text className='coming-soon-text'>瞬间</Text>
        <Text className='coming-soon-desc'>一起收藏那些突然很想记住的小事</Text>
        <View className='moment-preview-list'>
          <View className='moment-preview-item'>
            <Text className='moment-preview-dot' />
            <Text className='moment-preview-text'>照片、文字和地点</Text>
          </View>
          <View className='moment-preview-item'>
            <Text className='moment-preview-dot' />
            <Text className='moment-preview-text'>只属于你们的时间线</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
