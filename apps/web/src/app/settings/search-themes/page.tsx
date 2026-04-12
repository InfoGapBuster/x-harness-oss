'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

interface SearchTheme {
  id: string
  name: string
  query: string
  min_likes: number
  min_retweets: number
  is_active: number
}

export default function SearchThemesPage() {
  const [themes, setThemes] = useState<SearchTheme[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state for new/editing theme
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    query: '',
    min_likes: 50,
    min_retweets: 50,
    is_active: 1
  })

  const loadThemes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.searchThemes.list()
      if (res.success) {
        setThemes(res.data)
      }
    } catch (err: any) {
      setError(err.message || 'テーマの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadThemes()
  }, [loadThemes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await api.searchThemes.update(editingId, formData)
      } else {
        await api.searchThemes.create(formData)
      }
      setEditingId(null)
      setFormData({ name: '', query: '', min_likes: 50, min_retweets: 50, is_active: 1 })
      loadThemes()
    } catch (err: any) {
      alert('保存に失敗しました: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (theme: SearchTheme) => {
    setEditingId(theme.id)
    setFormData({
      name: theme.name,
      query: theme.query,
      min_likes: theme.min_likes,
      min_retweets: theme.min_retweets,
      is_active: theme.is_active
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このテーマを削除しますか？')) return
    try {
      await api.searchThemes.delete(id)
      loadThemes()
    } catch (err: any) {
      alert('削除に失敗しました: ' + err.message)
    }
  }

  const toggleActive = async (theme: SearchTheme) => {
    try {
      await api.searchThemes.update(theme.id, { is_active: theme.is_active ? 0 : 1 })
      loadThemes()
    } catch (err: any) {
      alert('更新に失敗しました: ' + err.message)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">AI検索テーマ設定</h1>
        <p className="text-gray-500 text-sm">毎朝のレポート生成に使用するキーワードとしきい値を設定します。</p>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-bold mb-4">{editingId ? 'テーマを編集' : '新しいテーマを追加'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">テーマ名（管理用）</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full border-gray-200 rounded-lg text-sm"
                placeholder="例: ダイバーシティ"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">検索クエリ</label>
              <input
                type="text"
                value={formData.query}
                onChange={e => setFormData({ ...formData, query: e.target.value })}
                className="w-full border-gray-200 rounded-lg text-sm"
                placeholder="例: ダイバーシティ OR インクルージョン"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">最小いいね数</label>
              <input
                type="number"
                value={formData.min_likes}
                onChange={e => setFormData({ ...formData, min_likes: parseInt(e.target.value) })}
                className="w-full border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">最小リポスト数</label>
              <input
                type="number"
                value={formData.min_retweets}
                onChange={e => setFormData({ ...formData, min_retweets: parseInt(e.target.value) })}
                className="w-full border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active === 1}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-600">このテーマを有効にする</label>
            </div>
            <div className="flex gap-3">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({ name: '', query: '', min_likes: 50, min_retweets: 50, is_active: 1 })
                  }}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  キャンセル
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : (editingId ? '更新する' : '追加する')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 font-bold text-gray-500 uppercase text-[10px] tracking-wider">状態</th>
              <th className="px-6 py-3 font-bold text-gray-500 uppercase text-[10px] tracking-wider">テーマ / クエリ</th>
              <th className="px-6 py-3 font-bold text-gray-500 uppercase text-[10px] tracking-wider">条件</th>
              <th className="px-6 py-3 font-bold text-gray-500 uppercase text-[10px] tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">読み込み中...</td>
              </tr>
            ) : themes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">テーマがありません</td>
              </tr>
            ) : (
              themes.map(theme => (
                <tr key={theme.id} className={theme.is_active ? '' : 'bg-gray-50/50'}>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(theme)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${theme.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${theme.is_active ? 'right-1' : 'left-1'}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{theme.name}</div>
                    <div className="text-gray-500 text-xs truncate max-w-xs">{theme.query}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <div className="flex items-center gap-3">
                      <span>❤️ {theme.min_likes}</span>
                      <span>🔁 {theme.min_retweets}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button
                      onClick={() => handleEdit(theme)}
                      className="text-blue-600 hover:text-blue-800 font-bold text-xs"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(theme.id)}
                      className="text-red-400 hover:text-red-600 font-bold text-xs"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
