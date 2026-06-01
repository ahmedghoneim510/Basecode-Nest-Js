/**
 * i18n keys for auth module responses.
 * Single source of truth — no hardcoded strings in services.
 */
export const AUTH_MESSAGES = {
  REGISTER_SUCCESS: 'auth.register_success',
  EMAIL_EXISTS: 'auth.email_exists',
  EMAIL_VERIFIED: 'auth.email_verified',
  EMAIL_ALREADY_VERIFIED: 'auth.email_already_verified',
  VERIFICATION_OTP_SENT: 'auth.verification_otp_sent',
  LOGIN_SUCCESS: 'auth.login_success',
  LOGIN_UNVERIFIED: 'auth.login_unverified',
  LOGGED_OUT: 'auth.logged_out',
  ACCESS_DENIED: 'auth.access_denied',
  INVALID_REFRESH_TOKEN: 'auth.invalid_refresh_token',
  RESET_EMAIL_SENT: 'auth.reset_email_sent',
  PASSWORD_RESET: 'auth.password_reset',
  PASSWORD_CHANGED: 'auth.password_changed',
  CURRENT_PASSWORD_INCORRECT: 'auth.current_password_incorrect',
  INVALID_EMAIL: 'auth.invalid_email',
  INVALID_REQUEST: 'auth.invalid_request',
  OTP_EXPIRED: 'auth.otp_expired',
  OTP_INVALID: 'auth.otp_invalid',
  OTP_TOO_MANY_ATTEMPTS: 'auth.otp_too_many_attempts',
} as const;
