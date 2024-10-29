import { Prisma } from '@prisma/client'
import config from 'config/index'
import { XEC_TX_EXPLORER_URL, BCH_TX_EXPLORER_URL } from 'constants/index'
import nodemailer from 'nodemailer'
import { getAddressPrefix } from 'utils'
import { OpReturnData } from 'utils/validators'
import logoImageSource from 'assets/logo.png'
import style from './mail.module.css'

export const MAIL_TRANSPORTER = nodemailer.createTransport({
  host: config.smtpHost,
  secure: config.smtpPort === 465,
  logger: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
})

MAIL_TRANSPORTER.verify((error, _success) => {
  if (error != null) {
    console.error('ERROR SETTING UP MAILER:', error)
  } else {
    console.log('Mailer ready to send messages')
  }
})

export const MAIL_FROM = 'no-reply@paybutton.org'
export const MAIL_SUBJECT = 'New Payment Received'

export interface SendEmailParameters {
  amount: Prisma.Decimal
  currency: string
  timestamp: number
  txId: string
  buttonName: string
  address: string
  opReturn: OpReturnData
}

export const MAIL_HTML_REPLACER = (params: SendEmailParameters): string => {
  const explorerURL = ['ecash', 'ectest'].includes(getAddressPrefix(params.address)) ? XEC_TX_EXPLORER_URL : BCH_TX_EXPLORER_URL
  const messageText = params.opReturn.message === '' ? '' : `<li>Message: ${params.opReturn.message}</li>`
  const paymentIdText = params.opReturn.paymentId === '' ? '' : `<li>Payment ID: ${params.opReturn.paymentId}</li>`
  return `
          <img src="assets/logo.png" alt="PayButton1">
          a
          <img src=${logoImageSource.src} alt="PayButton2">
  <h1>Payment received on PayButton</h1>
  <span> <b className=${style.blue} >${params.amount.toString()} ${params.currency}</b> received on PayButton <b>${params.buttonName}</b> </span>
  <ul>
    <li>Date and time: ${new Date(params.timestamp * 1000).toLocaleString()}</li>
    <li>Transaction ID: <a href=${explorerURL}${params.txId}>${params.txId}</a></li>
    <li>Receving Address: ${params.address}</li>
    ${messageText}
    ${paymentIdText}
  </ul>
  `
}

export const MAIL_PLAIN_TEXT = ''
