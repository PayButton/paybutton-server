#!/bin/bash

if [ "$#" -ne 1 ]; then
  echo "Usage: ./script.sh <CSV_FILE>"
  exit 1
fi

CSV_FILE=$1

GNUPLOT_SCRIPT=$(cat << EOL
set datafile separator ","
set key autotitle columnhead

# Plot CPU usage
set terminal pngcairo size 1200, 800
set output "cpu_usage.png"
set title "CPU Usage"
set xlabel "Time (arbitrary units)"
set ylabel "CPU Usage (%)"
plot "$CSV_FILE" using 1 with lines lc rgb "red", "$CSV_FILE" using 2 with lines lc rgb "blue"

# Plot Memory usage
set terminal pngcairo size 1200, 800
set output "memory_usage.png"
set title "Memory Usage"
set xlabel "Time (arbitrary units)"
set ylabel "Memory Usage (%)"
plot "$CSV_FILE" using 3 with lines lc rgb "green", "$CSV_FILE" using 4 with lines lc rgb "purple"
EOL
)

echo "$GNUPLOT_SCRIPT" | gnuplot

echo "Generated cpu_usage.png and memory_usage.png"

