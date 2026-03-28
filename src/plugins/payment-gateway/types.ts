/** Configuration for Payment Gateway marketplace app */
export interface PaymentGatewayConfig {
    active_processor: "stripe" | "gps" | "square" | "none";
    stripe_mode: "TEST" | "LIVE";
    stripe_publishable_key?: string;
    stripe_secret_key?: string;
    stripe_webhook_secret?: string;
    gps_merchant_id?: string;
    gps_api_key?: string;
    gps_terminal_id?: string;
    square_application_id?: string;
    square_access_token?: string;
    square_location_id?: string;
    accepted_methods: string[];
    convenience_fee_enabled: boolean;
    convenience_fee_percent: number;
    convenience_fee_flat: number;
    auto_receipt: boolean;
}

export interface ProcessorStatus {
    name: string;
    connected: boolean;
    mode?: string;
    lastChecked?: string;
}
