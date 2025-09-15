import { PayButton } from '@paybutton/react'
import config from 'config/index'
import React, { useState } from 'react'
import style from './pro.module.css'
import { UserProfile } from '@prisma/client'
import Page from 'components/Page'
import { GetServerSideProps } from 'next'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import { fetchUserProfileFromId } from 'services/userService'
import { removeUnserializableFields } from 'utils'
import { frontEndGetSession } from 'utils/setSession'

interface IProps {
  user: UserProfile
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  supertokensNode.init(SuperTokensConfig.backendConfig())
  const sessionResult = await frontEndGetSession(context)
  if (!sessionResult.success) {
    return sessionResult.failedResult.payload
  }
  const session = sessionResult.session

  const user = await fetchUserProfileFromId(session.getUserId())

  removeUnserializableFields(user)

  return {
    props: {
      user
    }
  }
}

export default function Pro ({ user }: IProps): React.ReactElement {
  const offeredMonths = Object.keys(config.proSettings.monthsCost)
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
              <div className={style.price}>${config.proSettings.monthsCost[m]}</div>
            </div>
          )
        })}
      </div>

      {selectedMonths !== null && (
        <div className={style.payButtonWrapper}>
          <PayButton
            text={`Subscribe to PayButton Pro for ${renderLabel(selectedMonths)}`}
            to={config.proSettings.payoutAddress}
            amount={config.proSettings.monthsCost[selectedMonths]}
            currency="USD"
          />
        </div>
      )}
    </div>
      )
}
