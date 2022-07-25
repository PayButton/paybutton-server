#!/bin/sh

export PATH=$PATH:./node_modules/.bin
yarn prisma migrate dev
yarn prisma db seed
yarn dev
