#!/bin/sh

umask 000 || exit 1
redis-server /data/redis/redis.conf --loglevel warning
