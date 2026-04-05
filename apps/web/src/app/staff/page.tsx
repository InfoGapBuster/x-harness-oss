'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { StaffMember } from '@/lib/api'
import Header from '@/components/layout/header'

function RoleBadge({ role }: { role: StaffMember['role'] }) {
  const config: Record<StaffMember['role'], { bg: string; text: string; label: string }> = {
    admin: { bg: 'bg-red-100', text: 'text-red-700', label: '管理者' },
    editor: { bg: 'bg-blue-100', text: 'text-blue-700', label: '編集者' },
    viewer: { bg: 'bg-gray-100', text: 'text-gray-600', label: '閲覧者' },
  }
  const c = config[role]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Create form state
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState<StaffMember['role']>('editor')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Toggle state
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadStaff = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.staff.list()
      if (res.success) {
        setStaff(res.data)
      } else {
        setError(res.error ?? 'エラーが発生しました')
      }
    } catch {
      setError('スタッフの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return
    setCreating(true)
    setCreateError('')
    setNewApiKey(null)
    try {
      const res = await api.staff.create({ name: formName.trim(), role: formRole })
      if (res.success) {
        setNewApiKey(res.data.plainApiKey)
        setFormName('')
        setFormRole('editor')
        loadStaff()
      } else {
        setCreateError(res.error ?? 'エラーが発生しました')
      }
    } catch {
      setCreateError('スタッフの追加に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (member: StaffMember) => {
    setTogglingId(member.id)
    try {
      await api.staff.update(member.id, { isActive: !member.isActive })
      loadStaff()
    } catch {
      setError('ステータスの更新に失敗しました')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (member: StaffMember) => {
    if (!confirm(`「${member.name}」を削除しますか？この操作は取り消せません。`)) return
    setDeletingId(member.id)
    try {
      await api.staff.delete(member.id)
      loadStaff()
    } catch {
      setError('スタッフの削除に失敗しました')
    } finally {
      setDeletingId(null)
    }
  }

  const handleCopyKey = async () => {
    if (!newApiKey) return
    await navigator.clipboard.writeText(newApiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <Header
        title="スタッフ管理"
        description="ダッシュボードアクセスの管理"
        action={
          <button
            onClick={() => { setShowCreateForm((v) => !v); setNewApiKey(null); setCreateError('') }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {showCreateForm ? 'キャンセル' : '+ スタッフ追加'}
          </button>
        }
      />

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">新規スタッフ追加</h2>
          {createError && (
            <div className="mb-4 bg-red-50 border border-red-200 p-3 text-red-700 text-sm rounded-lg">
              {createError}
            </div>
          )}

          {/* Newly generated API key notice */}
          {newApiKey && (
            <div className="mb-4 bg-amber-50 border border-amber-300 p-4 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 mb-2">
                APIキーが生成されました。このキーは一度しか表示されません。
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-white border border-amber-200 rounded px-3 py-2 text-amber-900 break-all">
                  {newApiKey}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="shrink-0 text-xs px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                >
                  {copied ? 'コピー済み' : 'コピー'}
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: 田中太郎"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ロール</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as StaffMember['role'])}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="admin">管理者 (admin)</option>
                  <option value="editor">編集者 (editor)</option>
                  <option value="viewer">閲覧者 (viewer)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setNewApiKey(null) }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                閉じる
              </button>
              <button
                type="submit"
                disabled={creating || !formName.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {creating ? '追加中...' : '追加'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 p-4 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Staff list */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-4 py-4 border-b border-gray-100 animate-pulse">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="h-5 bg-gray-100 rounded-full w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-400">スタッフが登録されていません。「+ スタッフ追加」から追加してください。</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">名前</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ロール</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">最終ログイン</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ステータス</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={member.role} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {member.lastLoginAt
                        ? new Date(member.lastLoginAt).toLocaleString('ja-JP', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '未ログイン'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {member.isActive ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(member)}
                          disabled={togglingId === member.id}
                          className={`text-xs px-3 py-1.5 rounded-md border font-medium disabled:opacity-50 transition-colors ${
                            member.isActive
                              ? 'text-gray-600 border-gray-200 hover:bg-gray-50'
                              : 'text-blue-500 border-blue-100 hover:bg-blue-50'
                          }`}
                        >
                          {togglingId === member.id ? '更新中...' : member.isActive ? '無効化' : '有効化'}
                        </button>
                        <button
                          onClick={() => handleDelete(member)}
                          disabled={deletingId === member.id}
                          className="text-xs text-red-500 hover:text-red-600 px-3 py-1.5 rounded-md border border-red-100 hover:border-red-200 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === member.id ? '削除中...' : '削除'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
