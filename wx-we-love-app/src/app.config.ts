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
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FF6B9D',
    navigationBarTitleText: '恋爱空间',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    custom: false,
    color: '#999999',
    selectedColor: '#FF6B9D',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: 'Home',
        iconPath: 'assets/icons/home.png',
        selectedIconPath: 'assets/icons/home-active.png'
      },
      {
        pagePath: 'pages/moment/index',
        text: 'Moment',
        iconPath: 'assets/icons/moment.png',
        selectedIconPath: 'assets/icons/moment-active.png'
      },
      {
        pagePath: 'pages/my/index',
        text: 'My',
        iconPath: 'assets/icons/my.png',
        selectedIconPath: 'assets/icons/my-active.png'
      }
    ]
  }
}

