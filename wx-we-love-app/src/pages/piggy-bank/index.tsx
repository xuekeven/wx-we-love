import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get, post, del } from '../../utils/request'
import { formatDate } from '../../utils/date'
import './index.scss'

// SavingRecord: { id, amount, type: 'income'|'expense', category, description, createdAt }

export default function PiggyBank() {
  const [records, setRecords] = useState([])
  const [totalSavings, setTotalSavings] = useState(0)

  useEffect(() => {
    loadRecords()
  }, [])

  useEffect(() => {
    calculateTotal()
  }, [records])

  const loadRecords = async () => {
    try {
      const res = await get('/api/piggy-bank')
      if (res && res.data) {
        setRecords(res.data)
      }
    } catch (error) {
      console.log('加载存钱罐失败')
    }
  }

  const calculateTotal = () => {
    const total = records.reduce((sum, record) => {
      return sum + (record.type === 'income' ? record.amount : -record.amount)
    }, 0)
    setTotalSavings(total)
  }

  const handleAdd = () => {
    Taro.showToast({ title: '功能开发中', icon: 'none' })
  }

  const handleDelete = async (id) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await del(`/api/piggy-bank/${id}`)
            setRecords(records.filter(r => r.id !== id))
            Taro.showToast({ title: '删除成功', icon: 'success' })
          } catch (error) {
            console.log('删除失败')
          }
        }
      }
    })
  }

  return (
    <View className='piggy-bank-page'>
      <View className='page-header'>
        <Text className='page-title'>🐷 存钱罐</Text>
        <Text className='page-subtitle'>为梦想储蓄每一分</Text>
      </View>

      <View className='total-section'>
        <View className='total-card'>
          <Text className='total-label'>当前存款</Text>
          <Text className='total-amount'>¥ {totalSavings.toFixed(2)}</Text>
        </View>
      </View>

      <Button className='add-btn' onClick={handleAdd}>
        <Text className='add-icon'>+</Text>
        <Text>添加记录</Text>
      </Button>

      <ScrollView scrollY className='record-list'>
        {records.map((record) => (
          <View key={record.id} className={`record-item ${record.type}`}>
            <View className='record-info'>
              <View className='record-header'>
                <Text className='record-category'>{record.category}</Text>
                <Text className={`record-amount ${record.type}`}>
                  {record.type === 'income' ? '+' : '-'}¥{record.amount.toFixed(2)}
                </Text>
              </View>
              {record.description && (
                <Text className='record-description'>{record.description}</Text>
              )}
              <Text className='record-date'>{formatDate(new Date(record.createdAt))}</Text>
            </View>
            <View className='record-actions'>
              <View className='delete-btn' onClick={() => handleDelete(record.id)}>
                <Text>删除</Text>
              </View>
            </View>
          </View>
        ))}

        {records.length === 0 && (
          <View className='empty-state'>
            <Text className='empty-icon'>💰</Text>
            <Text className='empty-text'>还没有记录，开始存钱吧～</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

