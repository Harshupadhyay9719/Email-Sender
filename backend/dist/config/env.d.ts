/**
 * Environment Configuration and Validation
 */
interface Config {
    node_env: string;
    port: number;
    api_version: string;
    log_level: string;
    mongodb_uri: string;
    mongodb_test_uri: string;
    jwt_secret: string;
    jwt_expires_in: string;
    jwt_refresh_secret: string;
    jwt_refresh_expires_in: string;
    redis_host: string;
    redis_port: number;
    redis_password: string;
    redis_db: number;
    aws_region: string;
    aws_s3_bucket: string;
    enable_email_validation: boolean;
    max_file_size: number;
    rate_limit_window_ms: number;
    rate_limit_max_requests: number;
    email_send_delay_min: number;
    email_send_delay_max: number;
    email_daily_limit: number;
    cors_origin: string[];
    google_client_id: string;
    google_client_secret: string;
    google_callback_url: string;
}
declare const config: Config;
export default config;
//# sourceMappingURL=env.d.ts.map