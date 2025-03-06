import { useEffect } from 'react'

function useAutoFocusFirstInput (): void {
  useEffect(() => {
    const focusFirstInput = (element: Document): void => {
      const firstInput = element.querySelector('form input, form textarea, form select')
      firstInput?.focus()
    }

    const handleClick = (event: MouseEvent): void => {
      const target = event.target as HTMLElement

      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
        setTimeout(() => {
          focusFirstInput(document)
        }, 100)
      }
    }

    document.addEventListener('click', handleClick)

    return (): void => {
      document.removeEventListener('click', handleClick)
    }
  }, [])
}

export default useAutoFocusFirstInput
