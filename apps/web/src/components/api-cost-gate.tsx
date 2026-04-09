'use client'

interface ApiCostGateProps {
  onFetch: () => void
  loading: boolean
  description?: string
}

export default function ApiCostGate({ onFetch, loading, description }: ApiCostGateProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 text-center space-y-3">
      <div className="text-amber-600 text-sm font-medium">
        ⚠️ このページは X API を呼び出すため、X 公式の使用料が発生します
      </div>
      <p className="text-xs text-amber-500">
        ※ X Harness が課金することはありません。費用は X Developer Console のクレジットから差し引かれます。
      </p>
      {description && (
        <p className="text-xs text-amber-500">{description}</p>
      )}
      <button
        onClick={onFetch}
        disabled={loading}
        className="px-5 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? '取得中...' : 'X API からデータを取得'}
      </button>
    </div>
  )
}
