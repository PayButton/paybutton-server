import { useEffect } from 'react'

function useAutoFocusFirstInput (): void {
  useEffect(() => {
    const focusFirstInput = (element = document): void => {
      const firstInput = element.querySelector('form input, form textarea, form select')
      firstInput?.focus()
    }
    setTimeout(() => focusFirstInput(), 0)

    const handleClick = (): void => {
      setTimeout(() => {
        focusFirstInput(document)
      }, 100)
    }

    document.addEventListener('click', handleClick)

    return (): void => {
      document.removeEventListener('click', handleClick)
    }
  }, [])
}

export default useAutoFocusFirstInput
