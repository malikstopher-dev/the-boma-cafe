import StationDisplay from '@/components/StationDisplay'
import ErrorBoundary from '@/components/pos/ErrorBoundary'

export default function BarDisplay() {
  return (
    <ErrorBoundary>
      <StationDisplay
        station="bar"
        title="Bar Display"
        icon="🍸"
        primaryColor="#8b5cf6"
        loginRole="bar"
        accentBgLight="rgba(139,92,246,0.1)"
      />
    </ErrorBoundary>
  )
}
