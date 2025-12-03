# ----------------------------------
# Stage 1: Build the Application
# ----------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Define build arguments for environment variables
# These are needed at build time for Vite to embed them in the static files
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set them as environment variables for the build process
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Copy package files to install dependencies first (optimizes caching)
COPY package.json package-lock.json ./

# Install dependencies (clean install)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# ----------------------------------
# Stage 2: Serve with Nginx
# ----------------------------------
FROM nginx:alpine AS production

# Copy the built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (Coolify will map this to the public domain)
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]

