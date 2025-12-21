import React, { useState, useEffect } from 'react'
import { DotLoader } from 'react-spinners'
import style from './loading.module.css'

interface LoadingProps {
  size?: number
  color?: string
}

export default function Loading ({ size = 60, color }: LoadingProps): React.ReactElement {
  const [accentColor, setAccentColor] = useState(color ?? '#0ac18e')

  useEffect(() => {
    if (color === undefined) {
      const computedColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim()
      if (computedColor !== '') {
        setAccentColor(computedColor)
      }
    }
  }, [color])

  return (
    <div className={style.loading_overlay}>
      <DotLoader
        color={accentColor}
        size={size}
        speedMultiplier={2}
      />
    </div>
  )
}
