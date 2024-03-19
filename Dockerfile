# Use the official Node.js 18 image based on Debian Bullseye
FROM node:18-bullseye-slim
# FROM node:18-blpine

WORKDIR /usr/src/app

# Copy package.json and package-lock.json separately to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY ./index.js ./

# Specify the default command to run your application
CMD [ "node", "index.js" ]