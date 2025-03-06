import { ReactNode, MouseEventHandler } from 'react'
import style from './button.module.css'

const LoadingSpinner = (): JSX.Element => {
  return (
    <div className={style.loading_spinner_ctn}>
      <div className={style.loading_spinner} />
    </div>
  )
}

interface ButtonProps {
  children: ReactNode
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  onClick?: MouseEventHandler<HTMLButtonElement>
  variant?: 'default' | 'outlined' | 'delete' | 'small'
  className?: string
  loading?: boolean
}

export default function TopBar ({
  children,
  disabled,
  type = 'button',
  onClick,
  variant = 'default',
  className = '',
  loading
}: ButtonProps): JSX.Element {
  return (
    <button
      disabled={disabled}
      type={type}
      className={`${style.button} ${style[variant]} ${style[className]} ${
        loading === true ? style.loading : ''
      }`}
      onClick={onClick}
    >
      {children}
      {loading === true && <LoadingSpinner />}
    </button>
  )
}
