#!/bin/sh
yarn
yarn prisma migrate dev
yarn prisma db seed
yarn dev
