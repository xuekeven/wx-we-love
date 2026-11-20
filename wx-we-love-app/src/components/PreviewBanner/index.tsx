import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { usePreviewMode } from '../../store/global'
import './index.scss'

export default function PreviewBanner() {
  const isPreview = usePreviewMode()
  if (!isPreview) return null

  return (
    <View className='preview-banner'>
      <Text className='preview-text'>当前为浏览模式，登录后可记录与保存内容</Text>
      <Button className='preview-login-btn' onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}>
        登录
      </Button>
    </View>
  )
}
