import type { NextPage } from 'next'
import React from 'react'
import { formatQuoteValue } from 'utils/index'
import { USD_QUOTE_ID } from 'constants/index'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface Props {
  data: object
  usd: boolean
}

const Chart: NextPage<Props> = ({ data, usd }) => {
  const chartData = data

  function cssvar (name): string {
    /*
    if (typeof window !== "undefined") {
      return getComputedStyle(document.body).getPropertyValue(name)
    }
    return "#000"
      */
    return getComputedStyle(document.body).getPropertyValue(name)
  }

  const options = {
    responsive: true,
    lineTension: 0.4,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        displayColors: false,
        callbacks: {
          label: function (context) {
            return usd ? '$' + formatQuoteValue(context.raw, USD_QUOTE_ID) : formatQuoteValue(context.raw)
          }
        },
        mode: 'nearest',
        intersect: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: true,
          drawOnChartArea: true,
          drawTicks: true
        },
        ticks: {
          color: cssvar('--primary-text-color')
        }
      },
      y: {
        grid: {
          drawBorder: false,
          color: cssvar('--chart-line-color')
        },
        grace: '0%',
        beginAtZero: true,
        ticks: {
          color: cssvar('--primary-text-color'),
          callback: function (value: string) {
            return usd ? '$' + formatQuoteValue(value, USD_QUOTE_ID) : value
          }
        },
        position: 'right'
      }
    }
  }

  return <Line options={options} data={chartData} />
}

export default Chart
