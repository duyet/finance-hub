# Bank Sync Webhook Integration

Automatic bank transaction import via webhooks from Vietnamese payment gateways (Casso and SePay).

## Overview

This feature automatically imports bank transactions from Vietnamese payment gateways via webhooks. Transactions are deduplicated, auto-categorized, and synced with your financial accounts in real-time.

## Supported Providers

### Casso (casso.vn)
- HMAC SHA256 signature verification
- Batch transaction processing
- Real-time webhook delivery

### SePay (sepay.vn)
- HMAC SHA256 signature verification
- Single transaction per webhook
- Real-time webhook delivery

## Architecture

### Database Schema

```sql
-- Bank sync configurations
bank_sync_configs (id, user_id, provider, api_key, webhook_secret, is_enabled)

-- Webhook event tracking
webhook_events (id, user_id, provider, payload, status, transactions_created)

-- Linked bank accounts
bank_accounts (id, user_id, provider, bank_name, account_number, financial_account_id)
```

### Service Layer

**`/app/lib/services/bank-sync.server.ts`**
- Webhook signature verification (HMAC SHA256)
- Payload parsing (Casso/SePay formats)
- Transaction deduplication by `reference_number`
- Financial account mapping
- Webhook event logging

**`/app/lib/services/transaction-categorization.server.ts`**
- Pattern-based auto-categorization
- 60+ Vietnamese transaction patterns
- Category creation on-demand
- Learning from user corrections

### API Endpoints

**POST `/api/webhooks/bank-sync/:provider`**
- Main webhook endpoint
- Handles Casso and SePay webhooks
- Returns: `{ success, message, processed, duplicates }`

**POST `/api/test-webhook`**
- Test webhook endpoint
- Simulates webhook payload
- Validates configuration

## Configuration

### 1. Environment Variables

Create `.dev.vars` (see `.dev.vars.example`):

```bash
CASSO_API_KEY=your_api_key
CASSO_WEBHOOK_SECRET=your_webhook_secret
SEPAY_API_KEY=your_api_key
SEPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 2. Database Migration

```bash
# Apply migration
npx wrangler d1 execute DB --file=migrations/0006_bank_sync.sql
```

### 3. Provider Setup

#### Casso Setup
1. Sign up at [casso.vn](https://casso.vn)
2. Get API key from dashboard
3. Add webhook URL: `https://your-domain.com/api/webhooks/bank-sync/casso`
4. Copy webhook secret
5. Configure in app: `/settings/bank-sync`

#### SePay Setup
1. Sign up at [sepay.vn](https://sepay.vn)
2. Get API key from dashboard
3. Add webhook URL: `https://your-domain.com/api/webhooks/bank-sync/sepay`
4. Copy webhook secret
5. Configure in app: `/settings/bank-sync`

## Webhook Payloads

### Casso Format

```json
{
  "error": 0,
  "data": [
    {
      "id": "transaction_id",
      "transaction_date": "2025-04-25",
      "amount": 500000,
      "content": "Transfer from John Doe",
      "code": "TRANSACTION_CODE",
      "reference_number": "unique_ref",
      "sub_account": "Account Name",
      "pay_method": "BANK_TRANSFER"
    }
  ]
}
```

### SePay Format

```json
{
  "transaction_id": "...",
  "transaction_date": "...",
  "amount": 500000,
  "content": "Transfer from John Doe",
  "code": "...",
  "reference_number": "...",
  "bank_account": "Account Number",
  "bank_name": "Bank Name"
}
```

## Transaction Categorization

### Pattern-Based Rules

Transactions are auto-categorized using 60+ Vietnamese patterns:

**Transport:**
- Grab, Uber, Be, Gojek
- Gas, petrol (xăng, dầu)
- Parking

**Food & Drink:**
- Coffee, cafe (Highlands, The Coffee House)
- Trà sữa (milk tea)
- Restaurants, food delivery

**Shopping:**
- Shopee, Lazada, Tiki
- Fashion, electronics
- Supermarkets

**Entertainment:**
- Netflix, Spotify, YouTube
- Games, apps
- Movies, cinema

**Bills & Utilities:**
- Electricity (điện)
- Water (nước)
- Internet, mobile

**Health:**
- Hospitals, clinics
- Pharmacies
- Health insurance

**Income:**
- Salary (lương)
- Freelance
- Dividends, interest

### Custom Rules

User-specific categorization rules can be added:
```typescript
await addCustomCategorizationRule(db, userId, pattern, category);
```

### Learning from Corrections

The system learns from manual categorization:
```typescript
await learnFromCategorization(db, userId, content, categoryId);
```

## Deduplication

Transactions are deduplicated using `reference_number`:

1. Check for existing transaction with same `reference_number`
2. Skip if exists (count as duplicate)
3. Create new transaction if unique

This prevents duplicate imports from webhook retries.

## Error Handling

### Webhook Errors

All webhooks are logged to `webhook_events` table:

| Status | Description |
|--------|-------------|
| `pending` | Received, not processed |
| `processing` | Currently processing |
| `success` | Processed successfully |
| `failed` | Processing failed |
| `duplicate` | All transactions were duplicates |

### Error Recovery

Failed webhooks can be:
- Viewed in webhook history
- Retried manually
- Debugged via error messages

## Testing

### Manual Test

```bash
curl -X POST https://your-domain.com/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "casso",
    "casso": {
      "error": 0,
      "data": [{
        "id": "test_123",
        "transaction_date": "2025-04-25",
        "amount": 500000,
        "content": "Test transaction",
        "reference_number": "REF_TEST_123"
      }]
    }
  }'
```

### Test in UI

Navigate to `/settings/bank-sync` and use the "Test Webhook" form.

## Monitoring

### Webhook History

View all webhook events at `/settings/bank-sync`:

- Timestamp
- Provider (Casso/SePay)
- Status
- Transactions created
- Error messages

### Metrics

Track:
- Webhook success rate
- Average processing time
- Duplicate rate
- Categorization accuracy

## Security

### Signature Verification

All webhooks are verified using HMAC SHA256:

```typescript
// Casso
await verifyCassoSignature(payload, signature, secret);

// SePay
await verifySePaySignature(payload, signature, secret);
```

### Best Practices

1. **Never expose API keys** - Store in environment variables
2. **Use HTTPS** - All webhooks must use HTTPS
3. **Verify signatures** - Reject unverified webhooks
4. **Rate limiting** - Implement rate limiting for webhook endpoints
5. **Logging** - Log all webhook events for auditing

## Troubleshooting

### Webhook Not Received

1. Check webhook URL is correct
2. Verify provider dashboard configuration
3. Check firewall/security settings
4. Review provider status page

### Signature Verification Failed

1. Verify webhook secret matches
2. Check payload encoding
3. Ensure signature header is read correctly

### Transactions Not Created

1. Check webhook event logs
2. Verify financial account exists
3. Review error messages
4. Check database constraints

### Incorrect Categorization

1. Review categorization patterns
2. Add custom rules for your transactions
3. Manually correct transactions
4. System learns from corrections

## Files Structure

```
finance-hub/
├── app/
│   ├── routes/
│   │   ├── api.webhooks.bank-sync.tsx     # Webhook endpoint
│   │   ├── api.test-webhook.tsx            # Test endpoint
│   │   └── settings.bank-sync.tsx          # Settings UI
│   ├── components/
│   │   └── bank-sync/
│   │       ├── WebhookUrlDisplay.tsx       # URL display component
│   │       ├── WebhookSetup.tsx            # Setup form
│   │       ├── ConnectionStatus.tsx        # Status indicator
│   │       ├── WebhookHistory.tsx          # Event history table
│   │       └── index.ts
│   └── lib/
│       └── services/
│           ├── bank-sync.server.ts         # Core webhook service
│           └── transaction-categorization.server.ts  # Categorization
└── migrations/
    └── 0006_bank_sync.sql                  # Database schema
```

## Future Enhancements

- [ ] Webhook retry queue for failed events
- [ ] AI-powered categorization using OpenAI
- [ ] Multi-account support per provider
- [ ] Real-time transaction notifications
- [ ] Webhook analytics dashboard
- [ ] Custom categorization rules UI
- [ ] Bank account reconciliation
- [ ] Transaction enrichment (merchant logos, categories)
- [ ] Scheduled sync (polling fallback)

## Support

For issues or questions:
1. Check webhook history in settings
2. Review browser console for errors
3. Check server logs
4. Verify provider dashboard status
5. Test with `/api/test-webhook`
