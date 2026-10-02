import { useEffect } from 'react'
import style from './communitydialog.module.css'

interface CommunityDialogProps {
  open: boolean
  onClose: () => void
}

const COMMUNITY_LINKS = [
  {
    label: 'Telegram',
    href: 'https://t.me/paybutton'
  },
  {
    label: 'X',
    href: 'https://x.com/thepaybutton'
  },
  {
    label: 'GitHub',
    href: 'https://github.com/paybutton'
  }
]

export default function CommunityDialog ({ open, onClose }: CommunityDialogProps): JSX.Element | null {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={style.backdrop} onClick={onClose} role="presentation">
      <div
        className={style.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="community-dialog-title">Community</h2>
        <p>
          PayButton is a community-driven open-source project. Join the
          conversation, follow updates, and contribute.
        </p>
        <div className={style.links}>
          {COMMUNITY_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
        </div>
        <button type="button" className={style.close} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
