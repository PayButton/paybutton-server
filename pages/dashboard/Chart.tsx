import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip : {
        displayColors: false,
    },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: true,
          drawOnChartArea: true,
          drawTicks: true,
        },
        ticks: {
          color: '#231f20',
        },
      },
      y: {
        grid: {
          drawBorder: false,
          color: '#231f201f',
        },
        ticks: {
          color: '#231f20',
        },
        position: 'right',
      },
    },
  };

export default function Chart ({data}): React.ReactElement {
  return <Line options={options} data={data} />
}
