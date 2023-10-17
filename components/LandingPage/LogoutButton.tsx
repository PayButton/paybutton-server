import { MouseEventHandler } from 'react'
import Link from 'next/link'
import Session from 'supertokens-web-js/recipe/session'

interface LogoutProps {
  onClick: MouseEventHandler<HTMLAnchorElement>
  footer: boolean
}

async function handleLogout (): Promise<void> {
  await Session.signOut()
  window.location.href = '/signin'
}

const LogoutButton: React.FC<LogoutProps> = ({ footer }) => {
  return (
      <Link
        href="#"
        onClick={(e) => {
          e.preventDefault() // Prevent the default navigation behavior
          void handleLogout() // Call the onClick handler passed in props
        }}
        className={`button_outline button_small ${footer ? 'footer_signup_btn' : ''}`}
      >
        Sign Out
      </Link>
  )
}

export default LogoutButton
