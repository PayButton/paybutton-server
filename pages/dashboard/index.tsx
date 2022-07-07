import React from 'react'
import style from './dashboard.module.css'
import Page from 'components/Page'
import data from './dummy-data.json'
import Chart from "./Chart"

const NumberBlock = ({value, text}) => {
  return (
    <div className={style.number_block}>
      <h4>{value}</h4>
      <h5>{text}</h5>
    </div>
    )
}

const thirtyDayRevenueLabels = [9, 12, 4, 8, 12, 4, 9, 6, 12, 6, 4, 8, 6, 9, 11, 6, 2, 5, 9, 7, 6, 12,
  2, 6, 12, 7, 10, 8, 11, 4];

const thirtyDayRevenue = {
  labels: thirtyDayRevenueLabels,
  datasets: [
    {
      data: data.usd_revenue_last_30days[1].data,
      borderColor: '#669cfe',
    }
  ],
};

export default function Dashboard (): React.ReactElement {
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
          <div className={style.chart_ctn}>
          <Chart data={thirtyDayRevenue} />
          </div>
        </div>
        <div className={style.chart_inner_ctn}>
          <div className={style.chart_ctn}></div>
        </div>
      </div>
    </Page>

  )
}
