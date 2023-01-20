import { USD_QUOTE_ID } from 'constants/index'

export const copyText = function (id: string): string {
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    const textToCopy = document.getElementById(id).textContent
    return navigator.clipboard.writeText(textToCopy)
  }
}

export const FormatNumber = (numberString: string, quoteId?: number): string => {
  if (quoteId === USD_QUOTE_ID) {
    const addcommas = parseFloat(numberString).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return addcommas
  } else {
    const addcommas = parseFloat(numberString).toLocaleString()
    return addcommas
  }
}
