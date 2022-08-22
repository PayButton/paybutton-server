import React, { useState, FunctionComponent } from 'react'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import style from './dashboard.module.css'
import dashboardData from './dummy-data.json'
import moment from 'moment'
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

const initChartData = function (): any {
  const yearLabels = [...new Array(12)].map((i, idx) => moment().startOf('day').subtract(idx, 'months').format('MMM'))
  const thirtyDayLabels = [...new Array(30)].map((i, idx) => moment().startOf('day').subtract(idx, 'days').format('M/D'))
  const sevenDayLabels = [...new Array(7)].map((i, idx) => moment().startOf('day').subtract(idx, 'days').format('M/D'))

  return {
    thirtyDayRevenue: {
      labels: thirtyDayLabels.reverse(),
      datasets: [
        {
          data: dashboardData.usdRevenueLast30days[1].data,
          borderColor: '#669cfe'
        }
      ]
    },

    sevenDayRevenue: {
      labels: sevenDayLabels.reverse(),
      datasets: [
        {
          data: dashboardData.usdRevenueLast7days[1].data,
          borderColor: '#669cfe'
        }
      ]
    },
    yearRevenue: {
      labels: yearLabels,
      datasets: [
        {
          data: dashboardData.usdRevenueLastYear[1].data,
          borderColor: '#669cfe'
        }
      ]
    },
    yearPayments: {
      labels: yearLabels.reverse(),
      datasets: [
        {
          data: dashboardData.paymentsLastYear[1].data,
          borderColor: '#66fe91'
        }
      ]
    },
    thirtyDayPayments: {
      labels: thirtyDayLabels,
      datasets: [
        {
          data: dashboardData.paymentsLast30days[1].data,
          borderColor: '#66fe91'
        }
      ]
    },
    sevenDayPayments: {
      labels: sevenDayLabels,
      datasets: [
        {
          data: dashboardData.paymentsLast7days[1].data,
          borderColor: '#66fe91'
        }
      ]
    }
  }
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
  const chartData = initChartData()
  const [revenue, setRevenue] = useState(chartData.thirtyDayRevenue)
  const [payments, setPayments] = useState(chartData.thirtyDayPayments)
  return (
    <ThirdPartyEmailPasswordAuthNoSSR>
      <h2>Dashboard</h2>
      <div className={style.number_ctn}>
        <NumberBlock value={'$' + dashboardData.lifetimeRevenueUsd.toLocaleString()} text='Revenue (lifetime)' />
        <NumberBlock value={dashboardData.lifetimePayments} text='Payments (lifetime)' />
        <NumberBlock value={dashboardData.buttonsCount} text='Buttons' />
      </div>
      <div className={style.btn_ctn}>
        <button className={revenue === chartData.sevenDayRevenue ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setRevenue(chartData.sevenDayRevenue); setPayments(chartData.sevenDayPayments) }}>1W</button>
        <button className={revenue === chartData.thirtyDayRevenue ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setRevenue(chartData.thirtyDayRevenue); setPayments(chartData.thirtyDayPayments) }}>1M</button>
        <button className={revenue === chartData.yearRevenue ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setRevenue(chartData.yearRevenue); setPayments(chartData.yearPayments) }}>1Y</button>
      </div>
      <div className={style.chart_outer_ctn}>
        <div className={style.chart_inner_ctn}>
          <div className={style.chart_title_ctn}>
            <h4>Revenue</h4>
            <h5>{revenue === chartData.yearRevenue ? 'Year' : revenue === chartData.thirtyDayRevenue ? '30 Day' : '7 Day'} Total: ${revenue === chartData.yearRevenue ? dashboardData.usdRevenueLastYear[0].total : revenue === chartData.thirtyDayRevenue ? dashboardData.usdRevenueLast30days[0].total : dashboardData.usdRevenueLast7days[0].total}</h5>
          </div>
          <div className={style.chart_ctn}>
            <Chart data={revenue} usd />
          </div>
        </div>
        <div className={style.chart_inner_ctn}>
          <div className={style.chart_title_ctn}>
            <h4>Payments</h4>
            <h5>{payments === chartData.yearPayments ? 'Year' : payments === chartData.thirtyDayPayments ? '30 Day' : '7 Day'} Total: {payments === chartData.thirtyDayPayments ? dashboardData.paymentsLast30days[0].total : dashboardData.paymentsLast7days[0].total}</h5>
          </div>
          <div className={style.chart_ctn}>
            <Chart data={payments} />
          </div>
        </div>
      </div>
    </ThirdPartyEmailPasswordAuthNoSSR>

  )
}
