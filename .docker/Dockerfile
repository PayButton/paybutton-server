FROM node:lts-alpine as builder

## Install build toolchain
RUN apk add --no-cache python3 make g++

# Install node deps and compile native add-ons
WORKDIR /deps/
COPY package.json /deps/
COPY package-lock.json /deps/
RUN npm i

FROM node:lts-alpine as app

## Copy built node modules and binaries without including the toolchain
COPY --from=builder /deps/node_modules /app/node_modules
ENV PATH /app/node_modules/.bin:$PATH
WORKDIR /app/src/
EXPOSE 3000
