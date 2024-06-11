# MySql_slow_query_log

## Overview

This application sends MySQL slow query logs to the Prometheus Pushgateway. It reads the log file from the last recorded position. If the inode of the log file changes (e.g., due to log rotation), the application resets the last position to null and starts reading from the beginning of the new file.

## Setup and Usage

To run the application, follow these steps:

1. Create a `.env` file in the root directory of your project. This file should contain the necessary environment variables, similar to those defined in `.env.example`.

2. Export the current user and group IDs to the environment:
    ```sh
    export UID=${UID} && export GID=${GID}
    ```

3. Start the application using Docker Compose:
    ```sh
    docker-compose up -d
    ```
