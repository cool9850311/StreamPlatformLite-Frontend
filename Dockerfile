# Use the official Node.js image as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY . .

# Install dependencies
RUN cd stream_platform_nuxt && npm install


# Build the application
RUN cd stream_platform_nuxt && npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "stream_platform_nuxt/.output/server/index.mjs"]
