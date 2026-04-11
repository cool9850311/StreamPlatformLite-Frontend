# Use the official Node.js image as the base image
FROM node:20-alpine

# Build-time argument for CSP configuration
# Default: strict CSP enabled (production)
# Set to 'false' for development
ARG ENABLE_STRICT_CSP=true

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY . .
WORKDIR /app/stream_platform_nuxt

# Install dependencies
RUN npm install

# Build the application with CSP configuration
RUN ENABLE_STRICT_CSP=$ENABLE_STRICT_CSP npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", ".output/server/index.mjs"]
