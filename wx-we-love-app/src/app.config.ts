export default {
  pages: [
    'pages/index/index',
    'pages/wishlist/index',
    'pages/date-record/index',
    'pages/anniversary/index',
    'pages/notebook/index',
    'pages/piggy-bank/index',
    'pages/menstrual/index',
    'pages/menstrual/add',
    'pages/moment/index',
    'pages/my/index'
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

