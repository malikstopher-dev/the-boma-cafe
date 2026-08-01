import StationDisplay from '@/components/StationDisplay'
import ErrorBoundary from '@/components/pos/ErrorBoundary'

export default function BarDisplay() {
  return (
    <ErrorBoundary>
      <StationDisplay
        station="bar"
        title="Bar Display"
        icon="🍸"
        primaryColor="#C8A04E"
        loginRole="bar"
        accentBgLight="rgba(139,92,246,0.1)"
      />
    </ErrorBoundary>
  )
}
