FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --production=false

COPY . .
RUN yarn build

EXPOSE 3000

CMD ["node", "dist/main.js"]
