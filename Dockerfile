# 通天箓 - Dockerfile
# Nginx Alpine for minimal image size

FROM nginx:alpine

# MediaPipe Hands version
ARG MEDIAPIPE_VERSION=0.4.1675469240

# Download MediaPipe Hands model files during build
RUN mkdir -p /usr/share/nginx/html/models/hands && \
    wget -q -O /usr/share/nginx/html/models/hands/hands.js \
        "https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_VERSION}/hands.js" && \
    wget -q -O /usr/share/nginx/html/models/hands/hands_solution_packed_assets_loader.js \
        "https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_VERSION}/hands_solution_packed_assets_loader.js" && \
    wget -q -O /usr/share/nginx/html/models/hands/hands_solution_packed_assets.data \
        "https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_VERSION}/hands_solution_packed_assets.data" && \
    wget -q -O /usr/share/nginx/html/models/hands/hands_solution_simd_wasm_bin.wasm \
        "https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_VERSION}/hands_solution_simd_wasm_bin.wasm" && \
    wget -q -O /usr/share/nginx/html/models/hands/hands_solution_wasm_bin.wasm \
        "https://cdn.jsdelivr.net/npm/@mediapipe/hands@${MEDIAPIPE_VERSION}/hands_solution_wasm_bin.wasm" && \
    echo "MediaPipe models downloaded successfully"

# Download camera_utils and drawing_utils
RUN mkdir -p /usr/share/nginx/html/models/camera_utils && \
    mkdir -p /usr/share/nginx/html/models/drawing_utils && \
    wget -q -O /usr/share/nginx/html/models/camera_utils/camera_utils.js \
        "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" && \
    wget -q -O /usr/share/nginx/html/models/drawing_utils/drawing_utils.js \
        "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy static files
COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY assets/ /usr/share/nginx/html/assets/

# Expose port
EXPOSE 80

# Health check using wget (use 127.0.0.1 to avoid IPv6 issues)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

# Start nginx with startup message
CMD echo "========================================" && \
    echo "  通天箓 - 手势互动符箓系统" && \
    echo "  Startup Success!" && \
    echo "  (MediaPipe models pre-loaded)" && \
    echo "========================================" && \
    echo "  Frontend: http://localhost:8088" && \
    echo "========================================" && \
    nginx -g "daemon off;"
