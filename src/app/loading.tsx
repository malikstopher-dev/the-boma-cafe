export default function Loading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0A0604',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '3px solid rgba(194, 106, 45, 0.2)',
          borderTopColor: '#c26a2d',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}