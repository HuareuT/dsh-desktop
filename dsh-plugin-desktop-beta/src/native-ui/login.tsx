/** Sign-in gate rendered before the Host ever starts. */
import { useId, useState } from 'react'
import { Button } from '../../../dsh-plugin-desktop/src/native-ui/components/ui/button.tsx'
import { Input } from '../../../dsh-plugin-desktop/src/native-ui/components/ui/input.tsx'
import { Label } from '../../../dsh-plugin-desktop/src/native-ui/components/ui/label.tsx'
import { DesktopFrame } from '../../../dsh-plugin-desktop/src/native-ui/shared/DesktopFrame.tsx'
import type { DesktopBridge } from '../desktop-contract.ts'

/** Same location-pin silhouette as the sidebar brand mark, so the gate reads as the same product. */
function PinGlyph(): JSX.Element {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 1.8C7.9 1.8 4.6 5.1 4.6 9.2c0 5.6 7.4 13 7.4 13s7.4-7.4 7.4-13c0-4.1-3.3-7.4-7.4-7.4z" fill="currentColor" />
    <circle cx="12" cy="9.2" r="2.8" fill="#fff" />
  </svg>
}

function EyeGlyph({ open }: { open: boolean }): JSX.Element {
  return open
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10.7 5.1A9.9 9.9 0 0 1 12 5c5 0 9 4.3 9 7 0 1-1 2.4-2.6 3.7" />
        <path d="M6.6 6.6C4.2 8.2 3 10.3 3 12c0 2.7 4 7 9 7 2 0 3.8-.7 5.3-1.8" />
        <path d="M3 3l18 18" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      </svg>
    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12c0-2.7 4-7 9-7s9 4.3 9 7-4 7-9 7-9-4.3-9-7Z" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
}

function WarnGlyph(): JSX.Element {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3.6 2.9 19.4a1 1 0 0 0 .9 1.5h16.4a1 1 0 0 0 .9-1.5L12 3.6Z" />
    <path d="M12 9.4v4.2" />
    <path d="M12 17.1h.01" />
  </svg>
}

/**
 * Electron rejects a renderer→main call as "Error invoking remote method '<channel>': Error: <message>".
 * The user only needs <message> (already localized in the main process), so drop the transport wrapper.
 */
function readFailure(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : String(error)
  const message = raw
    .replace(/^Error invoking remote method '[^']*':\s*/i, '')
    .replace(/^(?:Error|Uncaught Error):\s*/i, '')
    .trim()
  return message === '' ? fallback : message
}

export function TravelLogin({ bridge, locale }: { bridge: Pick<DesktopBridge, 'command'>; locale: 'zh' | 'en' }) {
  const t = (zh: string, en: string) => locale === 'zh' ? zh : en
  const userField = useId()
  const passField = useId()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const ready = username.trim() !== '' && password !== ''
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy || !ready) return
    setFailure(''); setBusy(true)
    try {
      // The main process performs the network call; the renderer only relays credentials over IPC.
      await bridge.command({ type: 'travel-login', username, password })
    } catch (error) {
      setFailure(readFailure(error, t('登录失败，请稍后重试。', 'Sign-in failed. Try again in a moment.')))
      setBusy(false)
    }
  }
  return <>
    <DesktopFrame />
    <main className="tbLogin dshNativeContent">
      <form className="tbLoginCard" onSubmit={submit}>
        <div className="tbLoginHead">
          <span className="tbLoginMark"><PinGlyph /></span>
          <h1 className="tbLoginTitle">Travel Buddy</h1>
        </div>
        <div className="tbLoginFields">
          <div className="tbLoginField">
            <Label htmlFor={userField}>{t('用户名', 'Username')}</Label>
            <Input id={userField} autoFocus autoComplete="username" spellCheck={false} value={username} onChange={event => setUsername(event.target.value)} disabled={busy} />
          </div>
          <div className="tbLoginField">
            <Label htmlFor={passField}>{t('密码', 'Password')}</Label>
            <div className="tbLoginSecret">
              <Input id={passField} type={revealed ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} />
              <button type="button" className="tbLoginReveal" tabIndex={-1} disabled={busy}
                aria-label={revealed ? t('隐藏密码', 'Hide password') : t('显示密码', 'Show password')}
                onClick={() => setRevealed(value => !value)}><EyeGlyph open={revealed} /></button>
            </div>
          </div>
        </div>
        {failure ? <div className="tbLoginAlert" role="alert"><WarnGlyph /><span>{failure}</span></div> : undefined}
        <Button type="submit" size="lg" className="tbLoginSubmit" data-busy={busy ? 'true' : 'false'} disabled={busy || !ready}>
          {busy ? <><span className="tbLoginSpinner" aria-hidden="true" />{t('正在登录…', 'Signing in…')}</> : t('登录', 'Sign in')}
        </Button>
      </form>
    </main>
  </>
}