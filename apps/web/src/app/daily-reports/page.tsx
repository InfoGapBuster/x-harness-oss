'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { CollectedPost } from '@/lib/api'
import Header from '@/components/layout/header'
import { useCurrentAccountId } from '@/hooks/use-selected-account'

export default function DailyReportsPage() {
  const selectedAccountId = useCurrentAccountId()
  const [reports, setReports] = useState<CollectedPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [replyTarget, setReplyTarget] = useState<CollectedPost | null>(null)
  const [replyType, setReplyType] = useState<'reply' | 'quote'>('reply')
  const [replyText, setReplyText] = useState('')
  const [posting, setPosting] = useState(false)
  const [pendingPosts, setPendingPosts] = useState<CollectedPost[]>([])
  const [executing, setExecuting] = useState(false)
  const [executeResults, setExecuteResults] = useState<{ text: string; success: boolean; url?: string; error?: string }[] | null>(null)

  const loadPending = useCallback(async () => {
    if (!selectedAccountId) return
    try {
      const res = await api.posts.listPending(selectedAccountId)
      if (res.success) setPendingPosts(res.data || [])
    } catch {}
  }, [selectedAccountId])

  const handleExecutePending = async () => {
    if (!selectedAccountId || executing) return
    setExecuting(true)
    setExecuteResults(null)
    try {
      const res = await api.posts.executePending(selectedAccountId)
      if (res.success) {
        setExecuteResults(res.data?.results ?? [])
        setPendingPosts([])
      } else {
        alert('実行失敗: ' + ((res as any).error || 'unknown'))
      }
    } catch (err: any) {
      alert('エラー: ' + err.message)
    } finally {
      setExecuting(false)
    }
  }

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      console.log('Fetching reports with accountId:', selectedAccountId);
      const res = await api.reports.list({ xAccountId: selectedAccountId || '', query: 'daily_report', limit: 10 })
      console.log('Reports API Response:', res);
      if (res.success) {
        setReports(res.data || [])
      }
    } catch (err: any) {
      console.error('Failed to load reports:', err);
      setError(err.message || 'レポートの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [selectedAccountId])

  useEffect(() => {
    loadReports()
    loadPending()
  }, [loadReports, loadPending])

  const prepareAction = (post: CollectedPost, type: 'reply' | 'quote') => {
    setReplyTarget(post)
    setReplyType(type)
    setReplyText(post.replyDraft || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePostAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccountId || !replyTarget || !replyText.trim()) return
    setPosting(true)
    try {
      const res = await api.posts.savePending({
        xAccountId: selectedAccountId,
        text: replyText,
        actionType: replyType,
        targetTweetId: replyTarget.id,
      })
      if (res.success) {
        setReplyTarget(null)
        setReplyText('')
        await loadPending()
      } else {
        alert('失敗しました: ' + ((res as any).error || 'unknown'))
      }
    } catch (err: any) {
      alert('エラー: ' + err.message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <Header title="デイリーレポート" description="伊藤芳浩の視点による注目ポスト10選" />

      {/* Pending Posts Banner */}
      {(pendingPosts.length > 0 || executeResults) && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          {executeResults ? (
            <div>
              <p className="font-bold text-amber-800 mb-2">実行結果</p>
              <ul className="space-y-1 text-sm">
                {executeResults.map((r, i) => (
                  <li key={i} className={r.success ? 'text-green-700' : 'text-red-600'}>
                    {r.success ? '✓' : '✗'} {r.text}…
                    {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="ml-2 underline text-blue-600">表示</a>}
                    {r.error && <span className="ml-2 text-red-500">{r.error}</span>}
                  </li>
                ))}
              </ul>
              <button onClick={() => setExecuteResults(null)} className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline">閉じる</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-amber-800 text-sm font-medium">
                投稿待ち: <span className="font-bold text-amber-900">{pendingPosts.length}件</span>
              </p>
              <button
                onClick={handleExecutePending}
                disabled={executing}
                className="bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-amber-600 disabled:opacity-50 transition-all active:scale-95"
              >
                {executing ? '投稿中...' : '今すぐ投稿する'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Form */}
      {replyTarget && (
        <div className="bg-blue-50 border-2 border-blue-500 rounded-xl p-6 mb-8 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-blue-800 flex items-center gap-2 text-lg">
              {replyType === 'reply' ? '💬 伊藤芳浩として返信' : '🔁 伊藤芳浩として引用RT'}
              <span className="text-sm font-normal text-blue-600 bg-blue-100 px-2 py-0.5 rounded">to @{replyTarget.authorUsername}</span>
            </h3>
            <button onClick={() => setReplyTarget(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
          <form onSubmit={handlePostAction} className="space-y-4">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full border-blue-200 rounded-lg p-4 text-base focus:ring-blue-500 focus:border-blue-500 min-h-[150px] shadow-inner"
              placeholder="誠実で洞察に満ちたメッセージを..."
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReplyTarget(null)}
                className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={posting || !replyText.trim()}
                className="bg-blue-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 shadow-md transition-all active:scale-95"
              >
                {posting ? '追加中...' : '投稿待ちに追加'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-extrabold text-gray-900">今日の注目ポスト</h2>
        <p className="text-sm text-gray-500">テーマ: ダイバーシティ、インクルージョン、人権、手話</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white border-2 border-dashed rounded-2xl p-20 text-center text-gray-400">
          <p className="text-lg">まだレポートが生成されていません。</p>
          <p className="text-sm mt-2">Claude Code から generate_daily_report を実行してください。</p>
        </div>
      ) : (
        <div className="space-y-8">
          {reports.map((post) => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="p-6">
                {/* 1. Author Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-inner">
                    {post.authorUsername ? post.authorUsername[0].toUpperCase() : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-900 text-lg truncate">{post.authorDisplayName || post.authorUsername || 'Unknown User'}</span>
                      {post.authorUsername && (
                        <a 
                          href={`https://x.com/${post.authorUsername}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-500 hover:underline text-sm font-medium"
                        >
                          @{post.authorUsername}
                        </a>
                      )}
                    </div>
                    {/* Author Bio/Description (NEW) */}
                    {(post as any).author_description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">
                        {(post as any).author_description}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded border border-gray-100">
                    {post.createdAt ? new Date(post.createdAt).toLocaleDateString('ja-JP') : '不明な日付'}
                  </div>
                </div>

                {/* 2. Post Content */}
                <div className="text-gray-800 text-[15px] mb-6 leading-relaxed bg-gray-50/50 p-5 rounded-xl border border-gray-100 relative quote-style">
                  <span className="absolute top-2 left-2 text-gray-200 text-4xl font-serif">“</span>
                  <div className="relative z-10 pl-4">{post.text}</div>
                </div>

                {/* 3. Metrics (NEW) */}
                <div className="flex gap-6 mb-6 px-2">
                  <div className="flex items-center gap-1.5 text-gray-600 group">
                    <span className="text-red-400 group-hover:scale-125 transition-transform">❤️</span>
                    <span className="text-sm font-bold">{post.publicMetrics?.like_count?.toLocaleString() ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600 group">
                    <span className="text-green-400 group-hover:scale-125 transition-transform">🔁</span>
                    <span className="text-sm font-bold">{post.publicMetrics?.retweet_count?.toLocaleString() ?? 0}</span>
                  </div>
                </div>

                {/* 4. AI Commentary */}
                {post.commentary && (
                  <div className="mb-8 border-t border-gray-100 pt-6">
                    <div className="text-xs font-black text-blue-600 uppercase mb-3 flex items-center gap-2 tracking-widest">
                      <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                      伊藤芳浩の解説と洞察
                    </div>
                    <div className="text-[14px] text-gray-700 bg-blue-50/50 p-5 rounded-2xl leading-relaxed border-l-4 border-blue-400 font-medium">
                      {post.commentary}
                    </div>
                  </div>
                )}

                {/* 5. Action Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={() => prepareAction(post, 'reply')}
                    className="flex items-center justify-center gap-2 bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 py-3 rounded-xl text-sm font-black transition-all active:scale-95"
                  >
                    💬 返信案をセット
                  </button>
                  <button
                    onClick={() => prepareAction(post, 'quote')}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 py-3 rounded-xl text-sm font-black shadow-lg shadow-blue-200 transition-all active:scale-95"
                  >
                    🔁 引用RT案をセット
                  </button>
                </div>
                
                <div className="mt-4 text-center">
                  <a
                    href={`https://x.com/i/status/${post.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-gray-400 hover:text-gray-600 underline uppercase tracking-tighter"
                  >
                    View Original on X.com
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
