# **Technical Product Requirements Document: Finance Hub Platform**

## **1\. Executive Summary & Strategic Vision**

### **1.1 Product Vision and Context**

The **Finance Hub** is envisioned as a comprehensive, serverless Personal Finance Management (PFM) application designed to bridge the gap between manual spreadsheet tracking and automated financial intelligence. The project originates from a critical business need: the "spreadsheet chaos" experienced by founders and small business owners who juggle multiple SaaS subscriptions, office leases, cloud infrastructure bills, and varied credit lines across disparate systems. The current manual workflow—involving Excel/Google Sheets, scattered invoices in Slack/Email, and manual year-end reconciliation—is error-prone and operationally inefficient.

The Finance Hub aims to centralize these data streams into a single, cohesive interface deployed on the **Cloudflare Edge**. By leveraging the distributed nature of Cloudflare Workers and the relational capabilities of D1, the platform offers zero-latency access to financial data, effectively eliminating the "loading time" friction associated with traditional server-based financial apps. The core value proposition lies in its ability to handle complex financial instruments inherent to the Southeast Asian (specifically Vietnamese) market, including floating-interest loans, multi-card billing cycles with varying due dates, and bilingual (English/Vietnamese) operational requirements.

### **1.2 Strategic Objectives**

The development of the Finance Hub is driven by four primary strategic objectives, derived from the user's operational pain points:

1. **Operational Consolidation:** To unify tracking of monthly income, expenses, and company runway into a single "pane of glass" dashboard. This replaces the fragmentation of 10+ SaaS tools and manual spreadsheets \[Image 1\], providing a real-time view of cash flow and burn rate.  
2. **Automated Data Ingestion:** To reduce manual data entry by approximately 80% through the implementation of AI-driven Optical Character Recognition (OCR) for receipts and invoices.1 This system must seamlessly ingest unstructured data (PDFs, images) and convert it into structured financial transactions without human intervention.  
3. **Complex Liability Management:** To provide sophisticated tooling for managing liabilities that standard PFMs overlook. This includes the precise calculation of credit card grace periods based on statement dates \[Image 4\] and the management of long-term loans with floating interest rates \[Image 3\], ensuring users never miss a payment or miscalculate interest accruals.  
4. **Market Localization:** To build a "Vietnam-First" architecture that natively supports the Vietnamese Dong (VND), integrates with local banking intermediaries (Casso/SePay) 3, and offers a fluid bilingual experience (EN/VN) for cross-functional teams.

### **1.3 Scope of Work**

This Product Requirements Document (PRD) outlines the comprehensive technical specifications for the Finance Hub. The scope encompasses the end-to-end development lifecycle, including:

* **Infrastructure:** Deployment configuration for Cloudflare Workers, Pages, D1 (SQLite), and R2 Object Storage.  
* **Database Design:** A normalized relational schema optimized for financial integrity and D1's specific consistency models.  
* **Application Logic:** Full-stack implementation using Remix (React Router v7) for server-side rendering and interactive client-side hydration.  
* **AI Integration:** Pipelines for integrating Cloudflare Workers AI (Llama 3.2 Vision) for document analysis.  
* **Frontend Library:** A custom design system built upon Shadcn UI and Tailwind CSS.  
* **Third-Party Integration:** Webhook handlers for real-time bank synchronization and OAuth providers (Google/GitHub).

## ---

**2\. Technical Architecture & Infrastructure Design**

### **2.1 The Distributed Serverless Paradigm**

The Finance Hub adopts a **Distributed Serverless Architecture**, fundamentally diverging from traditional monolithic or microservices container-based approaches. By utilizing the Cloudflare Developer Platform, the application logic resides not in a centralized region (e.g., us-east-1), but is replicated across Cloudflare's global network of data centers. This ensures that the application logic runs physically close to the user, minimizing network latency—a critical factor for a dashboard application where users expect instant feedback.

The architecture is composed of distinct, loosely coupled components communicating via Service Bindings and standard HTTP/RPC protocols.

| Component | Technology | Function | Justification |
| :---- | :---- | :---- | :---- |
| **Edge Runtime** | Cloudflare Workers | Core compute | Eliminates "cold starts" typical of AWS Lambda; zero egress fees; native integration with D1/KV.4 |
| **Frontend Framework** | Remix (React Router v7) | App Logic & SSR | Enables nested routing for complex dashboards; optimized for edge deployment; superior data loading patterns.5 |
| **Database** | Cloudflare D1 | Relational Data | SQL support is non-negotiable for financial ledgers; D1 offers SQLite at the edge with read replication.7 |
| **Object Storage** | Cloudflare R2 | Asset Storage | S3-compatible storage for receipts/invoices; zero egress fees allows for cost-effective heavy media handling.8 |
| **AI Inference** | Workers AI | OCR/Classification | Serverless GPU access for running Llama 3.2 Vision without managing infrastructure.9 |
| **Asynchronous Ops** | Cloudflare Queues | Background Jobs | Decouples heavy processing (e.g., CSV parsing, AI analysis) from the user-facing request loop.10 |

### **2.2 System Context & Data Flow**

The system operates through a series of event-driven interactions.

1. **User Interaction Flow:**  
   * The user requests the Finance Hub via a browser. Cloudflare DNS routes the request to the nearest PoP (Point of Presence).  
   * **Remix (on Cloudflare Pages)** handles the request. It authenticates the user via a session token stored in a secure cookie.  
   * **Data Fetching:** The Remix loader queries **D1** for transaction data. If the data is computationally expensive (e.g., a yearly summary), it checks **Cloudflare KV** for a cached result.  
   * **Rendering:** The page is Server-Side Rendered (SSR) with the initial state and sent to the client. React hydrates the page for interactivity.  
2. **AI/OCR Ingestion Flow:**  
   * User uploads a receipt image.  
   * The frontend obtains a **Presigned URL** for R2 and uploads the image directly.  
   * Upon upload success, the Remix action enqueues a message to **Cloudflare Queues** containing the R2 object key.  
   * A dedicated **Consumer Worker** picks up the message, downloads the image from R2, and sends it to **Workers AI (Llama 3.2)**.  
   * The AI response (JSON) is parsed and inserted into D1 as a "Pending Transaction."  
3. **Bank Sync Flow (Webhook):**  
   * Casso or SePay (payment gateways) detect a bank transfer.  
   * They fire a webhook POST request to the Finance Hub Worker.  
   * The Worker validates the signature, deduplicates the transaction using the reference\_number, and updates the ledger in D1.

### **2.3 Deployment Configuration (wrangler.toml)**

The infrastructure is defined as code. The wrangler.toml configuration binds the disparate resources to the Remix application.

Ini, TOML

name \= "finance-hub"  
compatibility\_date \= "2024-04-05"  
compatibility\_flags \= \["nodejs\_compat"\]

\# Static Asset Serving for Remix  
\[site\]  
bucket \= "./public"

\# Database Binding  
\[\[d1\_databases\]\]  
binding \= "DB"  
database\_name \= "finance-hub-prod"  
database\_id \= "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

\# Object Storage for Receipts  
\[\[r2\_buckets\]\]  
binding \= "RECEIPTS\_BUCKET"  
bucket\_name \= "finance-hub-receipts"

\# Queue for Async Jobs (AI, CSV Parsing)  
\[\[queues.producers\]\]  
queue \= "transaction-processing-queue"  
binding \= "QUEUE"

\[\[queues.consumers\]\]  
queue \= "transaction-processing-queue"  
max\_batch\_size \= 5  
max\_batch\_timeout \= 30

\# AI Binding  
\[ai\]  
binding \= "AI"

## ---

**3\. Database Schema & Data Modeling**

### **3.1 Design Principles**

Financial data requires strict integrity. While NoSQL solutions offer flexibility, the Finance Hub strictly employs a **Relational Model** (3rd Normal Form) using SQLite (D1) to ensure transactional consistency (ACID) and accurate reporting.

* **Normalization:** Data is split into logical entities (Accounts, Transactions, Users) to prevent duplication.  
* **Foreign Keys:** Strictly enforced to maintain referential integrity (e.g., a transaction cannot exist without an account).  
* **Currency Handling:** All monetary values are stored as INTEGER (representing the minor unit, e.g., cents or Dong) or REAL with strict application-level rounding logic to avoid floating-point errors. Given the high denomination of VND (e.g., 230,000,000 VND), INTEGER is preferred, but REAL is acceptable in SQLite if precision is managed carefully.11

### **3.2 Entity Relationship Diagram (ERD) Overview**

#### **3.2.1 Users & Authentication**

Utilizing the schema recommended by @auth/d1-adapter ensures compatibility with Auth.js while maintaining extensibility.12

SQL

CREATE TABLE users (  
  id TEXT PRIMARY KEY, \-- CUID or UUID  
  name TEXT,  
  email TEXT NOT NULL UNIQUE,  
  email\_verified DATETIME,  
  image TEXT,  
  default\_currency TEXT DEFAULT 'VND',  
  created\_at DATETIME DEFAULT CURRENT\_TIMESTAMP,  
  updated\_at DATETIME DEFAULT CURRENT\_TIMESTAMP  
);

CREATE TABLE accounts (  
  id TEXT PRIMARY KEY,  
  userId TEXT NOT NULL,  
  type TEXT NOT NULL,  
  provider TEXT NOT NULL, \-- 'google' or 'github'  
  providerAccountId TEXT NOT NULL,  
  refresh\_token TEXT,  
  access\_token TEXT,  
  expires\_at INTEGER,  
  token\_type TEXT,  
  scope TEXT,  
  id\_token TEXT,  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE  
);

CREATE TABLE sessions (  
  id TEXT PRIMARY KEY,  
  sessionToken TEXT NOT NULL UNIQUE,  
  userId TEXT NOT NULL,  
  expires DATETIME NOT NULL,  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE  
);

#### **3.2.2 Core Financial Entities**

The financial\_accounts table is the polymorphic parent for all asset types (Bank, Cash, Credit, Loan).

SQL

CREATE TABLE financial\_accounts (  
  id TEXT PRIMARY KEY,  
  user\_id TEXT NOT NULL,  
  name TEXT NOT NULL, \-- e.g., "Citibank Visa", "Home Loan"  
  type TEXT CHECK(type IN ('CHECKING', 'SAVINGS', 'CREDIT\_CARD', 'LOAN', 'WALLET', 'INVESTMENT')) NOT NULL,  
  currency TEXT DEFAULT 'VND',  
  current\_balance REAL DEFAULT 0, \-- Cached balance for quick reads  
  institution\_name TEXT,  
  account\_number\_last4 TEXT,  
  color\_theme TEXT, \-- Hex code for UI  
  is\_archived BOOLEAN DEFAULT 0,  
  created\_at DATETIME DEFAULT CURRENT\_TIMESTAMP,  
  FOREIGN KEY (user\_id) REFERENCES users(id)  
);

CREATE TABLE categories (  
  id TEXT PRIMARY KEY,  
  user\_id TEXT NOT NULL,  
  name TEXT NOT NULL, \-- e.g., "Nhà", "Điện", "SaaS"  
  type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,  
  parent\_id TEXT, \-- For nested categories  
  budget\_limit REAL, \-- Optional monthly budget  
  FOREIGN KEY (user\_id) REFERENCES users(id)  
);

CREATE TABLE transactions (  
  id TEXT PRIMARY KEY,  
  user\_id TEXT NOT NULL,  
  account\_id TEXT NOT NULL,  
  category\_id TEXT,  
  date DATETIME NOT NULL,  
  amount REAL NOT NULL, \-- Negative for outflows, positive for inflows  
  description TEXT NOT NULL,  
  merchant\_name TEXT,  
  status TEXT CHECK(status IN ('PENDING', 'POSTED', 'CLEARED', 'RECONCILED')) DEFAULT 'POSTED',  
  reference\_number TEXT, \-- Bank transaction ID  
  receipt\_url TEXT, \-- R2 URL  
  notes TEXT,  
  created\_at DATETIME DEFAULT CURRENT\_TIMESTAMP,  
  updated\_at DATETIME DEFAULT CURRENT\_TIMESTAMP,  
  FOREIGN KEY (account\_id) REFERENCES financial\_accounts(id),  
  FOREIGN KEY (category\_id) REFERENCES categories(id)  
);  
\-- Index for dashboard performance  
CREATE INDEX idx\_transactions\_date ON transactions(user\_id, date DESC);  
CREATE INDEX idx\_transactions\_account ON transactions(account\_id, date DESC);

#### **3.2.3 Credit Card Specific Schema**

To satisfy the requirement of managing "many cards with different due dates" \[User Query, Image 4\], we need a specialized table to store cycle configuration.

SQL

CREATE TABLE credit\_card\_configs (  
  account\_id TEXT PRIMARY KEY,  
  statement\_day INTEGER NOT NULL, \-- Day of month (e.g., 25\)  
  payment\_due\_day\_offset INTEGER NOT NULL, \-- Days after statement (e.g., 20\)  
  credit\_limit REAL NOT NULL,  
  apr REAL, \-- Annual Percentage Rate  
  FOREIGN KEY (account\_id) REFERENCES financial\_accounts(id) ON DELETE CASCADE  
);

CREATE TABLE credit\_card\_statements (  
  id TEXT PRIMARY KEY,  
  account\_id TEXT NOT NULL,  
  cycle\_start\_date DATE NOT NULL,  
  cycle\_end\_date DATE NOT NULL,  
  statement\_date DATE NOT NULL,  
  due\_date DATE NOT NULL,  
  opening\_balance REAL NOT NULL,  
  closing\_balance REAL NOT NULL,  
  minimum\_payment REAL,  
  payment\_status TEXT CHECK(payment\_status IN ('UNPAID', 'PARTIAL', 'PAID')) DEFAULT 'UNPAID',  
  pdf\_url TEXT, \-- Link to stored PDF statement  
  FOREIGN KEY (account\_id) REFERENCES financial\_accounts(id)  
);

#### **3.2.4 Loan Management & Floating Interest Schema**

To handle floating interest rates \[Image 3\], we cannot store a static amortization schedule. We must store the *parameters* and the *history* of rate changes.

SQL

CREATE TABLE loans (  
  account\_id TEXT PRIMARY KEY,  
  principal\_original REAL NOT NULL, \-- e.g., 230,000,000  
  start\_date DATE NOT NULL,  
  term\_months INTEGER NOT NULL, \-- e.g., 84  
  interest\_calculation\_method TEXT CHECK(interest\_calculation\_method IN ('FLAT', 'REDUCING\_BALANCE')) DEFAULT 'REDUCING\_BALANCE',  
  disbursement\_date DATE,  
  FOREIGN KEY (account\_id) REFERENCES financial\_accounts(id) ON DELETE CASCADE  
);

CREATE TABLE loan\_interest\_rates (  
  id TEXT PRIMARY KEY,  
  loan\_id TEXT NOT NULL,  
  effective\_date DATE NOT NULL,  
  rate\_percentage REAL NOT NULL, \-- Annual Rate, e.g., 7.9  
  FOREIGN KEY (loan\_id) REFERENCES loans(account\_id)  
);

CREATE TABLE loan\_installments (  
  id TEXT PRIMARY KEY,  
  loan\_id TEXT NOT NULL,  
  due\_date DATE NOT NULL,  
  installment\_number INTEGER NOT NULL,  
  principal\_component REAL NOT NULL,  
  interest\_component REAL NOT NULL,  
  total\_amount REAL NOT NULL,  
  status TEXT CHECK(status IN ('ESTIMATED', 'DUE', 'PAID', 'OVERDUE')) DEFAULT 'ESTIMATED',  
  FOREIGN KEY (loan\_id) REFERENCES loans(account\_id)  
);

## ---

**4\. Authentication & Security Strategy**

### **4.1 Authentication Provider Integration**

The application will support **Google** and **GitHub** OAuth providers. This dual-provider approach caters to the typical user base: business owners (Google Workspace) and technical founders (GitHub).

* **Implementation:** The remix-auth library will be used in conjunction with remix-auth-google and remix-auth-github strategies.  
* **Flow:**  
  1. User clicks "Login with Google".  
  2. Remix redirects to Google's OAuth 2.0 endpoint.  
  3. Google redirects back to /auth/google/callback with a code.  
  4. The Worker exchanges the code for an ID Token and Access Token.  
  5. The system checks the users table. If the email exists, a session is created. If not, a new user record is provisioned.  
  6. A signed HttpOnly cookie containing the sessionToken is set in the response.

### **4.2 Security Best Practices**

* **CSRF Protection:** All mutating actions (POST, PUT, DELETE) must be protected. Remix's form handling combined with strict SameSite=Lax cookie policies provides inherent protection, but explicit CSRF tokens will be implemented for critical financial actions.  
* **Row-Level Security (RLS) Simulation:** Since D1 does not support native RLS like PostgreSQL, authorization logic is enforced at the Application Layer (Service Layer).  
  * *Mechanism:* Every database query function accepts a userId parameter.  
  * *Example:* SELECT \* FROM transactions WHERE user\_id \=? AND id \=?. This strictly prevents cross-tenant data leakage.  
* **Environment Variables:** Secrets (Client Secrets, API Keys) are stored in Cloudflare encrypted environment variables, accessible only via the env object in the Worker context.

## ---

**5\. Core Feature: Financial Dashboard & Runway Analysis**

### **5.1 Dashboard UI Composition (Shadcn/Tailwind)**

The dashboard serves as the command center, directly addressing the "runway managing... killing me" pain point. It aggregates data from all sub-modules.

* **Header Section:** Displays the current Net Worth and total "Runway" (Cash / Average Monthly Burn).  
* **Main Chart:** A stacked bar chart (using Recharts) visualizing "Income vs. Expenses" over the last 12 months.  
  * *Data Source:* Aggregated transactions grouped by month and type.  
  * *Interaction:* Clicking a bar drills down into that month's category breakdown.  
* **Expense Breakdown:** A pie chart showing the distribution of expenses by category (e.g., Home, Management Fee, Credit Card).  
* **Runway Widget:** A specific component tracking the "Safe Mode" metric.  
  * *Logic:* $\\text{Runway (Months)} \= \\frac{\\text{Total Liquid Assets}}{\\text{Average Monthly Expense (Last 3 Months)}}$.  
  * *Visual:* A gauge or progress bar indicating health (Green \> 6 months, Yellow 3-6 months, Red \< 3 months).

### **5.2 Transactions Module**

* **Data Table:** A Shadcn DataTable capable of handling thousands of rows with virtualization.  
* **Columns:** Date, Merchant, Category (Badge), Account (Icon), Amount (colored Red/Green), Actions (Edit/Delete).  
* **Filtering:** Faceted filters for "Account," "Category," and "Date Range."  
* **Bulk Actions:** Allow users to select multiple transactions and "Bulk Edit Category" or "Delete," facilitated by a Remix Action that receives an array of IDs.

## ---

**6\. Module: Credit Card Management Engine**

### **6.1 The "Billing Cycle" Problem**

The user explicitly mentions: "I have many cards with different due dates" \[User Query\]. Managing cash flow requires knowing exactly *when* money leaves the account, which differs from the transaction date.

### **6.2 Logic & Algorithm**

The system implements a **Billing Cycle Engine** that automatically groups transactions into statement periods.

* **Inputs:** statement\_day (e.g., 25th), due\_day\_offset (e.g., 20 days).  
* **Algorithm:**  
  1. **Determine Current Cycle:** For any given date $D$, if $Day(D) \> statement\\\_day$, the transaction belongs to the cycle ending next month. If $Day(D) \\le statement\\\_day$, it belongs to the cycle ending this month.  
  2. **Grace Period Calculation:**  
     * Statement Date: $S \= \\text{Month}(M), \\text{Day}(statement\\\_day)$.  
     * Due Date: $D \= S \+ due\\\_day\\\_offset$ days.  
  3. **Floating Date Adjustment:** If the calculated Statement Date falls on a weekend, the engine (optionally) shifts it to the next business day, though for estimation purposes, the static date is usually sufficient.

### **6.3 Interface Implementation**

* **Card View:** A dedicated page for each credit card.  
* **Cycle Timeline:** A horizontal stepper visualizing the current cycle:  
  * *Start Date* \-\> *Today* \-\> *Statement Date (Est)* \-\> *Due Date*.  
* **Statement History:** A list of past statements showing "Statement Balance," "Minimum Due," and "Payment Status."  
* **Payment Reminder:** If Today \> Statement Date and Payment Status \== UNPAID, a prominent alert banner appears on the Dashboard.

## ---

**7\. Module: Loan Management & Floating Interest**

### **7.1 The "Floating Rate" Challenge**

Image 3 shows a loan schedule with "Lãi suất" (Interest Rate) at 7.9% and "Lãi (dự kiến)" (Expected Interest). In Vietnam, loans often have a fixed rate for the first 6-12 months, after which they float based on the bank's base rate \+ margin. Spreadsheets handle this by manual row updates; the Finance Hub must handle it programmatically.

### **7.2 Amortization Engine Logic**

The system uses the **Reducing Balance Method** for calculation.

* Formula:

  $$I\_n \= P\_{n-1} \\times \\frac{r}{12}$$  
  $$E\_n \= P\_{n-1} \+ I\_n \\quad \\text{(if paying principal \+ interest)}$$

  Where $I\_n$ is interest for month $n$, $P\_{n-1}$ is outstanding principal, and $r$ is annual rate.

### **7.3 Use Case: Rate Adjustment**

When the bank announces a rate change (e.g., from 7.9% to 8.5%):

1. **User Action:** User navigates to the Loan Settings and adds a "New Rate Event": Rate 8.5%, Effective Date: 01/01/2026.  
2. **System Process:**  
   * The loans table is updated with the new current\_interest\_rate.  
   * A new record is inserted into loan\_interest\_rates.  
   * **Recalculation:** A background process (or immediate helper function) queries all loan\_installments where due\_date \> effective\_date.  
   * It iteratively recalculates the interest\_component and total\_amount for these future installments based on the *remaining principal* at that point in time.  
   * The database is updated with the new schedule.  
3. **Visualization:** The "Big Plan" or "Loan Details" chart immediately reflects the increased cost of borrowing, showing the new total interest payable over the loan term.

## ---

**8\. Module: Import & Data Ingestion**

### **8.1 The Data Entry Bottleneck**

The user's primary pain point is "Invoices were everywhere... inbox, Slack, PDFs." To solve this, the Finance Hub offers multiple ingestion channels.

### **8.2 Channel 1: CSV Import (Shadcn \+ AI)**

For bulk historical data or banks without API support.

* **Component:** react-csv-importer or a custom Shadcn implementation using react-dropzone.14  
* **AI Mapping:**  
  * When a CSV is uploaded, the header row is extracted.  
  * If the headers do not match the standard schema (date, amount, desc), the array of headers is sent to **Workers AI (Llama 3.2)**.  
  * *Prompt:* "Map these CSV headers \`\` to standard keys \['date', 'amount', 'description'\]. Return JSON."  
  * The system pre-fills the mapping dialog for the user to confirm.

### **8.3 Channel 2: Receipt OCR (AI Vision)**

* **Process:**  
  * User uploads a photo of a taxi receipt or dinner bill via the mobile web view.  
  * **Llama 3.2 Vision Analysis:** The image is processed to extract key entities.  
    * *Extraction Target:* Merchant Name, Date, Total Amount, Currency, Items (if legible).  
  * **Auto-Categorization:** The text description is embedded using @cf/baai/bge-base-en-v1.5. The vector is compared (cosine similarity) against the user's category list to suggest a category (e.g., "Grab" \-\> "Transport").

### **8.4 Channel 3: Bank Sync (Webhook)**

For real-time updates from Vietnamese banks.

* **Provider:** Casso or SePay.  
* **Webhook Handler:**  
  * Endpoint: https://finance-hub.workers.dev/api/webhooks/casso  
  * **Payload Parsing:**  
    JSON  
    {  
      "error": 0,  
      "data":  
    }

  * **Logic:** The worker iterates through the data array. It attempts to find a transaction with the same reference\_number. If not found, it creates a new transaction in D1 with status CLEARED.

## ---

**9\. Frontend Experience & Localization**

### **9.1 Bilingual Support (i18n)**

The prompt specifically requests "Bilingual (Eng/VN)." This is not just text translation; it involves cultural formatting.

* **Library:** remix-i18next.16  
* **Resource Management:** Translation files (en.json, vi.json) are stored in public/locales.  
* **Server-Side Detection:**  
  * The entry.server.tsx detects the user's preferred language from the Accept-Language header or a session cookie.  
  * The app renders the HTML with the correct lang attribute.  
* **Formatting Nuances:**  
  * **Currency:**  
    * EN/USD: $1,234.56 (Comma separator, Dot decimal).  
    * VN/VND: 1.234.560 ₫ (Dot separator, Comma decimal \- standard in VN finance).  
  * **Dates:**  
    * EN: MM/DD/YYYY or MMM DD, YYYY.  
    * VN: DD/MM/YYYY.

### **9.2 Shadcn UI Component Strategy**

* **Layout:** A persistent Sidebar navigation (collapsible on mobile) using Shadcn Sheet and Sidebar components.  
* **Data Density:** Financial data requires high density. We will use the Table component with "compact" padding.  
* **Visual Hierarchy:**  
  * **Positive/Income:** Green (text-green-600).  
  * **Negative/Expense:** Red (text-red-600).  
  * **Pending/Processing:** Yellow/Amber (text-amber-500).  
* **Accessibility:** All inputs and interactive elements must support keyboard navigation and screen readers, adhering to Shadcn's built-in Radix UI primitives.

## ---

**10\. DevOps, Migration & PDF Generation**

### **10.1 Database Migrations**

D1 schema evolution is managed via Wrangler.

* **Workflow:**  
  1. Developer writes SQL change script: migrations/0002\_add\_loan\_rates.sql.  
  2. npx wrangler d1 migrations apply DB \--local for testing.  
  3. npx wrangler d1 migrations apply DB \--remote for production.  
* **Safety:** Before applying remote migrations, a backup of the D1 database is exported to R2 using a Cloudflare Workflow.10

### **10.2 PDF Reports (Client-Side)**

Generating the monthly "Finance Report" PDF on the Edge is resource-constrained.

* **Strategy:** Client-Side Generation.  
* **Library:** @react-pdf/renderer or jspdf.  
* **Process:**  
  * Remix fetches the data JSON.  
  * The client browser renders a hidden React component (the report).  
  * react-pdf converts this component structure to a PDF Blob.  
  * The user is prompted to save the file Financial\_Report\_April\_2025.pdf.  
  * This ensures zero server load and perfect visual fidelity.

### **10.3 CI/CD Pipeline**

* **Platform:** GitHub Actions.  
* **Triggers:** Push to main.  
* **Steps:**  
  1. npm install  
  2. npm run typecheck (TypeScript validation).  
  3. npm run lint  
  4. npx wrangler deploy (Deploys Worker and Pages assets).

## ---

**11\. Conclusion**

This Technical PRD defines a robust, scalable, and highly specialized platform for personal finance management. By eschewing traditional server architectures in favor of Cloudflare's Edge, the Finance Hub achieves the speed and responsiveness required for a daily-use utility. The deep integration of AI for data entry and the sophisticated handling of Vietnamese financial instruments (floating loans, billing cycles) ensure that it meets the specific, unmet needs of its target user base. The resulting product will not only replace the "spreadsheet chaos" but provide proactive financial intelligence to safeguard the user's runway and peace of mind.

## ---

**12\. Detailed API & Schema Reference**

### **12.1 Transaction Object (JSON Representation)**

JSON

{  
  "id": "txn\_cl5...",  
  "date": "2025-04-25T00:00:00Z",  
  "amount": \-13600000,  
  "currency": "VND",  
  "description": "Payment to BIDV Card",  
  "category": {  
    "id": "cat\_01",  
    "name": "TT Tín dụng",  
    "color": "\#ef4444"  
  },  
  "account": {  
    "id": "acc\_02",  
    "name": "Techcombank Checking",  
    "type": "CHECKING"  
  },  
  "status": "CLEARED",  
  "metadata": {  
    "receipt\_scan\_id": "r\_9988",  
    "ai\_confidence": 0.98  
  }  
}

### **12.2 Loan Amortization Schedule (Table Representation)**

*Table depicting the output of the Amortization Engine based on Image 3\.*

| Month | Date | Principal (Open) | Interest Rate | Interest | Principal Paid | Total Payment | Principal (Close) |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| 1 | 12/2024 | 230,000,000 | 7.9% | 1,514,166 | 2,738,095 | 4,252,261 | 227,261,905 |
| 2 | 01/2025 | 227,261,905 | 7.9% | 1,496,141 | 2,738,095 | 4,234,236 | 224,523,810 |
| 3 | 02/2025 | 224,523,810 | 7.9% | 1,478,115 | 2,738,095 | 4,216,210 | 221,785,714 |
| ... | ... | ... | ... | ... | ... | ... | ... |
| 84 | ... | ... | ... | ... | ... | ... | 0 |

*(Note: Values are calculated based on the reducing balance formula confirmed in section 7.2)*

#### **Works cited**

1. Extract & Categorize Receipt Data with Google OCR, OpenRouter AI ..., accessed December 28, 2025, [https://n8n.io/workflows/4020-extract-and-categorize-receipt-data-with-google-ocr-openrouter-ai-and-telegram/](https://n8n.io/workflows/4020-extract-and-categorize-receipt-data-with-google-ocr-openrouter-ai-and-telegram/)  
2. Optical Character Recognition (OCR) and Source Code Detections, accessed December 28, 2025, [https://blog.cloudflare.com/dlp-ocr-sourcecode/](https://blog.cloudflare.com/dlp-ocr-sourcecode/)  
3. Transaction API \- SePay Dev, accessed December 28, 2025, [https://developer.sepay.vn/en/sepay-oauth2/giao-dich](https://developer.sepay.vn/en/sepay-oauth2/giao-dich)  
4. Getting started · Cloudflare D1 docs, accessed December 28, 2025, [https://developers.cloudflare.com/d1/get-started/](https://developers.cloudflare.com/d1/get-started/)  
5. Internationalization with Remix, accessed December 28, 2025, [https://remix.run/blog/remix-i18n](https://remix.run/blog/remix-i18n)  
6. Deploy on CloudFlare workers with a quick explanation about the ..., accessed December 28, 2025, [https://remix.guide/resources/7dRgMDv6ENFZ?limit=450](https://remix.guide/resources/7dRgMDv6ENFZ?limit=450)  
7. Tutorials · Cloudflare D1 docs, accessed December 28, 2025, [https://developers.cloudflare.com/d1/tutorials/](https://developers.cloudflare.com/d1/tutorials/)  
8. Building a Transcription App with Cloudflare Workers \- Medium, accessed December 28, 2025, [https://medium.com/@myownmusing/building-a-transcription-app-with-cloudflare-workers-fb7d85bb0e53](https://medium.com/@myownmusing/building-a-transcription-app-with-cloudflare-workers-fb7d85bb0e53)  
9. Llama 3.2 11B Vision Instruct model on Cloudflare Workers AI, accessed December 28, 2025, [https://developers.cloudflare.com/workers-ai/guides/tutorials/llama-vision-tutorial/](https://developers.cloudflare.com/workers-ai/guides/tutorials/llama-vision-tutorial/)  
10. Export and save D1 database \- Workflows \- Cloudflare Docs, accessed December 28, 2025, [https://developers.cloudflare.com/workflows/examples/backup-d1/](https://developers.cloudflare.com/workflows/examples/backup-d1/)  
11. Database Table Schema Overview | PDF | Loans \- Scribd, accessed December 28, 2025, [https://www.scribd.com/document/117011339/Database](https://www.scribd.com/document/117011339/Database)  
12. harshil1712/remix-d1-auth-template \- GitHub, accessed December 28, 2025, [https://github.com/harshil1712/remix-d1-auth-template](https://github.com/harshil1712/remix-d1-auth-template)  
13. Cloudflare D1 Adapter \- Auth.js, accessed December 28, 2025, [https://authjs.dev/getting-started/adapters/d1](https://authjs.dev/getting-started/adapters/d1)  
14. react-csv-importer \- NPM, accessed December 28, 2025, [https://www.npmjs.com/package/react-csv-importer](https://www.npmjs.com/package/react-csv-importer)  
15. CSV Importer \- Free React Nextjs Template \- shadcn.io, accessed December 28, 2025, [https://www.shadcn.io/template/sadmann7-csv-importer](https://www.shadcn.io/template/sadmann7-csv-importer)  
16. How to internationalize a Remix application (Part 1\) \- DEV Community, accessed December 28, 2025, [https://dev.to/adrai/how-to-internationalize-a-remix-application-2bep](https://dev.to/adrai/how-to-internationalize-a-remix-application-2bep)