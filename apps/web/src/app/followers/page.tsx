'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Follower, Tag, AccountStats, FollowerSnapshot } from '@/lib/api'
import Header from '@/components/layout/header'
import { useCurrentAccountId } from '@/hooks/use-selected-account'

const PAGE_SIZE = 20

function TagBadge({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  const bg = tag.color || '#3B82F6'
  const r = parseInt(bg.slice(1, 3), 16)
  const g = parseInt(bg.slice(3, 5), 16)
  const b = parseInt(bg.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const textColor = luminance > 0.5 ? '#1f2937' : '#ffffff'

  return (
    <span
      style={{ backgroundColor: bg, color: textColor }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
    >
      {tag.name}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70 leading-none">
          ×
        </button>
      )}
    </span>
  )
}

function FollowerRow({
  follower,
  allTags,
  onRefresh,
}: {
  follower: Follower
  allTags: Tag[]
  onRefresh: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [selectedTagId, setSelectedTagId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const tags = follower.tags ?? []
  // Filter to same account and not already attached
  const availableTags = allTags.filter(
    (t) => t.xAccountId === follower.xAccountId && !tags.some((ft) => ft.id === t.id)
  )

  const handleAddTag = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!selectedTagId) return
    setLoading(true)
    setError('')
    try {
      await api.followers.addTag(follower.id, selectedTagId)
      setIsAddingTag(false)
      setSelectedTagId('')
      onRefresh()
    } catch {
      setError('タグの追加に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    setLoading(true)
    setError('')
    try {
      await api.followers.removeTag(follower.id, tagId)
      onRefresh()
    } catch {
      setError('タグの削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

  const initial = follower.username?.charAt(0)?.toUpperCase() ?? follower.displayName?.charAt(0) ?? '?'

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setIsExpanded((v) => !v)}
      >
        {/* Avatar / Username */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {follower.profileImageUrl ? (
              <img
                src={follower.profileImageUrl}
                alt={follower.username ?? ''}
                className="w-9 h-9 rounded-full object-cover bg-gray-100"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
                {initial}
              </div>
            )}
            <p className="text-sm font-medium text-gray-900">
              {follower.username ? `@${follower.username}` : '—'}
            </p>
          </div>
        </td>

        {/* Display Name */}
        <td className="px-4 py-3 text-sm text-gray-700">
          {follower.displayName ?? '—'}
        </td>

        {/* Follower Count */}
        <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">
          {follower.followerCount != null
            ? follower.followerCount.toLocaleString('ja-JP')
            : '—'}
        </td>

        {/* Tags */}
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {tags.length > 0 ? (
              tags.map((tag) => <TagBadge key={tag.id} tag={tag} />)
            ) : (
              <span className="text-xs text-gray-400">なし</span>
            )}
          </div>
        </td>

        {/* First Seen */}
        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
          {formatDate(follower.createdAt)}
        </td>

        {/* Expand indicator */}
        <td className="px-4 py-3 text-right">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform inline-block ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={6} className="px-6 py-4">
            <div className="space-y-3">
              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-gray-600">
                <div>
                  <span className="font-semibold text-gray-500">X User ID: </span>
                  <span className="font-mono">{follower.xUserId}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-500">Following Count: </span>
                  {follower.followingCount != null
                    ? follower.followingCount.toLocaleString('ja-JP')
                    : '—'}
                </div>
                <div>
                  <span className="font-semibold text-gray-500">Is Following: </span>
                  {follower.isFollowing ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-semibold text-gray-500">Is Followed: </span>
                  {follower.isFollowed ? 'Yes' : 'No'}
                </div>
              </div>

              {/* Tag management */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">タグ管理</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <TagBadge
                      key={tag.id}
                      tag={tag}
                      onRemove={() => handleRemoveTag(tag.id)}
                    />
                  ))}
                </div>

                {isAddingTag ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={selectedTagId}
                      onChange={(e) => setSelectedTagId(e.target.value)}
                    >
                      <option value="">タグを選択...</option>
                      {availableTags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddTag}
                      disabled={!selectedTagId || loading}
                      className="px-3 py-1 text-xs font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-opacity"
                    >
                      追加
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsAddingTag(false)
                        setSelectedTagId('')
                      }}
                      className="px-3 py-1 text-xs font-medium rounded-md text-gray-600 bg-gray-200 hover:bg-gray-300 transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  availableTags.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsAddingTag(true)
                      }}
                      className="text-xs font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      タグを追加
                    </button>
                  )
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function FollowerLineChart({ data }: { data: FollowerSnapshot[] }) {
  if (data.length === 0) return null
  const values = data.map((d) => d.followersCount)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return (
    <div className="flex items-end gap-[2px] h-8">
      {data.map((d, i) => {
        const pct = ((d.followersCount - min) / range) * 100
        const height = Math.max(pct, 4)
        return (
          <div
            key={i}
            className="flex-1 rounded-t min-w-[1px] max-w-[4px] transition-opacity hover:opacity-100"
            style={{ height: `${height}%`, backgroundColor: '#c7d2fe', opacity: 0.6 }}
            title={`${d.recordedAt}: ${d.followersCount.toLocaleString('ja-JP')}`}
          />
        )
      })}
    </div>
  )
}

function GrowthBadge({ value, label }: { value: number | null; label: string }) {
  if (value === null || value === undefined) return null
  const color = value >= 0 ? 'text-green-600' : 'text-red-600'
  const prefix = value >= 0 ? '+' : ''
  return (
    <span>
      <span className="text-gray-400">{label}</span>{' '}
      <span className={`font-semibold ${color}`}>{prefix}{value.toLocaleString('ja-JP')}</span>
    </span>
  )
}

export default function FollowersPage() {
  const selectedAccountId = useCurrentAccountId()
  const [followers, setFollowers] = useState<Follower[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [selectedTagId, setSelectedTagId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null)

  const loadTags = useCallback(async () => {
    try {
      const res = await api.tags.list()
      if (res.success) setAllTags(res.data)
    } catch {
      // Non-blocking
    }
  }, [])

  const loadFollowers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.followers.list({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        tagId: selectedTagId || undefined,
        xAccountId: selectedAccountId || undefined,
      })
      if (res.success) {
        setFollowers(res.data.items)
        setTotal(res.data.total)
        setHasNextPage(res.data.hasNextPage)
      } else {
        setError(res.error ?? 'エラーが発生しました')
      }
    } catch {
      setError('フォロワーの読み込みに失敗しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }, [page, selectedTagId, selectedAccountId])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  useEffect(() => {
    setPage(1)
  }, [selectedTagId])

  useEffect(() => {
    loadFollowers()
  }, [loadFollowers])

  useEffect(() => {
    if (!selectedAccountId) return
    let cancelled = false
    async function loadStats() {
      try {
        const res = await api.accounts.stats(selectedAccountId)
        if (!cancelled && res.success) setAccountStats(res.data)
      } catch { /* non-blocking */ }
    }
    loadStats()
    return () => { cancelled = true }
  }, [selectedAccountId])

  return (
    <div>
      <Header
        title="Followers"
        description="エンゲージメントゲート通過者の管理。Xフォロワー数の推移はダッシュボードで確認できます。"
        action={
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
            {total.toLocaleString('ja-JP')} 人
          </span>
        }
      />

      {/* Account follower stats - compact */}
      {accountStats?.current && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-5 py-3 mb-4 flex items-center gap-6">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-gray-900">{accountStats.current.followersCount.toLocaleString('ja-JP')}</span>
            <span className="text-xs text-gray-400">フォロワー</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <GrowthBadge value={accountStats.growth.days7} label="7d" />
            <GrowthBadge value={accountStats.growth.days30} label="30d" />
          </div>
          <div className="flex-1 max-w-[200px] ml-auto">
            <FollowerLineChart data={accountStats.history} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium whitespace-nowrap">タグで絞り込み:</label>
          <select
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedTagId}
            onChange={(e) => setSelectedTagId(e.target.value)}
          >
            <option value="">すべて</option>
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
        <span className="text-sm text-gray-500">
          {loading ? '読み込み中...' : `${total.toLocaleString('ja-JP')} 件`}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 p-4 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-4 py-4 border-b border-gray-100 flex items-center gap-4 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-32" />
                <div className="h-2 bg-gray-100 rounded w-20" />
              </div>
              <div className="h-5 bg-gray-100 rounded-full w-16" />
              <div className="h-5 bg-gray-100 rounded-full w-12" />
              <div className="h-3 bg-gray-100 rounded w-20" />
            </div>
          ))}
        </div>
      ) : followers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-400">フォロワーが見つかりません</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Avatar / Username
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Display Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Followers
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    First Seen
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {followers.map((follower) => (
                  <FollowerRow
                    key={follower.id}
                    follower={follower}
                    allTags={allTags}
                    onRefresh={loadFollowers}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-4">
          <p className="text-sm text-gray-500">
            {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, total)} 件 / 全{total.toLocaleString('ja-JP')}件
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 px-1">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNextPage}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
