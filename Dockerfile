# ============================================================
# CSS Sandbox — Static Site Container
# Single-stage build: copies static assets into a hardened
# nginx image. No build step required since there is no
# bundler or transpiler — the source IS the artifact.
# ============================================================
FROM nginx:1.27-alpine

# Security hardening: run nginx as non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy all static assets into the nginx html root
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY lzstring.js /usr/share/nginx/html/
COPY highlight.js /usr/share/nginx/html/

# Custom nginx configuration optimized for a static single-page app
# - Security headers to prevent clickjacking, MIME sniffing, XSS
# - Gzip compression for JS, CSS, HTML
# - Cache-Control headers: aggressive for assets, no-cache for HTML
# - Content-Security-Policy: restrictive default, allows inline styles
#   (needed for the live CSS preview) and blob: URIs (for iframe sandbox)
RUN cat > /etc/nginx/conf.d/default.conf << 'NGINX'
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # --- Security headers ---
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; frame-src blob:; connect-src 'self' https://cdn.jsdelivr.net;" always;

    # --- Compression ---
    gzip on;
    gzip_types application/javascript text/css text/html application/json;
    gzip_min_length 256;

    # --- Caching ---
    # JS and CSS assets: moderate cache (no content-hash in filenames)
    location ~* \.(js|css)$ {
        expires 7d;
        add_header Cache-Control "public";
    }

    # Images and icons
    location ~* \.(png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # HTML: always serve fresh to pick up new deploys
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

# Fix permissions for non-root execution
RUN chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appgroup /var/run/nginx.pid

USER appuser

EXPOSE 8080

# Healthcheck to verify the container is serving
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
