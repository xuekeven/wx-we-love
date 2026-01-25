import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { get, del } from '../../utils/request'
import { formatDate } from '../../utils/date'
import './index.scss'

// Note: { id, title, content, mood, createdAt, updatedAt }

export default function Notebook() {
  const [notes, setNotes] = useState([])

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    try {
      const res = await get('/api/notes')
      if (res && res.success && res.data && Array.isArray(res.data)) {
        setNotes(res.data)
      } else {
        console.log('加载记事本失败', res?.message || '')
        setNotes([])
      }
    } catch (error) {
      console.log('加载记事本失败', error)
      setNotes([])
    }
  }

  const handleAdd = () => {
    Taro.showToast({ title: '功能开发中', icon: 'none' })
  }

  const handleDelete = async (id) => {
    Taro.showModal({
      title: '确认删除',
      content: '确定要删除这条笔记吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const deleteRes = await del(`/api/notes/${id}`)
            if (deleteRes && deleteRes.success) {
              setNotes(notes.filter(n => n.id !== id))
              Taro.showToast({ title: deleteRes.message || '删除成功', icon: 'success' })
            } else {
              Taro.showToast({ title: deleteRes?.message || '删除失败', icon: 'none' })
            }
          } catch (error) {
            Taro.showToast({ title: '删除失败，请重试', icon: 'none' })
          }
        }
      }
    })
  }

  return (
    <View className='notebook-page'>
      <View className='page-header'>
        <Text className='page-title'>📝 记事本</Text>
        <Text className='page-subtitle'>记录生活的点点滴滴</Text>
      </View>

      <Button className='add-btn' onClick={handleAdd}>
        <Text className='add-icon'>+</Text>
        <Text>新建笔记</Text>
      </Button>

      <ScrollView scrollY className='note-list'>
        {notes.map((note) => (
          <View key={note.id} className='note-item'>
            <View className='note-header'>
              <View className='note-title-row'>
                <Text className='note-mood'>{note.mood}</Text>
                <Text className='note-title'>{note.title}</Text>
              </View>
              <Text className='note-date'>{formatDate(new Date(note.createdAt))}</Text>
            </View>
            <Text className='note-content'>{note.content}</Text>
            <View className='note-actions'>
              <View className='delete-btn' onClick={() => handleDelete(note.id)}>
                <Text>删除</Text>
              </View>
            </View>
          </View>
        ))}

        {notes.length === 0 && (
          <View className='empty-state'>
            <Text className='empty-icon'>✍️</Text>
            <Text className='empty-text'>还没有笔记，快来记录吧～</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

