export const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

export const getWeekDay = (date) => {
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekDays[date.getDay()]
}

/** 星期X 格式：星期天、星期一…星期六 */
export const getWeekDayLong = (date) => {
  const weekDays = ['星期天', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return weekDays[date.getDay()]
}

// 计算当年第几周（从1月1日开始计算）
export const getWeekOfYear = (date) => {
  const year = date.getFullYear()
  const firstDay = new Date(year, 0, 1) // 当年1月1日
  
  // 计算从1月1日到当前日期的天数
  const days = Math.floor((date.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24))
  
  // 计算是第几周（从1月1日开始，每7天为一周）
  const weekNumber = Math.floor(days / 7) + 1
  
  return weekNumber
}

// 计算在一起的天数：恋爱纪念日当天为第 1 天
export const getDaysDiff = (startDate) => {
  if (!startDate) {
    return 0
  }
  const start = new Date(startDate)
  if (isNaN(start.getTime())) {
    return 0
  }
  start.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffMs = now.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return diffDays + 1 // 纪念日当天为第 1 天
}

export const formatTime = (date) => {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

