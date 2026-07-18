import { Component } from 'react'

// Catches render-time errors anywhere below it so one bad component can't
// white-screen the whole demo. Shows a calm, on-brand fallback with a reload.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface it in the console for debugging; no external reporting in the demo.
    console.error('Vetra dashboard crashed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-cream text-ink flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-line bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-pine text-cream">
            <svg viewBox="0 0 96 96" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M26 34c5-12 16-20 30-20 15 0 26 9 30 21 2 7 1 13-3 17l-7 5" />
              <path d="M26 34c-8 4-13 13-13 22 0 14 11 25 25 25 4 0 8-1 11-3" />
              <path d="M44 30c5 6 7 14 6 22" />
              <path d="M46 81c-1-13 8-24 20-24 4 0 8 1 11 4l6-7 2 11c2 4 3 8 2 12" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-2 text-sm text-sage leading-relaxed">
            The dashboard hit an unexpected error. Reloading usually clears it.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center justify-center rounded-full bg-pine px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-pine-dark"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
