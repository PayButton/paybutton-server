import React, { useState, useEffect, FunctionComponent } from 'react'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import style from './dashboard.module.css'
import { formatQuoteValue } from 'utils/index'
import { USD_QUOTE_ID } from 'constants/index'
const Chart = dynamic(async () => await import('components/Chart'), {
  ssr: false
})

interface NumberBlockProps {
  value: number
  text: string
}

const NumberBlock = ({ value, text }: NumberBlockProps): FunctionComponent<NumberBlockProps> => {
  return (
    <div className={style.number_block}>
      <h4>{value}</h4>
      <h5>{text}</h5>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // this runs on the backend, so we must call init on supertokens-node SDK
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

  return {
    props: { userId: session.getUserId() }
  }
}

interface PaybuttonsProps {
  userId: string
}

export default function Dashboard ({ userId }: PaybuttonsProps): React.ReactElement {
  const [dashboardData, setDashboardData] = useState()
  const [activePeriod, setActivePeriod] = useState()
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      const res = await fetch('api/dashboard')
      const json = await res.json()
      setDashboardData(json)
      setActivePeriod(json.thirtyDays)
    }
    fetchData().catch(console.error)
  }, [])

  if (dashboardData === undefined || activePeriod === undefined) return <></>

  return (
    <>
      <h2>Dashboard</h2>
      <div className={style.number_ctn}>
        <NumberBlock value={'$'.concat(formatQuoteValue(dashboardData.total.revenue, USD_QUOTE_ID)) } text='Revenue (lifetime)' />
        <NumberBlock value={formatQuoteValue(dashboardData.total.payments)} text='Payments (lifetime)' />
        <NumberBlock value={dashboardData.total.buttons} text='Buttons' />
      </div>
      <div className={style.btn_ctn}>
        <button className={activePeriod === dashboardData.sevenDays ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setActivePeriod(dashboardData.sevenDays) }}>1W</button>
        <button className={activePeriod === dashboardData.thirtyDays ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setActivePeriod(dashboardData.thirtyDays) }}>1M</button>
        <button className={activePeriod === dashboardData.year ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setActivePeriod(dashboardData.year) }}>1Y</button>
        {dashboardData.all.revenue.labels.length > 12 && <button className={activePeriod === dashboardData.all ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setActivePeriod(dashboardData.all) }}>All</button>}
      </div>
      <div className={style.chart_outer_ctn}>
        <div className={style.chart_inner_ctn}>
          <div className={style.chart_title_ctn}>
            <h5>Revenue</h5>
            <h5>{activePeriod === dashboardData.all ? 'Lifetime' : activePeriod === dashboardData.year ? 'Year' : activePeriod === dashboardData.thirtyDays ? '30 Day' : '7 Day'} Total: ${formatQuoteValue(activePeriod.totalRevenue, USD_QUOTE_ID)}</h5>
          </div>
          <div className={style.chart_ctn}>
            <Chart data={activePeriod.revenue} usd={true} />
          </div>
        </div>
        <div className={style.chart_inner_ctn}>
          <div className={style.chart_title_ctn}>
            <h5>Payments</h5>
            <h5>{activePeriod === dashboardData.all ? 'Lifetime' : activePeriod === dashboardData.year ? 'Year' : activePeriod === dashboardData.thirtyDays ? '30 Day' : '7 Day'} Total: {formatQuoteValue(activePeriod.totalPayments)}</h5>
          </div>
          <div className={style.chart_ctn}>
            <Chart data={activePeriod.payments} />
          </div>
        </div>
      </div>
    </>
  )
}
