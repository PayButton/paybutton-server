FROM  --platform=linux/amd64 node:lts-alpine
RUN apk add --no-cache python3 make g++ tmux openssl1.1-compat curl
USER node
WORKDIR /home/node/src/
ENV PATH /home/node/src/node_modules/.bin:$PATH
EXPOSE 3000
EXPOSE 5000
