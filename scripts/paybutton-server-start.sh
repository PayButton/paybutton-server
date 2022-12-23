#!/bin/sh

yarn || exit
yarn prisma migrate dev || exit
yarn prisma db seed || exit
yarn dev || exit
