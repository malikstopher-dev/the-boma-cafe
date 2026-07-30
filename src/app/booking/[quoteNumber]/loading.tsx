import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function BookingPortalLoading() {
  return (
    <>
      <Header />
      <main style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid #d4a853',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '1rem',
        }} />
        <p style={{ color: '#a08060', fontFamily: 'var(--font-body), sans-serif', fontSize: '0.95rem' }}>
          Loading your quotation...
        </p>
      </main>
      <Footer />
    </>
  )
}
