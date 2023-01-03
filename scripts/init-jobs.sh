#!/bin/sh

date "+start date: %Y-%m-%d %H:%M:%S" > jobs/out.log
tmux new-session -d -s "initJobs" 'yarn initJobs 2>&1 | tee -a jobs/out.log'
