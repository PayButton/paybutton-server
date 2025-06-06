import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import style from './dashboard.module.css'
import { formatQuoteValue, removeUnserializableFields } from 'utils/index'
import { COOKIE_NAMES } from 'constants/index'
import Leaderboard from 'components/Dashboard/Leaderboard'
import { DashboardData, PeriodData } from 'redis/types'
import { loadStateFromCookie, saveStateToCookie } from 'utils/cookies'
import TopBar from 'components/TopBar'
import { fetchUserWithSupertokens, UserWithSupertokens } from 'services/userService'
import moment from 'moment-timezone'
import SettingsIcon from '../../assets/settings-slider-icon.png'
import Image from 'next/image'

const Chart = dynamic(async () => await import('components/Chart'), {
  ssr: false
})

interface NumberBlockProps {
  value: number
  text: string
}

type PeriodString = '1M' | '1W' | '1Y' | 'All'

const NumberBlock = ({ value, text }: NumberBlockProps): JSX.Element => {
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

  if (session === undefined) return
  const userId = session.getUserId()
  const user = await fetchUserWithSupertokens(userId)
  removeUnserializableFields(user.userProfile)

  return {
    props: {
      user
    }
  }
}

interface PaybuttonsProps {
  user: UserWithSupertokens
}

export default function Dashboard ({ user }: PaybuttonsProps): React.ReactElement {
  const [dashboardData, setDashboardData] = useState<DashboardData>()
  const [activePeriod, setActivePeriod] = useState<PeriodData>()
  const [activePeriodString, setActivePeriodString] = useState<PeriodString>('1M')
  const [totalString, setTotalString] = useState<string>()
  const [selectedButtonIds, setSelectedButtonIds] = useState<any[]>([])
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [buttons, setButtons] = useState<any[]>([])

  const setPeriodFromString = (data?: DashboardData, periodString?: PeriodString): void => {
    if (data === undefined) return
    if (periodString === undefined) {
      periodString = '1M'
    }
    switch (periodString) {
      case '1W':
        setActivePeriod(data.sevenDays)
        break
      case '1M':
        setActivePeriod(data.thirtyDays)
        break
      case '1Y':
        setActivePeriod(data.year)
        break
      case 'All':
        setActivePeriod(data.all)
        break
    }
    saveStateToCookie(COOKIE_NAMES.DASHBOARD_FILTER, periodString)
  }
  const getDataAndSetUpButtons = async (): Promise<void> => {
    const paybuttons = await fetchPaybuttons()
    setButtons(paybuttons)
  }
  const fetchPaybuttons = async (): Promise<any> => {
    const res = await fetch(`/api/paybuttons?userId=${user?.userProfile.id}`, {
      method: 'GET'
    })
    if (res.status === 200) {
      return await res.json()
    }
  }

  useEffect(() => {
    void getDataAndSetUpButtons()
  }, [])

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      let url = 'api/dashboard'
      if (selectedButtonIds.length > 0) {
        url += `?buttonIds=${selectedButtonIds.join(',')}`
      }
      const res = await fetch(url, {
        headers: {
          Timezone: moment.tz.guess()
        }
      })
      const json = await res.json()
      setDashboardData(json)
    }
    fetchData().catch(console.error)
    const savedActivePeriodString = loadStateFromCookie(COOKIE_NAMES.DASHBOARD_FILTER, undefined) as (PeriodString | undefined)
    if (savedActivePeriodString !== undefined) {
      setActivePeriodString(savedActivePeriodString)
    }
  }, [selectedButtonIds])

  useEffect(() => {
    setPeriodFromString(dashboardData, activePeriodString)
    if (dashboardData !== undefined) {
      setTotalString(
        (activePeriodString === 'All' ? 'Lifetime' : activePeriodString === '1Y' ? 'Year' : activePeriodString === '1M' ? '30 Day' : '7 Day') +
        ' Total'
      )
    } else {
      setTotalString('Total')
    }
  }, [activePeriodString, dashboardData])

  if (dashboardData === undefined || activePeriod === undefined) return <></>

  return (
    <>
      <TopBar title="Dashboard" user={user.stUser?.email} />
      <div className={style.filter_btns}>
          <div
            onClick={() => setShowFilters(!showFilters)}
            className={style.show_filters_button}
          >
            <Image src={SettingsIcon} alt="filters" width={15} />Filters
          </div>
          {selectedButtonIds.length > 0 &&
          <div
          onClick={() => setSelectedButtonIds([])}
          className={style.show_filters_button}
          >
            Clear
          </div>
          }
      </div>
      {showFilters && (
            <div className={style.showfilters_ctn}>
              <span>Filter by PayButton</span>
              <div className={style.filters_ctn}>
                {buttons.map((button) => (
                  <div
                    key={button.id}
                    onClick={() => {
                      setSelectedButtonIds(prev =>
                        prev.includes(button.id)
                          ? prev.filter(id => id !== button.id)
                          : [...prev, button.id]
                      )
                    }}
                    className={`${style.filter_button} ${selectedButtonIds.includes(button.id) ? style.active : ''}`}
                  >
                    {button.name}
                  </div>
                ))}
              </div>
            </div>
      )}
      <div className={style.number_ctn}>
        <NumberBlock value={'$'.concat(formatQuoteValue(activePeriod.totalRevenue, user.userProfile.preferredCurrencyId)) } text='Revenue' />
        <NumberBlock value={activePeriod.totalPayments} text='Payments' />
        <NumberBlock value={dashboardData.total.buttons} text='Buttons' />
      </div>
      <div className={style.btn_ctn}>
        <button className={activePeriodString === '1W' ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setActivePeriodString('1W') }}>1W</button>
        <button className={activePeriodString === '1M' ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setActivePeriodString('1M') }}>1M</button>
        <button className={activePeriodString === '1Y' ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setActivePeriodString('1Y') }}>1Y</button>
        {dashboardData.all.revenue.labels.length > 12 && <button className={activePeriodString === 'All' ? `${style.active_btn} ${style.toggle_btn}` : style.toggle_btn} onClick={() => { setActivePeriodString('All') }}>All</button>}
      </div>
      <div className={style.chart_outer_ctn}>
        <div className={style.chart_inner_ctn}>
          <div className={style.chart_title_ctn}>
            <div>
              <h5>Revenue</h5>
            </div>
          </div>
          <div className={style.chart_ctn}>
            <Chart chartData={activePeriod.revenue} currencyId={user.userProfile.preferredCurrencyId} />
          </div>
        </div>
        <div className={style.chart_inner_ctn}>
          <div className={style.chart_title_ctn}>
            <div>
              <h5>Payments</h5>
            </div>
          </div>
          <div className={style.chart_ctn}>
            <Chart chartData={activePeriod.payments} />
          </div>
        </div>
        <div className={`${style.full_width} ${style.chart_inner_ctn}`}>
          <div className={style.chart_title_ctn}>
            <h5>Button Leaderboard</h5>
            <div></div>
          </div>
            <Leaderboard totalString={totalString} buttons={activePeriod.buttons} currencyId={user.userProfile.preferredCurrencyId}/>
        </div>
      </div>
    </>
  )
}
