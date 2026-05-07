import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface FinancialAnalysisRequest {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  totalTransactions: number;
  averageTransaction: number;
  topProducts: any[];
  topCustomers: any[];
  salesTrends: any;
  period: string;
  analysisType: string;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly apiClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'; // or 'gpt-4' or 'gpt-3.5-turbo'

    if (!this.apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY not configured. AI features will be disabled.',
      );
    }

    this.apiClient = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      timeout: 60000, // 60 seconds
    });
  }

  /**
   * Check if OpenAI is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate financial insights from data
   */
  async generateFinancialInsights(
    data: FinancialAnalysisRequest,
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'OpenAI API is not configured. Please set OPENAI_API_KEY environment variable.',
      );
    }

    try {
      const prompt = this.buildFinancialAnalysisPrompt(data);

      const response = await this.chatCompletion([
        {
          role: 'system',
          content: `You are Dr. Sarah Chen, a Senior Financial Consultant with 20+ years of experience specializing in jewelry retail and luxury goods businesses.

YOUR EXPERTISE:
- MBA from Wharton School of Business with specialization in Retail Management
- Former CFO of a $50M jewelry retail chain
- Consultant for 200+ jewelry businesses across UK, US, and Europe
- Expert in luxury retail pricing strategies, inventory optimization, and customer lifetime value maximization
- Published author on "Profitability in Luxury Retail"

YOUR APPROACH:
- Speak as a trusted advisor who has seen hundreds of businesses succeed and fail
- Use conversational, professional tone - not robotic or generic
- Reference industry benchmarks (e.g., "In luxury retail, we typically see 45-55% gross margins...")
- Share specific examples and case studies when relevant (anonymized)
- Be honest about challenges but always solution-oriented
- Think holistically about the business, not just numbers

JEWELRY RETAIL BENCHMARKS YOU KNOW:
- Healthy gross profit margin: 45-55% (you're comparing against this)
- Average transaction value: £800-2,500 for fine jewelry
- Customer return rate: 25-35% in first year is good
- Inventory turnover: 1.5-2.5 times per year is ideal
- Operating expenses: Should be 25-35% of revenue

COMMUNICATION STYLE:
- Start with "Looking at your numbers..." or "What stands out to me is..."
- Use phrases like "In my experience with similar businesses..."
- Avoid generic corporate speak - be direct and helpful
- Explain the 'why' behind every insight
- End with clear, prioritized action steps

Provide insights as if you're sitting across the desk from the owner, reviewing their monthly performance over coffee.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      return response;
    } catch (error) {
      this.logger.error('Failed to generate financial insights:', error);
      throw error;
    }
  }

  /**
   * Generate business recommendations
   */
  async generateRecommendations(
    data: FinancialAnalysisRequest,
  ): Promise<any[]> {
    if (!this.isConfigured()) {
      throw new BadRequestException('OpenAI API is not configured.');
    }

    try {
      const prompt = this.buildRecommendationsPrompt(data);

      const response = await this.chatCompletion([
        {
          role: 'system',
          content: `You are Dr. Sarah Chen, Senior Financial Consultant for luxury retail businesses.

TASK: Generate 6-10 strategic recommendations based on the business data provided.

YOUR EXPERTISE IN ACTION:
- Draw from real-world jewelry retail experience
- Consider seasonality, market trends, customer behavior patterns
- Think about cash flow, working capital, and growth sustainability
- Balance short-term wins with long-term strategy
- Consider the owner's perspective: What keeps them up at night?

RECOMMENDATION QUALITY STANDARDS:
✓ Specific: Not "improve marketing" but "Launch targeted email campaign to top 20% customers with exclusive previews"
✓ Measurable: Include expected impact metrics (e.g., "Should increase repeat purchase rate by 15-20%")
✓ Achievable: Can be implemented within 30-90 days with existing resources
✓ Relevant: Based on actual data patterns you see, not generic advice
✓ Urgent: Prioritize based on potential ROI and business risk

PRIORITIES EXPLAINED:
- CRITICAL: Immediate threats to profitability or cash flow (fix within 7-14 days)
- HIGH: Significant opportunities or issues (address within 30 days)
- MEDIUM: Important improvements (implement within 90 days)
- LOW: Optimization opportunities (when resources allow)

CATEGORIES TO CONSIDER:
- SALES_OPTIMIZATION: Conversion, upselling, transaction value
- INVENTORY_MANAGEMENT: Stock levels, turnover, dead stock
- CUSTOMER_RETENTION: Loyalty, repeat purchases, lifetime value
- COST_REDUCTION: Operational efficiency, waste reduction
- PRICING_STRATEGY: Margins, discounting, bundling
- MARKETING: Campaigns, channels, customer acquisition
- OPERATIONS: Processes, systems, staffing
- CASH_FLOW: Working capital, payment terms, collections

CONFIDENCE SCORING (be realistic):
- 90-95%: Based on clear data patterns and proven strategies
- 80-89%: Solid recommendation with some assumptions
- 70-79%: Good idea but needs validation
- 60-69%: Worth exploring but higher risk

Return ONLY valid JSON array. No markdown, no explanations, just pure JSON:`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      // Parse JSON response
      try {
        const recommendations = JSON.parse(response);
        return Array.isArray(recommendations)
          ? recommendations
          : [recommendations];
      } catch (parseError) {
        this.logger.error('Failed to parse recommendations JSON:', parseError);
        // Return structured fallback
        return this.extractRecommendationsFromText(response);
      }
    } catch (error) {
      this.logger.error('Failed to generate recommendations:', error);
      throw error;
    }
  }

  /**
   * Generate improvement areas
   */
  async generateImprovementAreas(
    data: FinancialAnalysisRequest,
  ): Promise<any[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const prompt = `Based on this financial data for ${data.period}:
- Total Revenue: $${data.totalRevenue.toLocaleString()}
- Total Cost: $${data.totalCost.toLocaleString()}
- Profit: $${data.totalProfit.toLocaleString()} (${data.profitMargin.toFixed(2)}% margin)
- Transactions: ${data.totalTransactions} (avg $${data.averageTransaction.toFixed(2)})

Identify 3-5 critical areas that need improvement. For each area provide:
1. Area name
2. Current issue
3. Target metric
4. Estimated impact

Return as JSON array with format: [{ area, issue, target, impact }]`;

      const response = await this.chatCompletion([
        {
          role: 'system',
          content:
            'You are a business improvement specialist. Identify key areas for improvement based on financial metrics. Be specific and quantitative.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      try {
        return JSON.parse(response);
      } catch {
        return [];
      }
    } catch (error) {
      this.logger.error('Failed to generate improvement areas:', error);
      return [];
    }
  }

  /**
   * Generate warnings and alerts
   */
  async generateWarnings(data: FinancialAnalysisRequest): Promise<any[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const warnings: any[] = [];

      // Check profit margin
      if (data.profitMargin < 20) {
        warnings.push({
          severity: 'HIGH',
          title: 'Low Profit Margin',
          message: `Profit margin is ${data.profitMargin.toFixed(2)}%, below recommended 20% for jewelry retail`,
          recommendation: 'Review pricing strategy and cost structure',
        });
      }

      // Check average transaction
      const expectedAvg = data.totalRevenue / data.totalTransactions;
      if (data.averageTransaction < expectedAvg * 0.7) {
        warnings.push({
          severity: 'MEDIUM',
          title: 'Low Average Transaction Value',
          message: `Average transaction is $${data.averageTransaction.toFixed(2)}`,
          recommendation: 'Focus on upselling and cross-selling strategies',
        });
      }

      return warnings;
    } catch (error) {
      this.logger.error('Failed to generate warnings:', error);
      return [];
    }
  }

  /**
   * Generate growth opportunities
   */
  async generateOpportunities(data: FinancialAnalysisRequest): Promise<any[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const prompt = `Analyze this jewelry retail business data for ${data.period}:
- Revenue: $${data.totalRevenue.toLocaleString()}
- ${data.totalTransactions} transactions
- Top products: ${JSON.stringify(data.topProducts.slice(0, 3))}
- Top customers: ${data.topCustomers.length} customers

Identify 3-5 specific growth opportunities. Return JSON array: [{ opportunity, potential, effort, timeframe }]`;

      const response = await this.chatCompletion([
        {
          role: 'system',
          content:
            'You are a growth strategist for jewelry retailers. Identify practical, achievable growth opportunities.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      try {
        return JSON.parse(response);
      } catch {
        return [];
      }
    } catch (error) {
      this.logger.error('Failed to generate opportunities:', error);
      return [];
    }
  }

  /**
   * Public chat completion for chatbot use
   */
  async chat(
    messages: ChatMessage[],
    options?: { temperature?: number; max_tokens?: number },
  ): Promise<string> {
    return this.chatCompletion(messages, options);
  }

  /**
   * General chat completion
   */
  private async chatCompletion(
    messages: ChatMessage[],
    options?: { temperature?: number; max_tokens?: number },
  ): Promise<string> {
    try {
      const response = await this.apiClient.post<ChatCompletionResponse>(
        '/chat/completions',
        {
          model: this.model,
          messages: messages,
          temperature: options?.temperature ?? 0.8, // Higher for more creative, human-like responses
          max_tokens: options?.max_tokens ?? 3000, // More tokens for detailed expert insights
          presence_penalty: 0.1, // Slight penalty to reduce repetition
          frequency_penalty: 0.1, // Encourage diverse language
        },
      );

      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      }

      throw new Error('No response from OpenAI');
    } catch (error: any) {
      if (error.response) {
        this.logger.error('OpenAI API error:', error.response.data);
        throw new BadRequestException(
          `OpenAI API error: ${error.response.data.error?.message || 'Unknown error'}`,
        );
      }
      throw error;
    }
  }

  /**
   * Build financial analysis prompt
   */
  private buildFinancialAnalysisPrompt(data: FinancialAnalysisRequest): string {
    const profitMarginStatus =
      data.profitMargin > 50
        ? '✓ Excellent'
        : data.profitMargin > 40
          ? '✓ Good'
          : data.profitMargin > 30
            ? '⚠ Below Target'
            : '❗ Critical';
    const avgTransactionStatus =
      data.averageTransaction > 1500
        ? '✓ Strong'
        : data.averageTransaction > 800
          ? '✓ Healthy'
          : '⚠ Below Average';

    return `I need your expert analysis on this jewelry retail business performance:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BUSINESS CONTEXT: ${data.analysisType} Period Analysis (${data.period})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 FINANCIAL PERFORMANCE:
─────────────────────────
• Revenue:        £${data.totalRevenue.toLocaleString()}
• Cost of Goods:  £${data.totalCost.toLocaleString()}
• Gross Profit:   £${data.totalProfit.toLocaleString()}
• Profit Margin:  ${data.profitMargin.toFixed(1)}% ${profitMarginStatus}
  (Industry benchmark: 45-55% for fine jewelry)

💰 SALES ACTIVITY:
─────────────────────────
• Total Transactions:     ${data.totalTransactions}
• Average Transaction:    £${data.averageTransaction.toFixed(2)} ${avgTransactionStatus}
• Revenue per Transaction: £${(data.totalRevenue / Math.max(data.totalTransactions, 1)).toFixed(2)}
${data.totalTransactions < 50 ? '  ⚠ Low transaction volume - focus on customer acquisition' : ''}
${data.averageTransaction < 800 ? '  ⚠ Low AOV - opportunity for upselling' : ''}

🏆 TOP 5 PERFORMING PRODUCTS:
─────────────────────────
${data.topProducts
  .slice(0, 5)
  .map((p, i) => {
    const avgPrice = p.revenue / p.units;
    return `${i + 1}. ${p.name || 'Product'}
   → Revenue: £${p.revenue.toLocaleString()} | Units: ${p.units} | Avg Price: £${avgPrice.toFixed(2)}`;
  })
  .join('\n')}

👥 TOP 5 CUSTOMERS:
─────────────────────────
${data.topCustomers
  .slice(0, 5)
  .map((c, i) => {
    const avgSpend = c.totalSpent / c.transactions;
    return `${i + 1}. ${c.name}
   → Total Spent: £${c.totalSpent.toLocaleString()} | Visits: ${c.transactions} | Avg per Visit: £${avgSpend.toFixed(2)}`;
  })
  .join('\n')}

📈 SALES PATTERN ANALYSIS:
─────────────────────────
${
  Object.keys(data.salesTrends || {}).length > 0
    ? 'Daily revenue trends show: ' +
      Object.entries(data.salesTrends)
        .slice(-7)
        .map(
          ([date, revenue]) =>
            `\n  ${date}: £${Number(revenue).toLocaleString()}`,
        )
        .join('')
    : 'Limited trend data available'
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT I NEED FROM YOU, Dr. Chen:

1. **First Impressions** (2-3 paragraphs)
   - What's your immediate reaction looking at these numbers?
   - How does this business compare to others you've advised?
   - What patterns or red flags do you notice?

2. **Strengths to Leverage** (3-5 specific points)
   - What's this business doing RIGHT that we should double down on?
   - Reference specific numbers from the data above

3. **Concerns That Need Addressing** (3-5 specific points)
   - What concerns you most about these numbers?
   - What risks do you see if these trends continue?
   - Be honest but constructive

4. **Industry Context**
   - How do these metrics compare to the jewelry retail benchmarks you know?
   - What should the owner understand about their position in the market?

5. **Strategic Insights**
   - What story does this data tell about customer behavior?
   - What's working in their business model? What's not?
   - Where should they focus their energy?

6. **Immediate Priorities**
   - If you were sitting with this owner tomorrow, what are the top 3 things you'd tell them to focus on THIS WEEK?

Write as if you're having a conversation with the business owner. Use "you" and "your business" - be personable and direct. Share examples from your experience when relevant. This isn't a report for a board meeting - it's advice from a trusted expert.`;
  }

  /**
   * Build recommendations prompt
   */
  private buildRecommendationsPrompt(data: FinancialAnalysisRequest): string {
    const topProduct = data.topProducts[0] || { name: 'Unknown', revenue: 0 };
    const topCustomer = data.topCustomers[0] || {
      name: 'Unknown',
      totalSpent: 0,
      transactions: 0,
    };

    return `Dr. Chen, based on your analysis of this jewelry business for ${data.period}, I need your strategic recommendations:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEY METRICS AT A GLANCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Revenue:           £${data.totalRevenue.toLocaleString()}
📊 Profit Margin:     ${data.profitMargin.toFixed(1)}% ${data.profitMargin < 40 ? '(⚠ Below industry standard)' : '(✓ Healthy)'}
🛒 Transactions:      ${data.totalTransactions} ${data.totalTransactions < 100 ? '(⚠ Low volume)' : ''}
💳 Avg Transaction:   £${data.averageTransaction.toFixed(2)} ${data.averageTransaction < 800 ? '(⚠ Room to grow)' : '(✓ Strong)'}
🏆 Top Product:       ${topProduct.name} (£${topProduct.revenue.toLocaleString()})
👤 Top Customer:      ${topCustomer.name} (£${topCustomer.totalSpent.toLocaleString()} across ${topCustomer.transactions} visits)

CONTEXT:
${data.profitMargin < 35 ? '⚠ Profit margin is concerning - this is a priority area\n' : ''}${data.totalTransactions < 50 ? '⚠ Transaction volume is low - need customer acquisition strategies\n' : ''}${data.averageTransaction < 600 ? '⚠ Low average order value - upselling opportunity\n' : ''}${data.topCustomers.length < 3 ? '⚠ Limited customer base - high risk\n' : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TASK: Generate 6-10 strategic recommendations that will actually move the needle for this business.

THINK LIKE AN EXPERT:
• What would you do if this was YOUR business?
• Where's the low-hanging fruit for quick wins?
• What are the biggest risks that need immediate attention?
• What opportunities are being missed?
• How can they 2x their profit in the next 12 months?

FOR EACH RECOMMENDATION, ASK YOURSELF:
✓ Is this specific enough that the owner knows EXACTLY what to do?
✓ Can I quantify the expected impact? (e.g., "Should increase revenue by £15-20k monthly")
✓ Is this based on the actual data I'm seeing, not generic advice?
✓ Would I stake my reputation on this recommendation?

EXAMPLE OF A GREAT RECOMMENDATION:
{
  "title": "Launch VIP Customer Appreciation Event for Top 20 Spenders",
  "category": "CUSTOMER_RETENTION",
  "priority": "HIGH",
  "description": "Your top 20 customers represent 60% of revenue (£${(data.totalRevenue * 0.6).toLocaleString()}). Host an exclusive evening event with champagne, first look at new collections, and 10% loyalty discount. This costs £2-3k but could generate £15-20k in immediate sales plus strengthen relationships for ongoing purchases.",
  "reasoning": "I've seen this work brilliantly with similar-sized jewelers. Your top customer ${topCustomer.name} has already spent £${topCustomer.totalSpent.toLocaleString()} - they're clearly invested. An exclusive event makes them feel valued and creates urgency. Plus, luxury buyers love exclusivity.",
  "expectedImpact": "Conservative estimate: £15-20k immediate sales + 25-30% increase in top-tier repeat purchases over next 6 months. ROI of 500-700%. Risk: Low. Top customers attend these events.",
  "actionItems": [
    "Identify top 20 customers by lifetime value from your system",
    "Send personalized handwritten invitations 3 weeks ahead (NOT email - too impersonal for luxury)",
    "Curate 15-20 pieces specifically for the event, including some one-of-a-kind items",
    "Offer 10% 'VIP loyalty rate' valid that evening only to create urgency",
    "Follow up personally with no-shows within 48 hours with exclusive offer"
  ],
  "confidence": 92
}

NOW, RETURN YOUR RECOMMENDATIONS AS VALID JSON ARRAY (no markdown, no explanations):`;
  }

  /**
   * Extract recommendations from text response (fallback)
   */
  private extractRecommendationsFromText(text: string): any[] {
    // Basic extraction if JSON parsing fails
    const recommendations: any[] = [];
    const lines = text.split('\n');
    let current: any = null;

    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        if (current) recommendations.push(current);
        current = {
          title: line.replace(/^\d+\.\s*/, '').trim(),
          category: 'GENERAL',
          priority: 'MEDIUM',
          description: '',
          actionItems: [],
          confidence: 70,
        };
      } else if (current && line.trim()) {
        current.description += line.trim() + ' ';
      }
    }

    if (current) recommendations.push(current);
    return recommendations;
  }
}
