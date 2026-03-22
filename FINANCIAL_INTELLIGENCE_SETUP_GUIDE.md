# Financials - Setup & Usage Guide

## Overview
The Financials system is an AI-powered analytics platform that provides:
- Automated financial analysis (daily, weekly, monthly, quarterly, yearly)
- AI-generated insights and recommendations using ChatGPT
- Sales trends and performance metrics
- Customer and product analysis
- Actionable business improvement suggestions

---

## ✅ Implementation Complete

### What's Been Built:

#### 1. **Database Schema** ✓
- `financial_analyses` - Stores all financial analysis reports
- `ai_recommendations` - AI-generated business recommendations
- `financial_reports` - Generated PDF/Excel reports
- 5 new enums for categorization and priority management

#### 2. **Backend Services** ✓
- OpenAI Integration Service - ChatGPT API integration
- Financial Intelligence Service - Data aggregation and analysis
- REST API Endpoints - 6 endpoints for full CRUD operations
- Caching - 1-hour cache for dashboard performance

#### 3. **Frontend Components** ✓
- Financials Dashboard Page
- Generate Analysis Dialog with date picker
- Recommendation cards with priority indicators
- Metrics cards showing revenue, profit, margin, transactions
- Top products and customers display
- Sidebar menu integration

---

## 🚀 Setup Instructions

### Step 1: Get OpenAI API Key

1. Go to: https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy your API key (starts with `sk-...`)
5. Keep it secure - you won't be able to see it again!

**Cost Estimate:**
- Each analysis costs approximately $0.10 - $0.50 depending on data volume
- GPT-4 pricing: $0.03/1K input tokens, $0.06/1K output tokens
- Monthly usage for daily analyses: ~$15-30/month

### Step 2: Configure Environment Variables

Open `backend/.env` and add your OpenAI API key:

```env
# OpenAI / ChatGPT Integration (Financial Intelligence)
OPENAI_API_KEY="sk-your-actual-api-key-here"
OPENAI_MODEL="gpt-4"
OPENAI_MAX_TOKENS="2000"
```

**Models Available:**
- `gpt-4` (recommended) - Most accurate, best insights
- `gpt-4-turbo` - Faster, cheaper, still excellent
- `gpt-3.5-turbo` - Fastest, cheapest, good for testing

### Step 3: Verify Database Migration

The database migrations have been applied. To verify:

```bash
cd backend
npx prisma migrate status
```

You should see: "Database schema is up to date!"

If you see pending migrations, run:
```bash
npx prisma migrate deploy
```

### Step 4: Restart Backend Server

```bash
cd backend
npm run start:dev
```

The server should start and connect to the database successfully.

### Step 5: Access the Dashboard

1. Start the frontend: `npm run dev`
2. Log in to your account
3. Navigate to: **Sales & Transactions > Financials**
4. Or go directly to: `http://localhost:3000/financial-intelligence`

---

## 📊 How to Use

### Viewing the Dashboard

The dashboard shows:

**Metrics Cards:**
- Revenue (current vs previous period)
- Profit (current vs previous period)
- Profit Margin percentage
- Transaction count
- Trend indicators (↑ green for increase, ↓ red for decrease)

**AI Recommendations:**
- Priority-coded suggestions (🔴 Critical, 🟡 High, 🟢 Medium, ⚪ Low)
- Category badges (Sales, Inventory, Customer Retention, etc.)
- Expected impact descriptions
- Confidence scores (0-100%)

**Top Performers:**
- Top 5 products by revenue
- Top 5 customers by total spent

### Generating a New Analysis

1. Click **"Generate Analysis"** button (top right)
2. Select analysis type:
   - **Daily** - Last 24 hours
   - **Weekly** - Last 7 days
   - **Monthly** - Last 30 days (default)
   - **Quarterly** - Last 90 days
   - **Yearly** - Last 365 days
   - **Custom** - Choose specific date range

3. Pick start and end dates
4. Toggle **"Use AI Insights"** (ON for ChatGPT recommendations)
5. Click **"Generate"**
6. Wait 30-60 seconds for AI processing
7. View results on dashboard

### Working with Recommendations

When you click on a recommendation:

**You'll See:**
- Full description
- Why it matters (reasoning)
- Expected impact
- Action items (step-by-step)
- Confidence score

**You Can:**
- **Mark as Implemented** - You've completed the recommendation
- **Set In Progress** - You're working on it
- **Dismiss** - Not relevant or not feasible
- **Add Notes** - Document your progress

---

## 🎯 Features Breakdown

### AI-Generated Insights Include:

1. **Sales Optimization**
   - Best-selling product patterns
   - Peak sales times
   - Seasonal trends
   - Revenue opportunities

2. **Inventory Management**
   - Stock level recommendations
   - Slow-moving items
   - Reorder suggestions
   - Dead stock alerts

3. **Customer Retention**
   - Customer purchase patterns
   - VIP customer identification
   - Churn risk analysis
   - Loyalty program ideas

4. **Cost Reduction**
   - Margin improvement ideas
   - Waste reduction
   - Supplier optimization

5. **Pricing Strategy**
   - Price point analysis
   - Discount effectiveness
   - Bundle opportunities

6. **Marketing**
   - Customer segment targeting
   - Campaign timing
   - Product promotion ideas

7. **Operations**
   - Process improvements
   - Efficiency gains
   - Workflow optimization

8. **Cash Flow**
   - Revenue forecasting
   - Payment terms optimization
   - Working capital management

### Analysis Metrics:

- **Total Revenue** - Sum of all sales
- **Total Cost** - Cost of goods sold
- **Total Profit** - Revenue - Cost
- **Profit Margin** - (Profit / Revenue) × 100
- **Total Transactions** - Number of sales
- **Average Transaction** - Revenue / Transactions
- **Sales Trends** - Daily/weekly/monthly patterns
- **Top Products** - Best performers
- **Top Customers** - Highest value customers

---

## 🔐 Permissions

To access Financials, users need the `financial_intelligence` permission.

**To grant access:**
1. Go to Settings > User Management
2. Select user
3. Enable "Financials" permission
4. Save

**Default Access:**
- OWNER role - ✅ Full access
- ADMIN role - ✅ Full access (if granted)
- CASHIER role - ❌ No access (unless granted)

---

## 📱 API Endpoints

All endpoints are available at `/financial-intelligence`:

### 1. Generate Analysis
```
POST /financial-intelligence/analyses
Body: {
  "analysisType": "MONTHLY",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "useAI": true
}
```

### 2. Get Dashboard Summary
```
GET /financial-intelligence/dashboard
Returns: Current period metrics, comparisons, top performers, recommendations
```

### 3. List Analyses
```
GET /financial-intelligence/analyses?analysisType=MONTHLY&limit=10
```

### 4. Get Specific Analysis
```
GET /financial-intelligence/analyses/:id
```

### 5. Get Recommendations
```
GET /financial-intelligence/recommendations?status=PENDING&priority=HIGH
```

### 6. Update Recommendation
```
PATCH /financial-intelligence/recommendations/:id
Body: {
  "status": "IMPLEMENTED",
  "notes": "Completed on 2025-01-10"
}
```

---

## 🐛 Troubleshooting

### "Failed to load dashboard"
- **Check:** Backend server is running
- **Check:** Database connection is working
- **Solution:** Restart backend server

### "Failed to generate analysis"
- **Check:** OpenAI API key is configured in `.env`
- **Check:** API key is valid (not expired)
- **Check:** You have credits in your OpenAI account
- **Solution:** Verify API key at https://platform.openai.com/api-keys

### "No recommendations available"
- **Reason:** You haven't generated an AI-powered analysis yet
- **Solution:** Click "Generate Analysis" with "Use AI Insights" enabled

### Analysis takes too long (>2 minutes)
- **Reason:** OpenAI API might be slow or rate-limited
- **Check:** OpenAI API status at https://status.openai.com
- **Solution:** Try again in a few minutes

### "Insufficient data for analysis"
- **Reason:** Not enough sales data in selected period
- **Solution:** Choose a longer date range or add more sales data

### Recommendations seem generic
- **Reason:** Limited sales data or patterns
- **Solution:** Run analysis on periods with more transaction data
- **Improvement:** Add more detailed product/customer information

---

## 💡 Best Practices

### When to Generate Analyses:

1. **Daily Analysis** - For high-volume stores (100+ daily transactions)
2. **Weekly Analysis** - For medium-volume stores (50-100 daily transactions)
3. **Monthly Analysis** - Standard for most businesses (recommended)
4. **Quarterly Analysis** - For strategic planning
5. **Yearly Analysis** - For annual reviews and planning

### Recommendation Workflow:

1. **Review** - Check all pending recommendations daily/weekly
2. **Prioritize** - Focus on CRITICAL and HIGH priority first
3. **Implement** - Act on recommendations with highest expected impact
4. **Track** - Mark status and add notes on progress
5. **Measure** - Generate new analysis to see impact

### Data Quality Tips:

- **Complete Sales Data** - Ensure all products have accurate cost prices
- **Customer Records** - Link sales to customers for better analysis
- **Consistent Categories** - Use proper product categorization
- **Regular Updates** - Keep inventory and pricing current

---

## 🎓 Example Use Cases

### Use Case 1: Monthly Business Review
```
1. Generate monthly analysis (1st of each month)
2. Review revenue/profit trends vs previous month
3. Check top products and customers
4. Read AI recommendations
5. Create action plan from insights
6. Implement highest priority items
7. Track progress with notes
```

### Use Case 2: Seasonal Planning
```
1. Generate quarterly analysis
2. Identify seasonal trends
3. Review inventory recommendations
4. Plan promotions based on AI suggestions
5. Adjust pricing strategy
6. Mark implemented recommendations
```

### Use Case 3: Quick Health Check
```
1. Open dashboard (auto-loads current month)
2. Check profit margin trend
3. Review any critical alerts
4. Address urgent recommendations
```

---

## 📈 Success Metrics

Track these to measure Financials impact:

- **Revenue Growth** - % increase month-over-month
- **Profit Margin Improvement** - Percentage point increase
- **Transaction Value** - Average transaction increase
- **Recommendations Implemented** - Number completed
- **ROI** - Revenue increase vs AI service cost

---

## 🚦 Next Steps

Now that Financials is set up:

1. ✅ **Get OpenAI API Key** - From platform.openai.com
2. ✅ **Configure `.env`** - Add API key to backend/.env
3. ✅ **Restart Backend** - `npm run start:dev`
4. ✅ **Access Dashboard** - Navigate to Financials
5. ✅ **Generate First Analysis** - Click "Generate Analysis"
6. ✅ **Review Insights** - Read AI recommendations
7. ✅ **Take Action** - Implement suggestions
8. ✅ **Track Progress** - Update recommendation statuses

---

## 💰 Cost Management

### Reducing OpenAI Costs:

1. **Use GPT-3.5-turbo** for testing - Much cheaper
2. **Disable AI for routine checks** - Toggle off "Use AI Insights"
3. **Batch analyses** - Generate weekly instead of daily
4. **Set limits** - Monitor OpenAI usage dashboard

### Free Alternatives (Future Enhancement):
- Use analysis WITHOUT AI (just metrics)
- Export data to Google Sheets for manual analysis
- Basic trend detection without AI insights

---

## 📞 Support

If you encounter issues:

1. Check this guide first
2. Review error messages in browser console
3. Check backend logs for API errors
4. Verify OpenAI API key and credits
5. Contact development team with:
   - Error message
   - Steps to reproduce
   - Screenshot of issue

---

## 🎉 You're Ready!

The Financials system is fully implemented and ready to use. Start generating insights and growing your business with AI-powered recommendations!

**Quick Start:** Navigate to Financials in the sidebar and click "Generate Analysis" to get your first report!
