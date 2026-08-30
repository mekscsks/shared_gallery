FROM php:8.2-apache

# PHP extensions required by the application
RUN docker-php-ext-install \
    pdo \
    pdo_mysql \
    mysqli

# Apache configuration
RUN a2enmod rewrite

# Keep backend structure intact
WORKDIR /var/www/html/backend

# Copy backend application
COPY backend/ /var/www/html/backend/

# Make uploads writable
RUN mkdir -p /var/www/html/backend/storage/uploads \
    && chown -R www-data:www-data /var/www/html/backend/storage

# Apache should serve backend/public
ENV APACHE_DOCUMENT_ROOT=/var/www/html/backend/public

RUN sed -ri \
    -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
    /etc/apache2/sites-available/000-default.conf \
    /etc/apache2/apache2.conf \
    /etc/apache2/conf-available/*.conf

EXPOSE 80