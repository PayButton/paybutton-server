import React, { useState } from 'react'
import style from './dashboard.module.css'
import Page from 'components/Page'
import data from './dummy-data.json'
import Chart from "./Chart"
import moment from 'moment'

const NumberBlock = ({value, text}) => {
  return (
    <div className={style.number_block}>
      <h4>{value}</h4>
      <h5>{text}</h5>
    </div>
    )
}

const yearLabels = [...new Array(12)].map((i, idx) => moment().startOf("day").subtract(idx, "months").format("MMM"));
const thirtyDayLabels = [...new Array(30)].map((i, idx) => moment().startOf("day").subtract(idx, "days").format('M/D'));
const sevenDayLabels = [...new Array(7)].map((i, idx) => moment().startOf("day").subtract(idx, "days").format('M/D'));

const thirtyDayRevenue = {
  labels: thirtyDayLabels.reverse(),
  datasets: [
    {
      data: data.usd_revenue_last_30days[1].data,
      borderColor: '#669cfe',
    }
  ],
};

const sevenDayRevenue = {
  labels: sevenDayLabels.reverse(),
  datasets: [
    {
      data: data.usd_revenue_last_7days[1].data,
      borderColor: '#669cfe',
    }
  ],
};

const yearRevenue = {
  labels: yearLabels,
  datasets: [
    {
      data: data.usd_revenue_last_year[1].data,
      borderColor: '#669cfe',
    }
  ],
};

const yearPayments = {
  labels: yearLabels.reverse(),
  datasets: [
    {
      data: data.payments_last_year[1].data,
      borderColor: '#66fe91',
    }
  ],
};

const thirtyDayPayments = {
  labels: thirtyDayLabels,
  datasets: [
    {
      data: data.payments_last_30days[1].data,
      borderColor: '#66fe91',
    }
  ],
};

const sevenDayPayments = {
  labels: sevenDayLabels,
  datasets: [
    {
      data: data.payments_last_7days[1].data,
      borderColor: '#66fe91',
    }
  ],
};

export default function Dashboard (): React.ReactElement {
  const [revenue, setRevenue] = useState(thirtyDayRevenue)
  const [payments, setPayments] = useState(thirtyDayPayments)
  return (
    <Page>
      <h2>Dashboard</h2>
      <div className={style.number_ctn}>
        <NumberBlock value={'$' + data.lifetime_revenue_usd.toLocaleString()} text='Revenue (lifetime)' />
        <NumberBlock value={data.lifetime_payments} text='Payments (lifetime)' />
        <NumberBlock value={data.buttons} text='Buttons' />
      </div>
      <div className={style.chart_outer_ctn}>
        <div className={style.chart_inner_ctn}>
          <div className={style.chart_title_ctn}>
            <h4>Revenue</h4>
            <h5>{revenue === thirtyDayRevenue ? '30 Day':'7 Day'} Total: ${revenue === thirtyDayRevenue ? data.usd_revenue_last_30days[0].total:data.usd_revenue_last_7days[0].total}</h5>
          </div>
          <div className={style.chart_ctn}>
            <Chart data={revenue} usd />
          </div>
        </div>
        <div className={style.chart_inner_ctn}>
          <div className={style.chart_title_ctn}>
            <h4>Payments</h4>
            <h5>{payments === thirtyDayPayments ? '30 Day':'7 Day'} Total: {payments === thirtyDayPayments ? data.payments_last_30days[0].total:data.payments_last_7days[0].total}</h5>
          </div>
          <div className={style.chart_ctn}>
            <Chart data={payments} />
          </div>
        </div>
      </div>
      <button className={revenue === sevenDayRevenue ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => {setRevenue(sevenDayRevenue);setPayments(sevenDayPayments)}}>1W</button>
      <button className={revenue === thirtyDayRevenue ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => {setRevenue(thirtyDayRevenue);setPayments(thirtyDayPayments)}}>1M</button>
      <button className={revenue === yearRevenue ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => {setRevenue(yearRevenue);setPayments(yearPayments)}}>1Y</button>
    </Page>

  )
}
