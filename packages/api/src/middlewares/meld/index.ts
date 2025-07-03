import {
  ErrorTypes,
  Unauthorized,
  UnauthorizedErrorTitles,
} from '@src/utils/error';
import crypto from 'crypto';
import { NextFunction, Response } from 'express';
import { IAuthRequest } from '../auth/types';

const MELD_WEBHOOK_SECRET = process.env.MELD_WEBHOOK_SECRET;

if (!MELD_WEBHOOK_SECRET) {
  console.warn(
    '[MELD] Warning: MELD_WEBHOOK_SECRET environment variable is not set',
  );
}

/**
 * Middleware to verify Meld webhook signatures
 *
 * Meld signs webhook events using HMAC-SHA256 with the secret defined in the webhook profile.
 * The signature is constructed using: base64url(HMACSHA256(<TIMESTAMP>.<URL>.<BODY>))
 *
 * Headers expected:
 * - Meld-Signature: The signature to verify against
 * - Meld-Signature-Timestamp: The timestamp of the event
 */
export function MeldAuthMiddleware(
  req: IAuthRequest,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!MELD_WEBHOOK_SECRET) {
      throw new Unauthorized({
        title: UnauthorizedErrorTitles.MISSING_CREDENTIALS,
        detail: 'MELD_WEBHOOK_SECRET environment variable is not set',
        type: ErrorTypes.Unauthorized,
      });
    }

    const signature = req.headers['meld-signature'] as string;
    const timestamp = req.headers['meld-signature-timestamp'] as string;

    if (!signature || !timestamp) {
      throw new Unauthorized({
        title: UnauthorizedErrorTitles.MISSING_CREDENTIALS,
        detail: 'Meld-Signature and Meld-Signature-Timestamp headers are required',
        type: ErrorTypes.Unauthorized,
      });
    }

    // Get the raw body as string
    const rawBody = JSON.stringify(req.body);

    // Construct the full URL
    const protocol = req.protocol;
    const host = req.get('host');

    const url = `${protocol}://${host}${req.originalUrl}`;

    // Create the string to sign: TIMESTAMP.URL.BODY
    const stringToSign = `${timestamp}.${url}.${rawBody}`;

    // Create HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', MELD_WEBHOOK_SECRET)
      .update(stringToSign)
      .digest('base64url')
      .replace(/=/g, ''); // Base64 URL encoded without padding
    const sanitizedReceived = signature.replace(/=+$/, '');

    // Compare signatures using timing-safe comparison
    if (sanitizedReceived !== expectedSignature) {
      console.error('[MELD] Webhook signature verification failed', {
        expected: expectedSignature,
        received: sanitizedReceived,
        stringToSign,
        url,
        timestamp,
      });

      throw new Unauthorized({
        title: UnauthorizedErrorTitles.INVALID_SIGNATURE,
        detail: 'Invalid Meld webhook signature',
        type: ErrorTypes.Unauthorized,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}
