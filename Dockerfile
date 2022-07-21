FROM node:lts-alpine
RUN apk add git python3 make g++
USER node
WORKDIR /home/node/src/
ENV PATH /home/node/src/node_modules/.bin:$PATH
EXPOSE 3000
