import React from 'react'
import style from './dashboard.module.css'
import Page from 'components/Page'
import data from './dummy-data.json'

const NumberBlock = ({value, text}) => {
  return (
    <div className={style.number_block}>
      <h4>{value}</h4>
      <h5>{text}</h5>
    </div>
    )
}


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
          <div className={style.chart_ctn}></div>
        </div>
        <div className={style.chart_inner_ctn}>
          <div className={style.chart_ctn}></div>
        </div>
      </div>
    </Page>

  )
}
