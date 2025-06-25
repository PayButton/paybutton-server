import React from 'react'
import { XEC_TX_EXPLORER_URL, BCH_TX_EXPLORER_URL, NETWORK_TICKERS_FROM_ID, XEC_NETWORK_ID } from 'constants/index'
import moment from 'moment'
import logoImageSource from 'assets/logo.png'
import Image from 'next/image'

const Receipt = React.forwardRef((props, ref) => {
  const { data } = props
  const {
    invoiceNumber,
    amount,
    recipientName,
    recipientAddress,
    description,
    customerName,
    customerAddress,
    createdAt,
    transactionHash,
    transactionDate,
    transactionNetworkId
  } = data
  const formattedDate = new Date(createdAt).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(',', '')
  const url = transactionNetworkId === XEC_NETWORK_ID ? XEC_TX_EXPLORER_URL : BCH_TX_EXPLORER_URL
  return (
    <div ref={ref} style={{ padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignSelf: 'flex-start', marginRight: '20px' }}>
            <Image width={250} height={200} src={logoImageSource} alt="PayButton" />
          </div>
          <div>
            <h2>INVOICE</h2>
            <p>#{ invoiceNumber }</p>
          </div>
      </div>
      <p><strong>Generated at:</strong> { formattedDate }</p>
      <p><strong>Transaction ID:</strong> <a href={url.concat(transactionHash)} target="_blank">{transactionHash}</a></p>
      <p><strong>Transaction Date & Time:</strong> { moment(transactionDate * 1000).tz('utc').format('lll') } </p>

      <h4>Senders</h4>
      <p>{ customerName } - { customerAddress }</p>

      <h4>Recipients</h4>
      <p>{ recipientName } - { recipientAddress }</p>

      <hr />

      <p><strong>Notes:</strong> { description } </p>
      <p><strong>Amount:</strong> { amount } { NETWORK_TICKERS_FROM_ID[transactionNetworkId]}</p>

    </div>
  )
})

export default Receipt
