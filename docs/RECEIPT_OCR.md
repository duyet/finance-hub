# Receipt OCR Feature

AI-powered receipt scanning using Cloudflare Workers AI (Llama 3.2 Vision) for automatic transaction data extraction.

## Features

- **Image Upload**: Support for JPEG, PNG, HEIC formats via file picker, camera capture, or drag-and-drop
- **AI OCR Processing**: Uses Llama 3.2 Vision model to extract structured data from receipt images
- **Data Extraction**: Automatically extracts merchant name, date, total amount, currency, line items, and tax
- **Category Suggestion**: AI-powered category recommendations using text embeddings (BGE model)
- **Confidence Scoring**: Indicates extraction accuracy with visual feedback
- **Multi-language Support**: Full i18n support for English and Vietnamese
- **Receipt History**: View all uploaded receipts with status tracking

## Architecture

### Cloudflare Services Used

1. **Workers AI**: `@cf/meta/llama-3.2-11b-vision-instruct` for OCR
2. **Workers AI**: `@cf/baai/bge-base-en-v1.5` for text embeddings
3. **R2 Storage**: `finance-hub-receipts` bucket for image storage
4. **D1 Database**: Receipt metadata and extracted data
5. **Queue**: Async OCR processing (optional, for background jobs)

### Project Structure

```
app/
├── lib/
│   ├── types/
│   │   └── receipt.ts                          # Receipt data types
│   ├── validations/
│   │   └── receipt.ts                          # Zod validation schemas
│   ├── db/
│   │   └── receipts.server.ts                  # Database CRUD operations
│   ├── services/
│   │   ├── ocr.server.ts                       # AI OCR processing
│   │   ├── storage.server.ts                   # R2 storage operations
│   │   └── category-suggestion.server.ts       # Category embeddings
│   └── i18n/
│       └── locales/
│           ├── en/
│           │   └── receipts.json
│           └── vi/
│               └── receipts.json
├── components/
│   └── receipts/
│       ├── ReceiptUpload.tsx                   # Upload component
│       ├── OcrProcessing.tsx                   # Loading indicator
│       └── ReceiptDataForm.tsx                 # Review and edit form
└── routes/
    ├── import.receipt.tsx                      # OCR import page
    ├── receipts._index.tsx                     # Receipt history
    ├── action.upload-receipt.tsx               # Upload action
    ├── action.process-receipt.tsx              # OCR processing action
    └── action.create-transaction-from-receipt.tsx
```

## Setup Instructions

### 1. Database Migration

Run the migration to create the receipts table:

```bash
# Using Wrangler
wrangler d1 execute finance-hub-prod --local --file=migrations/create_receipts_table.sql

# For production
wrangler d1 execute finance-hub-prod --file=migrations/create_receipts_table.sql
```

### 2. Configure R2 Bucket

Ensure your `wrangler.toml` has the R2 bucket configured:

```toml
[[r2_buckets]]
binding = "RECEIPTS_BUCKET"
bucket_name = "finance-hub-receipts"
```

Create the bucket if needed:

```bash
wrangler r2 bucket create finance-hub-receipts
```

### 3. Environment Variables

No additional environment variables needed. All bindings are configured in `wrangler.toml`.

## Usage

### Uploading a Receipt

1. Navigate to `/import/receipt`
2. Upload via:
   - **File Picker**: Click "Browse Files"
   - **Camera**: Click "Camera" (mobile devices)
   - **Drag & Drop**: Drop image file onto upload zone
3. AI processes the image automatically
4. Review extracted data
5. Edit fields if needed
6. Select account and category
7. Click "Create Transaction"

### Receipt History

View all receipts at `/receipts`:
- Filter by status (Pending, Processing, Completed, Needs Review, Failed)
- View extracted data preview
- Link to related transactions
- Delete receipts

## AI Models

### Llama 3.2 Vision (OCR)

**Model**: `@cf/meta/llama-3.2-11b-vision-instruct`

**Prompt Engineering**:
```typescript
const prompt = `
Extract the following information from this receipt:
- Merchant name
- Transaction date
- Total amount
- Currency
- Line items (if readable)
- Tax amount

Return as JSON with this structure:
{
  "merchantName": "string or null",
  "date": "YYYY-MM-DD or null",
  "totalAmount": number or null",
  "currency": "string or null",
  "lineItems": [...],
  "taxAmount": number or null
}
`;
```

### BGE Base En v1.5 (Embeddings)

**Model**: `@cf/baai/bge-base-en-v1.5`

**Usage**:
- Generate embeddings for category names
- Generate embedding for merchant name
- Calculate cosine similarity
- Suggest top 5 matching categories

## API Endpoints

### Upload Receipt
```
POST /action/upload-receipt
Content-Type: multipart/form-data

_action: upload-file
file: <binary>
```

### Process with OCR
```
POST /action.process-receipt
Content-Type: multipart/form-data

imageUrl: string
receiptId: string
detectCurrency: boolean
extractLineItems: boolean
locale: string
```

### Create Transaction
```
POST /action/create-transaction-from-receipt
Content-Type: multipart/form-data

accountId: string
categoryId: string
date: string
amount: number
description: string
merchantName: string
notes: string
receiptId: string
createTransaction: boolean
```

## Confidence Levels

- **0.7 - 1.0 (High)**: Green indicator, data likely accurate
- **0.4 - 0.7 (Moderate)**: Yellow indicator, review recommended
- **0.0 - 0.4 (Low)**: Red indicator, manual entry required

## Error Handling

The system handles various error scenarios:
- Invalid file format/type
- File size exceeded (5MB limit)
- OCR processing failures
- Low confidence results
- Storage upload failures
- Missing detected fields

## Localization

Supported languages:
- English (en)
- Vietnamese (vi)

Translation files:
- `/app/lib/i18n/locales/en/receipts.json`
- `/app/lib/i18n/locales/vi/receipts.json`

## Security Considerations

1. **File Validation**: Only accept JPEG, PNG, HEIC formats
2. **Size Limits**: Maximum 5MB per file
3. **User Isolation**: All receipts scoped to user_id
4. **R2 Security**: Direct server-side upload, no presigned URLs exposed
5. **Input Sanitization**: All inputs validated via Zod schemas

## Performance Optimization

1. **KV Caching**: Category embeddings cached for 24 hours
2. **Parallel Processing**: Upload and OCR processing in parallel where possible
3. **Lazy Loading**: Receipt history paginated (20 per page)
4. **Thumbnail Generation**: Planned feature for faster loading

## Future Enhancements

- [ ] Thumbnail generation for faster loading
- [ ] Queue-based async processing for large batches
- [ ] Support for PDF receipts
- [ ] Multi-page receipt support
- [ ] Receipt duplicate detection
- [ ] Advanced expense categorization rules
- [ ] Receipt search by merchant/amount
- [ ] Export receipts to PDF/CSV
- [ ] Receipt sharing between users

## Troubleshooting

### OCR Not Working

1. Check AI binding is available in `wrangler.toml`
2. Verify image format is supported
3. Check Cloudflare account has Workers AI enabled
4. Review logs for specific error messages

### R2 Upload Failures

1. Verify bucket binding in `wrangler.toml`
2. Check bucket exists and is accessible
3. Verify file size under 5MB limit
4. Check R2 permissions

### Category Suggestions Not Showing

1. Verify user has categories configured
2. Check AI binding is available
3. Review KV cache binding configuration
4. Check logs for embedding generation errors

## Testing

```bash
# Test upload endpoint
curl -X POST http://localhost:8788/action/upload-receipt \
  -F "_action=upload-file" \
  -F "file=@receipt.jpg"

# Test OCR processing
curl -X POST http://localhost:8788/action/process-receipt \
  -F "imageUrl=https://..." \
  -F "receiptId=..." \
  -F "detectCurrency=true"
```

## License

This feature is part of the Finance Hub application.
