CREATE TABLE IF NOT EXISTS training_session (
    session_id VARCHAR(64) PRIMARY KEY,
    algorithm_code VARCHAR(64) NOT NULL,
    dataset_id VARCHAR(128),
    feature_columns_json CLOB,
    label_column VARCHAR(128),
    hyper_params_json CLOB,
    train_config_json CLOB,
    status VARCHAR(32) NOT NULL,
    current_step INT NOT NULL,
    max_steps INT NOT NULL,
    loss DOUBLE,
    metrics_json CLOB,
    parameters_json CLOB,
    predictions_json CLOB,
    visualization_json CLOB,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS app_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password VARCHAR(128) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS dataset_meta (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description VARCHAR(255),
    task_type VARCHAR(64) NOT NULL,
    source_type VARCHAR(32) NOT NULL,
    feature_count INT NOT NULL,
    sample_count INT NOT NULL,
    label_column VARCHAR(64),
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS algorithm_meta (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL,
    learning_type VARCHAR(64) NOT NULL,
    description VARCHAR(255),
    params_schema_json CLOB NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS experiment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(128) NOT NULL,
    learning_type VARCHAR(64) NOT NULL,
    algorithm_code VARCHAR(64) NOT NULL,
    dataset_code VARCHAR(64) NOT NULL,
    config_json CLOB NOT NULL,
    latest_session_id VARCHAR(64),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_experiment_user FOREIGN KEY (user_id) REFERENCES app_user(id)
);
