FROM ruby:3.4.7-slim

ENV APP_HOME=/rails \
    BUNDLE_JOBS=4 \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_RETRY=3 \
    RAILS_ENV=development

WORKDIR ${APP_HOME}

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
      build-essential \
      curl \
      git \
      libpq-dev \
      libyaml-dev \
      pkg-config \
      postgresql-client && \
    rm -rf /var/lib/apt/lists/*

RUN gem install bundler -v 4.0.9 --no-document

COPY Gemfile Gemfile.lock ./
RUN bundle _4.0.9_ install

COPY . .

RUN chmod +x docker/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["bundle", "_4.0.9_", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "3000"]
