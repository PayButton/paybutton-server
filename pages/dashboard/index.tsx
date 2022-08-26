import React, { useState, useEffect, FunctionComponent } from 'react'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import style from './dashboard.module.css'
const Chart = dynamic(async () => await import('./Chart'), {
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

const ThirdPartyEmailPasswordAuthNoSSR = dynamic(
  new Promise((resolve, reject) =>
    resolve(ThirdPartyEmailPassword.ThirdPartyEmailPasswordAuth)
  ),
  { ssr: false }
)

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
  const [period, setPeriod] = useState()
  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      const res = await fetch('api/dashboard')
      const json = await res.json()
      setDashboardData(json)
      setPeriod(json.thirtyDays)
    }
    fetchData().catch(console.error)
  }, [])

  if (dashboardData === undefined || period === undefined) return <></>

  return (
    <ThirdPartyEmailPasswordAuthNoSSR>
      <h2>Dashboard</h2>
      <div className={style.number_ctn}>
        <NumberBlock value={'$'.concat(dashboardData.total.revenue) } text='Revenue (lifetime)' />
        <NumberBlock value={dashboardData.total.payments} text='Payments (lifetime)' />
        <NumberBlock value={dashboardData.total.buttons} text='Buttons' />
      </div>
      <div className={style.btn_ctn}>
        <button className={period === dashboardData.sevenDays ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setPeriod(dashboardData.sevenDays) }}>1W</button>
        <button className={period === dashboardData.thirtyDays ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setPeriod(dashboardData.thirtyDays) }}>1M</button>
        <button className={period === dashboardData.year ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setPeriod(dashboardData.year) }}>1Y</button>
      </div>
      <div className={style.chart_outer_ctn}>
        <div className={style.chart_inner_ctn}>
          <div className={style.chart_title_ctn}>
            <h4>Revenue</h4>
            <h5>{period === dashboardData.year ? 'Year' : period === dashboardData.thirtyDays ? '30 Day' : '7 Day'} Total: ${period.totalRevenue}</h5>
          </div>
          <div className={style.chart_ctn}>
            <Chart data={period.revenue} usd />
          </div>
        </div>
        <div className={style.chart_inner_ctn}>
          <div className={style.chart_title_ctn}>
            <h4>Payments</h4>
            <h5>{period === dashboardData.year ? 'Year' : period === dashboardData.thirtyDays ? '30 Day' : '7 Day'} Total: {period.totalPayments}</h5>
          </div>
          <div className={style.chart_ctn}>
            <Chart data={period.payments} />
          </div>
        </div>
      </div>
    </ThirdPartyEmailPasswordAuthNoSSR>

  )
}
