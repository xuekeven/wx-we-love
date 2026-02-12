import { View, Text, Button } from '@tarojs/components'
import './index.scss'

type PreviewBannerProps = {
  text: string
  buttonText?: string
  onLogin: () => void
  hideButton?: boolean
  className?: string
}

export default function PreviewBanner({ text, buttonText = '登录', onLogin, hideButton, className }: PreviewBannerProps) {
  const classes = ['preview-banner', className].filter(Boolean).join(' ')
  return (
    <View className={classes}>
      <Text className='preview-text'>{text}</Text>
      {!hideButton && (
        <Button className='preview-login-btn' onClick={onLogin}>
          {buttonText}
        </Button>
      )}
    </View>
  )
}
