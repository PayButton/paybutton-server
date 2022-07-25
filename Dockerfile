FROM node:lts-alpine as builder
WORKDIR /deps
RUN apk add --no-cache python3 make g++
COPY yarn.lock package.json /deps/
RUN yarn install --frozen-lockfile

FROM node:lts-alpine as paybutton-server
WORKDIR /home/node/src/
COPY --from=builder --chown=node:node /deps/node_modules node_modules
ENTRYPOINT ["./entrypoint.sh"]
