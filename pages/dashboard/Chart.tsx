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

export default function Chart ({data, usd}): React.ReactElement {

    function cssvar(name) {
        return getComputedStyle(document.body).getPropertyValue(name);
      }
    
    const options = {
        responsive: true,
        lineTension: 0.4,
        maintainAspectRatio: false,
        plugins: {
            legend: {
            display: false,
            },
            tooltip: {
            displayColors: false,
            // callbacks: {
            //     title: function () {
            //       return "my tittle";
            //     }
            //   }
            mode: 'nearest',
            intersect: false,
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
                color: cssvar('--primary-text-color'),
            },
            },
            y: {
                grid: {
                    drawBorder: false,
                    color: cssvar('--chart-line-color'),
                },
                grace: '10%',
                ticks: {
                    color: cssvar('--primary-text-color'),
                    callback: function(value) {
                    return usd ? '$'+ value: value;
                }
                },
                position: 'right',
                // beginAtZero: true,
            },
        },
        };

  return <Line options={options} data={data} />
}
