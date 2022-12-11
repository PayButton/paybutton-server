FROM node:lts-alpine
RUN apk add --no-cache python3 make g++ tmux
USER node
WORKDIR /home/node/src/
ENV PATH /home/node/src/node_modules/.bin:$PATH
EXPOSE 3000
