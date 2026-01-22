# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies including devDependencies
# Use --include=dev to explicitly ensure dev dependencies are installed for the build step
RUN npm install --include=dev --legacy-peer-deps

# Copy source files
COPY . .

# Build
RUN npm run build

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