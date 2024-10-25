import { Prisma } from '@prisma/client'
import config from 'config/index'
import nodemailer from 'nodemailer'
import { OpReturnData } from 'utils/validators'

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
  return `
  <h1> WIP </h1>
  <p> Testing variables and HTML </p>
  <ul>
    <li>Amount: ${params.amount.toString()}</li>
    <li>Currency: ${params.currency}</li>
    <li>Timestamp: ${new Date(params.timestamp * 1000).toLocaleString()}</li>
    <li>Transaction ID: ${params.txId}</li>
    <li>Button Name: ${params.buttonName}</li>
    <li>Address: ${params.address}</li>
    <li>Message: ${params.opReturn.message}</li>
    <li>Payment ID: ${params.opReturn.paymentId}</li>
  </ul>
  `
}

export const MAIL_PLAIN_TEXT = ''
