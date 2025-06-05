import { PayButton } from '@paybutton/react'
import config from 'config/index'
import React, { useState } from 'react'
import style from './pro.module.css'
import { UserProfile } from '@prisma/client'
import Page from 'components/Page'
import { GetServerSideProps } from 'next'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { fetchUserProfileFromId } from 'services/userService'
import { removeUnserializableFields } from 'utils'

interface IProps {
  user: UserProfile
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  supertokensNode.init(SuperTokensConfig.backendConfig())
  let session
  try {
    session = await Session.getSession(context.req, context.res)
  } catch (err: any) {
    if (err.type === Session.Error.TRY_REFRESH_TOKEN) {
      return { props: { fromSupertokens: 'needs-refresh' } }
    } else if (err.type === Session.Error.UNAUTHORISED) {
      return { props: {} }
    } else {
      throw err
    }
  }

  const user = await fetchUserProfileFromId(session.getUserId())

  removeUnserializableFields(user)

  return {
    props: {
      user
    }
  }
}

export default function Pro ({ user }: IProps): React.ReactElement {
  const offeredMonths = Object.keys(config.proMonthsCost)
  const [selectedMonths, setSelectedMonths] = useState<string | null>(null)

  const handleSelect = (months: string): void => {
    setSelectedMonths(months)
  }

  const renderLabel = (m: string): string => {
    if (m === '1') return '1 month'
    if (m === '12') return '1 year'
    return `${m} months`
  }
  console.log('oia', user)

  return user === undefined
    ? <Page/>
    : (
    <div className={style.container}>
      <h3 className={style.heading}>Choose your PRO plan</h3>
      <div className={style.cardGrid}>
        {offeredMonths.map((m) => {
          const selected = selectedMonths === m
          return (
            <div
              key={m}
              onClick={() => handleSelect(m)}
              className={`${style.card} ${selected ? style.selected : ''}`}
            >
              <div className={style.label}>{renderLabel(m)}</div>
              <div className={style.price}>${config.proMonthsCost[m]}</div>
            </div>
          )
        })}
      </div>

      {selectedMonths !== null && (
        <div className={style.payButtonWrapper}>
          <PayButton
            text={`Subscribe to PayButton Pro for ${renderLabel(selectedMonths)}`}
            to={config.proPayoutAddress}
            amount={config.proMonthsCost[selectedMonths]}
            currency="USD"
          />
        </div>
      )}
    </div>
      )
}
