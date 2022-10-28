export const copyText = function (id: string): string {
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    const textToCopy = document.getElementById(id).textContent
    return navigator.clipboard.writeText(textToCopy)
  }
}

export const FormatNumber = (x, type) => {
  if (type === 'dollars') {
    const addcommas = parseFloat(x).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return addcommas
  } else {
    const addcommas = parseFloat(x).toLocaleString()
    return addcommas
  }
}
