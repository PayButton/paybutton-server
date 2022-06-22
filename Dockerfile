FROM node:lts-alpine as builder

## Install build toolchain
RUN apk add --no-cache python3 make g++

# Install node deps and compile native add-ons
WORKDIR /deps/
COPY package.json /deps/
COPY yarn.lock /deps/
RUN yarn

FROM node:lts-alpine as app

## Copy built node modules and binaries without including the toolchain
USER node
COPY --chown=node --from=builder /deps/node_modules /home/node/src/node_modules
ENV PATH /home/node/src/node_modules/.bin:$PATH
WORKDIR /home/node/src/
EXPOSE 3000
