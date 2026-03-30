import { render, screen } from '@testing-library/react'
import OfflinePage from '../pages/OfflinePage'

describe('OfflinePage', () => {
  it('affiche le message hors ligne', () => {
    render(<OfflinePage />)
    expect(screen.getByRole('heading', { name: /hors ligne/i })).toBeInTheDocument()
    expect(screen.getByText(/reconnectez-vous/i)).toBeInTheDocument()
  })
})
