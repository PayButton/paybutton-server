import React, { useEffect } from 'react'
import { GetServerSideProps } from 'next'
import { parseAddress } from 'utils/validators'

const convertToBip21 = (queryParams: Record<string, string | string[] | undefined>): string | null => {
  // Extract and validate address parameter (required)
  let parsedAddress: string
  try {
    const address = queryParams.address
    if (typeof address !== 'string') {
      return null
    }
    parsedAddress = parseAddress(address)
  } catch {
    return null
  }

  // Build query string from all parameters except 'address' and 'b'
  const queryParts: string[] = []
  for (const [key, value] of Object.entries(queryParams)) {
    // Skip 'address' and 'b' parameters
    if (key === 'address' || key === 'b') {
      continue
    }

    // Handle array values (take first element) or string values
    const paramValue = Array.isArray(value) ? value[0] : value
    if (paramValue !== undefined && paramValue !== '') {
      queryParts.push(`${key}=${paramValue}`)
    }
  }

  // Construct BIP21 string
  if (queryParts.length > 0) {
    return `${parsedAddress}?${queryParts.join('&')}`
  }
  return parsedAddress
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const queryParams = context.query

  // Convert to BIP21 string (validates address internally)
  const bip21String = convertToBip21(queryParams)
  if (bip21String === null) {
    context.res.statusCode = 400
    return {
      props: {
        error: 'Invalid PayButton URL.'
      }
    }
  }

  return {
    props: {
      bip21String
    }
  }
}

interface AppProps {
  bip21String?: string
  error?: string
}

export default function App ({ bip21String, error }: AppProps): JSX.Element {
  useEffect(() => {
    if (error !== undefined || bip21String === undefined) {
      return
    }

    window.location.href = `https://cashtab.com/#/send?bip21=${bip21String}`
  }, [bip21String, error])

  if (error !== undefined) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    )
  }

  // bip21String should always be defined at that point, but this makes eslint
  // happy and hardens the code a bit.
  const cashtabRedirectUrl = typeof bip21String === 'string'
    ? `https://cashtab.com/#/send?bip21=${bip21String}`
    : 'https://cashtab.com'

  return (
    <div>
      <h1>Redirecting to Cashtab...</h1>
      <p>If you are not redirected, please click <a href={cashtabRedirectUrl}>here</a>.</p>
    </div>
  )
}
