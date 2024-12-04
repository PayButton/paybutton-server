import { Prisma } from '@prisma/client'
import config from 'config/index'
import { XEC_TX_EXPLORER_URL, BCH_TX_EXPLORER_URL } from 'constants/index'
import nodemailer from 'nodemailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'
import { getAddressPrefix } from 'utils'
import { OpReturnData } from 'utils/validators'

export interface MailerGlobal extends NodeJS.Global {
  mailerTransporter?: nodemailer.Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options>
}

declare const global: MailerGlobal

export const getMailerTransporter = (): nodemailer.Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options> => {
  if (global.mailerTransporter === undefined) {
    global.mailerTransporter = nodemailer.createTransport({
      host: config.smtpHost,
      secure: config.smtpPort === 465,
      logger: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    })
    global.mailerTransporter.verify((error, _success) => {
      if (error != null) {
        console.error('ERROR SETTING UP MAILER:', error)
        global.mailerTransporter = undefined
      } else {
        console.log('Mailer ready to send messages')
      }
    })
  }
  return global.mailerTransporter
}

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
  <span> <b>${params.amount.toString()} ${params.currency}</b> received on PayButton <b>${params.buttonName}</b> </span>
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
