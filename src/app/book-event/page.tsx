import { Metadata } from 'next'
import BookingWizard from '@/components/booking/BookingWizard'

export const metadata: Metadata = {
  title: 'Book Your Event | The Boma Café Sandton',
  description: 'Book your event at The Boma Café. Get an instant quotation for birthdays, weddings, corporate events, and more.',
}

export default function BookEventPage() {
  return (
    <main>
      <BookingWizard />
    </main>
  )
}