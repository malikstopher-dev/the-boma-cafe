import StationDisplay from '@/components/StationDisplay'
import ErrorBoundary from '@/components/pos/ErrorBoundary'

export default function KitchenDisplay() {
  return (
    <ErrorBoundary>
      <StationDisplay
        station="kitchen"
        title="Kitchen Display"
        icon="👨‍🍳"
        primaryColor="#f59e0b"
        loginRole="kitchen"
        accentBgLight="rgba(245,158,11,0.1)"
      />
    </ErrorBoundary>
  )
}
