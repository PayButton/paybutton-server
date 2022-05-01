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
RUN addgroup app && adduser -S -G app app
RUN mkdir /app
COPY --from=builder /deps/node_modules /app/node_modules
ENV PATH /app/node_modules/.bin:$PATH
RUN chown -R app:app /app
USER app
WORKDIR /app/src/
EXPOSE 3000
