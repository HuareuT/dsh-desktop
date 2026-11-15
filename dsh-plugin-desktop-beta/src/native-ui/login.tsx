/** T8 PoC: login gate page rendered before the Host ever starts. */
import { useState } from 'react'
import { Button } from '../../../dsh-plugin-desktop/src/native-ui/components/ui/button.tsx'
import { Input } from '../../../dsh-plugin-desktop/src/native-ui/components/ui/input.tsx'
import { Label } from '../../../dsh-plugin-desktop/src/native-ui/components/ui/label.tsx'
import { Alert, AlertDescription } from '../../../dsh-plugin-desktop/src/native-ui/components/ui/alert.tsx'
import { DesktopFrame } from '../../../dsh-plugin-desktop/src/native-ui/shared/DesktopFrame.tsx'
import type { DesktopBridge } from '../desktop-contract.ts'

export function TravelLogin({ bridge, locale }: { bridge: Pick<DesktopBridge, 'command'>; locale: 'zh' | 'en' }) {
  const t = (zh: string, en: string) => locale === 'zh' ? zh : en
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setFailure(''); setBusy(true)
    try {
      // The main process performs the network call; the renderer only relays credentials over IPC.
      await bridge.command({ type: 'travel-login', username, password })
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error))
      setBusy(false)
    }
  }
  return <>
    <DesktopFrame />
    <main className="dshNativeContent p-6" style={{ minHeight: '100vh', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={submit} style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{t('登录 Travel Buddy', 'Sign in to Travel Buddy')}</h1>
          <p style={{ fontSize: 13, opacity: 0.7, margin: 0 }}>{t('登录后才能使用本产品。', 'Sign in to continue to this product.')}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Label htmlFor="travel-user">{t('用户名', 'Username')}</Label>
          <Input id="travel-user" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} disabled={busy} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Label htmlFor="travel-pass">{t('密码', 'Password')}</Label>
          <Input id="travel-pass" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} />
        </div>
        {failure ? <Alert variant="destructive"><AlertDescription>{failure}</AlertDescription></Alert> : undefined}
        <Button type="submit" disabled={busy || !username || !password}>{busy ? t('正在登录…', 'Signing in…') : t('登录', 'Sign in')}</Button>
        <p style={{ fontSize: 12, opacity: 0.55, margin: 0 }}>{t('演示账号 demo / travel2026（用户）· admin / travel2026（管理员）', 'Demo: demo / travel2026 (user) · admin / travel2026 (admin)')}</p>
      </form>
    </main>
  </>
}
