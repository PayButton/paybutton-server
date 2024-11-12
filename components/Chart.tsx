import type { NextPage } from 'next'
import React from 'react'
import { formatQuoteValue } from 'utils/index'
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
import { ChartData } from 'redis/types'
import { USD_QUOTE_ID } from 'constants/index'
import { QuoteValues } from 'services/priceService'

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
  chartData: ChartData
  currencyId?: number
}

function getQuoteOption (quoteValues: QuoteValues[], currencyId: number): number[] {
  return quoteValues.map(qv => Number(currencyId === USD_QUOTE_ID ? qv.usd : qv.cad))
}

const Chart: NextPage<Props> = ({ chartData, currencyId }) => {
  const data = chartData
  if (chartData.isMultiQuote && currencyId !== undefined) {
    if (data.datasets.length > 0) {
      data.datasets = [
        {
          ...data.datasets[0],
          data: Array.isArray(data.datasets[0].data) && typeof data.datasets[0].data[0] === 'object'
            ? getQuoteOption(data.datasets[0].data as QuoteValues[], currencyId)
            : data.datasets[0].data
        }
      ]
    }
  }
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
            const prefix = currencyId !== undefined ? '$' : ''
            return prefix + formatQuoteValue(context.raw, currencyId)
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
            return currencyId !== undefined ? '$' + formatQuoteValue(value, currencyId) : value
          }
        },
        position: 'right'
      }
    }
  }

  return <Line options={options} data={chartData} />
}

export default Chart
