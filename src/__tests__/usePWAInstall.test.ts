import { act, renderHook } from '@testing-library/react'
import { usePWAInstall } from '../hooks/usePWAInstall'

function fireBeforeInstallPrompt() {
  const event = new Event('beforeinstallprompt')
  Object.assign(event, {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: 'accepted' as const }),
  })
  window.dispatchEvent(event)
  return event as Event & { prompt: ReturnType<typeof vi.fn>; userChoice: Promise<{ outcome: 'accepted' }> }
}

describe('usePWAInstall', () => {
  beforeEach(() => {
    // Simulate non-standalone mode
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    })
  })

  it('canInstall est false initialement (pas de prompt)', () => {
    const { result } = renderHook(() => usePWAInstall())
    expect(result.current.canInstall).toBe(false)
  })

  it('canInstall devient true quand beforeinstallprompt se déclenche', async () => {
    const { result } = renderHook(() => usePWAInstall())
    await act(async () => {
      fireBeforeInstallPrompt()
    })
    expect(result.current.canInstall).toBe(true)
  })

  it('install appelle prompt() et met canInstall à false après acceptation', async () => {
    const { result } = renderHook(() => usePWAInstall())
    let event: ReturnType<typeof fireBeforeInstallPrompt>
    await act(async () => {
      event = fireBeforeInstallPrompt()
    })
    await act(async () => {
      await result.current.install()
    })
    expect(event!.prompt).toHaveBeenCalled()
    expect(result.current.canInstall).toBe(false)
  })

  it('canInstall est false si display-mode standalone', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    })
    const { result } = renderHook(() => usePWAInstall())
    expect(result.current.canInstall).toBe(false)
  })
})
