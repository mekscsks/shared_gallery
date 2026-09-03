FROM php:8.2-apache

# Install required PHP extensions
RUN apt-get update \
    && apt-get install -y \
        libzip-dev \
        unzip \
    && docker-php-ext-install \
        zip \
        pdo \
        pdo_mysql \
        mysqli \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Enable Apache URL rewriting
RUN a2enmod rewrite \
    && echo 'SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1' >> /etc/apache2/apache2.conf

WORKDIR /var/www/html

# Install PHP dependencies
COPY backend/composer.json /tmp/composer.json

WORKDIR /tmp
RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction

# Copy application
WORKDIR /var/www/html
COPY . .
COPY docker/php/uploads.ini /usr/local/etc/php/conf.d/uploads.ini

# Copy Composer dependencies
RUN cp -a /tmp/vendor /var/www/html/backend/vendor

# Create storage directories and permissions
RUN mkdir -p /var/www/html/backend/storage/uploads \
    && chown -R www-data:www-data /var/www/html/backend/storage \
    && chmod -R 775 /var/www/html/backend/storage

# Apache document root
ENV APACHE_DOCUMENT_ROOT=/var/www/html

RUN sed -ri \
    -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
    /etc/apache2/sites-available/000-default.conf \
    /etc/apache2/apache2.conf \
    /etc/apache2/conf-available/*.conf

EXPOSE 80
