export const copyText = (id) => {
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    const textToCopy = document.getElementById(id).textContent
    return navigator.clipboard.writeText(textToCopy)
  }
}
