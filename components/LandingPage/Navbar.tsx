import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import style from 'styles/landing.module.css'
import logoImageSource from 'assets/logo.png'
import dynamic from 'next/dynamic'
import LogoutButton from './LogoutButton'
import CommunityDialog from 'components/CommunityDialog'

const ThemeToggle = dynamic(
  async () => await import('components/Sidebar/themetoggle'),
  {
    ssr: false
  }
)

interface IProps {
  userId?: string
}

export default function Navbar ({ userId }: IProps): JSX.Element {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [communityOpen, setCommunityOpen] = useState(false)

  useEffect(() => {
    if (!aboutOpen) return undefined
    const closeAbout = (event: MouseEvent): void => {
      const target = event.target as HTMLElement
      if (target.closest('[data-about-menu]') === null) setAboutOpen(false)
    }
    document.addEventListener('mousedown', closeAbout)
    return () => document.removeEventListener('mousedown', closeAbout)
  }, [aboutOpen])

  const openCommunity = (): void => {
    setAboutOpen(false)
    setMobileMenu(false)
    setCommunityOpen(true)
  }

  return (
    <div className={style.navbar_ctn}>
      <div className={style.navbar_inner}>
        <div className={style.navbar_logo_mobile}>
          <Image src={logoImageSource} alt="PayButton" />
          <div className={style.menubtn_ctn_outer}>
            <input
              id="menu__toggle"
              className={style.menubtn_ctn}
              type="checkbox"
              checked={mobileMenu}
              onClick={() => setMobileMenu(!mobileMenu)}
            />
            <label className={style.menu_btn} htmlFor="menu__toggle">
              <span></span>
            </label>
          </div>
        </div>
        <div
          className={style.navlink_ctn}
          style={mobileMenu ? { left: '0' } : { left: '-200px' }}
        >
          <ThemeToggle chart={false} setChart={() => {}} landingpage={true} />
          <a href="#button-generator" onClick={() => setMobileMenu(false)}>
            Button Generator
          </a>
          <a href="#wordpress" onClick={() => setMobileMenu(false)}>
            WordPress
          </a>
          <Link
            href="https://github.com/paybutton"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenu(false)}
          >
            GitHub
          </Link>
          <Link
            href="https://t.me/paybutton"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenu(false)}
          >
            Telegram
          </Link>
          <Link
            href="https://docs.paybutton.org/#/?id=what-is-paybutton"
            onClick={() => setMobileMenu(false)}
          >
            Docs
          </Link>
          <div className={style.about_wrap} data-about-menu>
            <button
              type="button"
              className={style.about_btn}
              aria-expanded={aboutOpen}
              aria-haspopup="true"
              onClick={() => setAboutOpen(!aboutOpen)}
            >
              About
            </button>
            {aboutOpen && (
              <div className={style.about_dropdown} role="menu">
                <button type="button" role="menuitem" onClick={openCommunity}>
                  Community
                </button>
              </div>
            )}
          </div>
          {userId === undefined
            ? (
            <>
              <a href="/signin" onClick={() => setMobileMenu(false)}>
                Sign In
              </a>
              <a
                href="/signup"
                className="button_outline button_small"
                onClick={() => setMobileMenu(false)}
              >
                Sign up
              </a>
            </>
              )
            : (
            <>
              <a href="/dashboard" onClick={() => setMobileMenu(false)}>
                Dashboard
              </a>
              <LogoutButton onClick={() => {}} footer={false} />
            </>
              )}
        </div>
      </div>
      <CommunityDialog open={communityOpen} onClose={() => setCommunityOpen(false)} />
    </div>
  )
}
