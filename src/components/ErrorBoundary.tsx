import { Component, type ReactNode } from 'react'

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  handleReset = () => {
    // localStorage をクリアしてリセット
    localStorage.clear()
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-gray-500 text-sm">アプリでエラーが発生しました</p>
          <p className="text-xs text-red-400 font-mono break-all max-w-sm">{this.state.error.message}</p>
          <button
            onClick={this.handleReset}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            リセットして再起動
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
