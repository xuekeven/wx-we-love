export default {
  pages: [
    'pages/index/index', // 将首页放在第一位，已登录用户直接进入首页
    'pages/login/index',
    'pages/match/index',
    'pages/anniversary/index',
    'pages/mood-diary/index',
    'pages/mood-diary/list',
    'pages/mood-diary/write',
    'pages/menstrual/index',
    'pages/menstrual/add',
    'pages/moment/index',
    'pages/my/index',
    'pages/my/setting/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    backgroundColor: '#FBF8F4',
    navigationBarBackgroundColor: '#FBF8F4',
    navigationBarTitleText: '恋爱空间',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    custom: false,
    color: '#756960',
    selectedColor: '#94605A',
    backgroundColor: '#FFFEFD',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/icons/home.png',
        selectedIconPath: 'assets/icons/home-active.png'
      },
      {
        pagePath: 'pages/moment/index',
        text: '瞬间',
        iconPath: 'assets/icons/moment.png',
        selectedIconPath: 'assets/icons/moment-active.png'
      },
      {
        pagePath: 'pages/my/index',
        text: '我的',
        iconPath: 'assets/icons/my.png',
        selectedIconPath: 'assets/icons/my-active.png'
      }
    ]
  },
  lazyCodeLoading: 'requiredComponents'
}
