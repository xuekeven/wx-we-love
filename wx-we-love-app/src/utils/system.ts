import Taro from '@tarojs/taro'

/**
 * 获取与系统导航栏一致的顶部高度（用于 custom 导航栏页面，与 tabBar/默认导航栏页面视觉对齐）
 * 使用胶囊按钮位置计算：状态栏高度 + (胶囊top - 状态栏) * 2 + 胶囊高度
 */
export function getNavBarTopHeight(): number {
  try {
    const sys = Taro.getSystemInfoSync() as { statusBarHeight?: number; safeArea?: { top: number }; safeAreaInsets?: { top: number } }
    const statusBar = sys.statusBarHeight ?? 20
    const menuButton = Taro.getMenuButtonBoundingClientRect()
    if (menuButton && typeof menuButton.top === 'number') {
      const gap = menuButton.top - statusBar
      const navBarHeight = 2 * gap + (menuButton.height ?? 32)
      return statusBar + navBarHeight
    }
    return statusBar + 44
  } catch {
    const sys = Taro.getSystemInfoSync() as { statusBarHeight?: number; safeArea?: { top: number }; safeAreaInsets?: { top: number } }
    const statusBar = sys.statusBarHeight ?? 20
    const safeTop = sys.safeArea?.top ?? (sys as any).safeAreaInsets?.top
    if (typeof safeTop === 'number') return safeTop + 44
    return statusBar + 44
  }
}
