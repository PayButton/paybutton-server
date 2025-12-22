import React from 'react'
import { DotLoader } from 'react-spinners'
import style from './loading.module.css'

interface LoadingProps {
  size?: number
  color?: string
}

export default function Loading ({ size = 60, color }: LoadingProps): React.ReactElement {
  return (
    <div className={style.loading_container}>
      <DotLoader
        color={color ?? 'var(--accent-color)'}
        size={size}
        speedMultiplier={2}
      />
    </div>
  )
}
