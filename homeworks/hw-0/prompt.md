Context: we have just set up a folder and some AI rules for future project development.
As a first feature to build we need to initialize an empty Rails project (latest available version).
Just pure API setup without extra Rails packages (that are relevant for UI).
Let's make sure we have default basic setup with Rails 8.*, latest bundler version, latest Minitest library.
The resulting setup should be containerized and have a Dockerfile to run the app in isolation with an appropriate Postgres 18 database.
Acceptance criteria is that Docker could build and start the container, and that web pod (Rails app) and Postgres 18 pods are running successfully.
