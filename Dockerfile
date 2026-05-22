FROM php:8.2-apache

# تثبيت الملحقات المطلوبة لقاعدة البيانات
RUN docker-php-ext-install pdo pdo_mysql

# نسخ كود تطبيق الويب والباك إيند إلى مجلد السيرفر داخل الحاوية
COPY ./gamecash-web /var/www/html/gamecash/gamecash-web
COPY ./gamecash-backend /var/www/html/gamecash/gamecash-backend

# تحديد الصلاحيات المناسبة لـ Apache
RUN chown -R www-data:www-data /var/www/html/gamecash

# تشغيل خادم Apache في الواجهة
EXPOSE 80
