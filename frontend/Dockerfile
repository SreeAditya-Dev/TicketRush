# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies including devDependencies
RUN npm install --include=dev --legacy-peer-deps --verbose

# Copy source files
COPY . .

# Debug: Check if node_modules exists
RUN ls -la node_modules/.bin || echo "node_modules/.bin not found"

# Build using local binaries
RUN ./node_modules/.bin/tsc -b && ./node_modules/.bin/vite build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the build output from the builder stage
# Verify if your build output goes to 'dist' or 'build'. Vite usually defaults to 'dist'.
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]