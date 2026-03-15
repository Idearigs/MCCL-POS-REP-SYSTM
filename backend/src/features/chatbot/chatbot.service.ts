import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OpenAIService } from '../../integrations/openai/openai.service';
import { QuickActionType, ChatMessage, ChatResponse } from './dto/chatbot.dto';
import { generateId } from '../../shared/utils/id-generator';
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
  subWeeks,
  parseISO
} from 'date-fns';

@Injectable()
export class ChatbotService {
  private conversationHistory = new Map<string, ChatMessage[]>();

  constructor(
    private prisma: PrismaService,
    private openAIService: OpenAIService,
  ) {}

  /**
   * Process user message and generate AI response
   */
  async sendMessage(
    userId: string,
    tenantId: string,
    message: string,
    conversationId?: string,
  ): Promise<ChatResponse> {
    // Create or get conversation ID
    const convId = conversationId || generateId();

    // Get conversation history
    const history = this.conversationHistory.get(convId) || [];

    // Add user message to history
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      conversationId: convId,
    };

    history.push(userMessage);

    // Detect if user is asking for data
    const context = await this.gatherContext(tenantId, message);

    // Generate AI response using OpenAI
    const aiResponse = await this.generateAIResponse(message, history, context);

    // Create assistant message
    const assistantMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(),
      conversationId: convId,
    };

    history.push(assistantMessage);

    // Store updated history (keep last 20 messages)
    this.conversationHistory.set(
      convId,
      history.slice(-20),
    );

    // Generate suggestions based on context
    const suggestions = this.generateSuggestions(message, context);

    // Determine if response includes a report
    const hasReport = !!(context.salesReport || context.todaySales);
    const reportType = context.reportPeriod ? 'Sales' : 'Today_Sales';

    return {
      message: assistantMessage,
      conversationId: convId,
      suggestions,
      hasReport,
      reportData: hasReport ? context : undefined,
      reportType: hasReport ? reportType : undefined,
      reportPeriod: context.reportPeriod || undefined,
    };
  }

  /**
   * Handle quick action requests
   */
  async handleQuickAction(
    tenantId: string,
    action: QuickActionType,
    parameters?: Record<string, any>,
  ): Promise<any> {
    switch (action) {
      case QuickActionType.TODAY_SALES:
        return this.getTodaySales(tenantId);

      case QuickActionType.STOCK_LEVELS:
        return this.getStockLevels(tenantId);

      case QuickActionType.SHIFT_SUMMARY:
        return this.getShiftSummary(tenantId, parameters?.userId);

      case QuickActionType.LOW_STOCK:
        return this.getLowStock(tenantId);

      case QuickActionType.TOP_PRODUCTS:
        return this.getTopProducts(tenantId);

      case QuickActionType.RECENT_CUSTOMERS:
        return this.getRecentCustomers(tenantId);

      default:
        throw new Error('Unknown quick action');
    }
  }

  /**
   * Parse natural language dates
   */
  private parseDateRange(message: string): { startDate: Date; endDate: Date; period: string } | null {
    const lowerMessage = message.toLowerCase();
    const now = new Date();

    // This month
    if (lowerMessage.includes('this month') || lowerMessage.includes('current month')) {
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
        period: 'This Month'
      };
    }

    // Last month
    if (lowerMessage.includes('last month') || lowerMessage.includes('previous month')) {
      const lastMonth = subMonths(now, 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
        period: 'Last Month'
      };
    }

    // This week
    if (lowerMessage.includes('this week') || lowerMessage.includes('current week')) {
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }),
        endDate: endOfWeek(now, { weekStartsOn: 1 }),
        period: 'This Week'
      };
    }

    // Last week
    if (lowerMessage.includes('last week') || lowerMessage.includes('previous week')) {
      const lastWeek = subWeeks(now, 1);
      return {
        startDate: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        endDate: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        period: 'Last Week'
      };
    }

    // Yesterday
    if (lowerMessage.includes('yesterday')) {
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
        period: 'Yesterday'
      };
    }

    // Today
    if (lowerMessage.includes('today')) {
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
        period: 'Today'
      };
    }

    // Last 7 days
    if (lowerMessage.includes('last 7 days') || lowerMessage.includes('past week')) {
      return {
        startDate: startOfDay(subDays(now, 7)),
        endDate: endOfDay(now),
        period: 'Last 7 Days'
      };
    }

    // Last 30 days
    if (lowerMessage.includes('last 30 days') || lowerMessage.includes('past month')) {
      return {
        startDate: startOfDay(subDays(now, 30)),
        endDate: endOfDay(now),
        period: 'Last 30 Days'
      };
    }

    return null;
  }

  /**
   * Get sales data for any date range
   */
  private async getSalesReport(tenantId: string, startDate: Date, endDate: Date) {
    const sales = await this.prisma.sales.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
      include: {
        sale_items: {
          include: {
            products: {
              select: {
                name: true,
                sku: true,
              }
            }
          }
        },
      },
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const totalCost = sales.reduce((sum, sale) => {
      return sum + sale.sale_items.reduce((itemSum, item) => {
        return itemSum + (Number(item.unitPrice) * item.quantity);
      }, 0);
    }, 0);
    const totalProfit = totalRevenue - totalCost;
    const totalInvoices = sales.length;

    const cashPayments = sales
      .filter(s => s.paymentMethod === 'CASH')
      .reduce((sum, sale) => sum + Number(sale.totalAmount), 0);

    const cardPayments = sales
      .filter(s => s.paymentMethod === 'CARD')
      .reduce((sum, sale) => sum + Number(sale.totalAmount), 0);

    const cardTransactions = sales.filter(s => s.paymentMethod === 'CARD').length;
    const cashTransactions = sales.filter(s => s.paymentMethod === 'CASH').length;

    // Calculate product sales
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    sales.forEach(sale => {
      sale.sale_items.forEach(item => {
        const existing = productSales.get(item.productId) || {
          name: item.products?.name || 'Unknown',
          quantity: 0,
          revenue: 0
        };
        productSales.set(item.productId, {
          name: existing.name,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + (Number(item.unitPrice) * item.quantity),
        });
      });
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const bestSeller = topProducts[0];
    const averageTransaction = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      totalInvoices,
      cashPayments,
      cardPayments,
      cardTransactions,
      cashTransactions,
      averageTransaction,
      bestSeller: bestSeller?.name || 'N/A',
      topProducts,
      salesData: sales.map(s => ({
        saleNumber: s.saleNumber,
        date: s.createdAt,
        amount: Number(s.totalAmount),
        paymentMethod: s.paymentMethod,
        items: s.sale_items.map(item => ({
          product: item.products?.name || 'Unknown',
          quantity: item.quantity,
          price: Number(item.unitPrice),
        }))
      }))
    };
  }

  /**
   * Get today's sales summary
   */
  private async getTodaySales(tenantId: string) {
    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);

    const sales = await this.prisma.sales.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
      include: {
        sale_items: true,
      },
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const totalInvoices = sales.length;
    const cashPayments = sales
      .filter(s => s.paymentMethod === 'CASH')
      .reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const cardTransactions = sales.filter(s => s.paymentMethod === 'CARD').length;

    // Find best seller
    const productSales = new Map<string, { name: string; quantity: number }>();
    sales.forEach(sale => {
      sale.sale_items.forEach(item => {
        const existing = productSales.get(item.productId) || { name: '', quantity: 0 };
        productSales.set(item.productId, {
          name: existing.name,
          quantity: existing.quantity + item.quantity,
        });
      });
    });

    const bestSeller = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)[0];

    return {
      totalRevenue,
      totalInvoices,
      cashPayments,
      cardTransactions,
      bestSeller: bestSeller?.name || 'N/A',
    };
  }

  /**
   * Get stock levels
   */
  private async getStockLevels(tenantId: string) {
    const products = await this.prisma.products.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        name: true,
        sku: true,
        stockQuantity: true,
        minStockLevel: true,
      },
      orderBy: {
        stockQuantity: 'asc',
      },
      take: 10,
    });

    const totalProducts = await this.prisma.products.count({
      where: { tenantId, isActive: true },
    });

    const lowStockCount = products.filter(
      p => p.stockQuantity <= (p.minStockLevel || 0),
    ).length;

    return {
      totalProducts,
      lowStockCount,
      lowestStock: products,
    };
  }

  /**
   * Get shift summary
   */
  private async getShiftSummary(tenantId: string, userId?: string) {
    const today = startOfDay(new Date());

    const shift = await this.prisma.shifts.findFirst({
      where: {
        tenantId,
        ...(userId && { userId }),
        startTime: {
          gte: today,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        sales: {
          where: {
            status: 'COMPLETED',
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    if (!shift) {
      return { message: 'No active shift found for today' };
    }

    const totalSales = shift.sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);

    return {
      shiftNumber: shift.shiftNumber,
      cashier: `${shift.user.firstName} ${shift.user.lastName}`,
      startTime: shift.startTime,
      openingFloat: Number(shift.openingFloat),
      totalSales,
      transactionCount: shift.sales.length,
      status: shift.status,
    };
  }

  /**
   * Get low stock products
   */
  private async getLowStock(tenantId: string) {
    // Get all active products and filter in application
    const allProducts = await this.prisma.products.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        name: true,
        sku: true,
        stockQuantity: true,
        minStockLevel: true,
      },
    });

    // Filter products where stock is at or below minimum stock level
    const lowStockProducts = allProducts
      .filter(p => p.stockQuantity <= (p.minStockLevel || 0))
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, 20);

    return {
      count: lowStockProducts.length,
      products: lowStockProducts,
    };
  }

  /**
   * Get top selling products
   */
  private async getTopProducts(tenantId: string) {
    const last7Days = subDays(new Date(), 7);

    const topProducts = await this.prisma.sale_items.groupBy({
      by: ['productId'],
      where: {
        sales: {
          tenantId,
          createdAt: {
            gte: last7Days,
          },
          status: 'COMPLETED',
        },
      },
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    });

    // Get product details
    const productIds = topProducts.map(p => p.productId);
    const products = await this.prisma.products.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        sellingPrice: true,
      },
    });

    const productMap = new Map(products.map(p => [p.id, p]));

    return topProducts.map(tp => ({
      product: productMap.get(tp.productId),
      quantitySold: tp._sum.quantity,
      transactionCount: tp._count.id,
    }));
  }

  /**
   * Get recent customers
   */
  private async getRecentCustomers(tenantId: string) {
    const recentCustomers = await this.prisma.customers.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });

    return recentCustomers;
  }

  /**
   * Gather context based on user message
   */
  private async gatherContext(tenantId: string, message: string): Promise<any> {
    const lowerMessage = message.toLowerCase();
    const context: any = {};

    // First, check if user is asking for a specific time period
    const dateRange = this.parseDateRange(message);

    // Check what data might be needed based on keywords
    if (lowerMessage.includes('sales') || lowerMessage.includes('revenue') || lowerMessage.includes('report')) {
      if (dateRange) {
        // Use comprehensive sales report for the requested period
        context.salesReport = await this.getSalesReport(tenantId, dateRange.startDate, dateRange.endDate);
        context.reportPeriod = dateRange.period;
        context.startDate = format(dateRange.startDate, 'yyyy-MM-dd');
        context.endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      } else if (lowerMessage.includes('today')) {
        // Specific request for today
        context.todaySales = await this.getTodaySales(tenantId);
      } else {
        // Default to today if no specific period mentioned
        context.todaySales = await this.getTodaySales(tenantId);
      }
    }

    if (lowerMessage.includes('stock') || lowerMessage.includes('inventory')) {
      context.stockLevels = await this.getStockLevels(tenantId);
    }

    if (lowerMessage.includes('low stock') || lowerMessage.includes('reorder')) {
      context.lowStock = await this.getLowStock(tenantId);
    }

    if (lowerMessage.includes('shift') || lowerMessage.includes('cashier')) {
      context.shiftSummary = await this.getShiftSummary(tenantId);
    }

    if (lowerMessage.includes('top') || lowerMessage.includes('best') || lowerMessage.includes('popular')) {
      context.topProducts = await this.getTopProducts(tenantId);
    }

    return context;
  }

  /**
   * Generate AI response using OpenAI
   */
  private async generateAIResponse(
    message: string,
    history: ChatMessage[],
    context: any,
  ): Promise<{ content: string }> {
    const systemPrompt = this.getTrueDeskSystemPrompt();
    const contextString = JSON.stringify(context, null, 2);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'system' as const, content: `Available Data Context:\n${contextString}` },
      ...history.slice(-10).map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // Call the generateChatResponse method which wraps the OpenAI service
    const response = await this.generateChatResponse(messages);

    return { content: response };
  }

  /**
   * Wrapper for OpenAI chat completion
   */
  private async generateChatResponse(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<string> {
    if (!this.openAIService.isConfigured()) {
      return "I'm sorry, but the AI service is not configured. Please contact your administrator to set up the OpenAI API key.";
    }

    try {
      // Use the OpenAI chat method
      const response = await this.openAIService.chat(messages, {
        temperature: 0.7,
        max_tokens: 500,
      });

      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Fallback to pattern matching
      return this.formatMessagesForSimpleResponse(messages);
    }
  }

  /**
   * Format messages for a simple response when AI is unavailable
   */
  private formatMessagesForSimpleResponse(messages: Array<{ role: string; content: string }>): string {
    // Get the user's last message
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) {
      return "Hello! How can I help you today?";
    }

    const lastMessage = userMessages[userMessages.length - 1].content.toLowerCase();

    // Simple pattern matching for common queries
    if (lastMessage.includes('hello') || lastMessage.includes('hi')) {
      return "Hello! I'm your TrueDesk AI Assistant. I can help you with sales data, inventory, shifts, and more. What would you like to know?";
    }

    if (lastMessage.includes('help')) {
      return "I can help you with:\n\n• Today's sales summary\n• Stock levels and low stock alerts\n• Shift summaries\n• Top selling products\n• Customer information\n\nJust ask me a question or use the quick action buttons!";
    }

    return "I've processed your request. For detailed AI-powered insights, please ensure the OpenAI API is configured.";
  }

  /**
   * Generate follow-up suggestions
   */
  private generateSuggestions(message: string, context: any): string[] {
    const suggestions = [];

    if (context.todaySales) {
      suggestions.push('Show me yesterday\'s comparison');
      suggestions.push('What are the top products today?');
    }

    if (context.stockLevels) {
      suggestions.push('Show me low stock items');
      suggestions.push('What products need reordering?');
    }

    if (context.shiftSummary) {
      suggestions.push('Compare with previous shifts');
      suggestions.push('Show shift performance details');
    }

    return suggestions.slice(0, 3);
  }

  /**
   * TrueDesk AI Assistant System Prompt
   */
  private getTrueDeskSystemPrompt(): string {
    return `You are **TrueDesk AI Assistant**, a smart, helpful, and conversational AI integrated inside the TrueDesk POS system by IdeaRigs. You appear as a floating widget to assist users throughout their workday.

Your goals:
1. Help users understand their business data through natural, human conversation.
2. Provide actionable insights from sales, inventory, shifts, and customer data.
3. Be proactive—suggest follow-up questions and offer deeper analysis.
4. Always use the provided context data—NEVER fabricate numbers.
5. Be empathetic and supportive, understanding the pressures of retail work.

-------------------------------------------------------
🟩 **Communication Style**
-------------------------------------------------------

Be HUMAN and CONVERSATIONAL:
• Talk like a knowledgeable colleague, not a robot
• Use natural language: "Looks like today's been busy!" instead of "Data indicates high transaction volume"
• Show personality: celebrate good news, acknowledge challenges
• Ask clarifying questions when needed: "Would you like me to break that down by payment method?"
• Use contractions and casual phrasing where appropriate

Examples of human responses:
❌ "Total revenue for the specified period: £53,000"
✓ "Great news! You've made **£53,000** this month. That's about **£1,700** per day on average."

❌ "Low stock alert detected for 5 items"
✓ "Heads up—you've got **5 items** running low on stock. Want me to list them so you can reorder?"

-------------------------------------------------------
🟩 **Understanding Context Data**
-------------------------------------------------------

When you receive context, it may include:

**salesReport** (for historical periods like "this month", "last week"):
- totalRevenue, totalProfit, profitMargin
- totalInvoices, averageTransaction
- cashPayments, cardPayments (amounts)
- cashTransactions, cardTransactions (counts)
- bestSeller (name)
- topProducts (array of top 5 products with revenue)
- salesData (full transaction list for export)

**todaySales** (for current day only):
- totalRevenue, totalInvoices
- cashPayments, cardTransactions
- bestSeller

**reportPeriod**: The time period being reported (e.g., "This Month", "Last Week")
**startDate** and **endDate**: Date range in YYYY-MM-DD format

IMPORTANT:
- If salesReport exists, use it for comprehensive analysis
- If only todaySales exists, clarify you're showing today's data
- Always mention the period you're reporting on

-------------------------------------------------------
🟩 **Report Format**
-------------------------------------------------------

When presenting sales reports:

**[Period] Sales Summary**

• **Revenue:** £[amount] ([transactions] transactions)
• **Profit:** £[amount] ([margin]% margin)
• **Cash:** £[amount] ([count] transactions)
• **Card:** £[amount] ([count] transactions)
• **Average Sale:** £[amount]
• **Best Seller:** [product name]

[Add a human insight or observation]

**IMPORTANT:** After showing any sales report or data summary, you MUST tell the user that download buttons for PDF and CSV are available right below your message. Say something like: "You can download this report using the buttons below - choose PDF for a formatted report or CSV for Excel."

-------------------------------------------------------
🟩 **Offering Exports**
-------------------------------------------------------

ALWAYS offer export options after providing any sales report or data summary:

"Would you like to download this as a **PDF report** or **CSV file** for further analysis?"

"I can generate a downloadable report—would you prefer **PDF** (formatted) or **CSV** (for Excel)?"

-------------------------------------------------------
🟩 **Behavior Rules**
-------------------------------------------------------

• Greetings: Respond warmly and offer help
• Off-topic questions: Politely redirect to POS-related topics
• Missing data: Explain what you need and why
• Comparisons: Proactively suggest comparing periods
• Insights: Don't just report numbers—add context and meaning
• Follow-ups: Always suggest 2-3 relevant next questions

-------------------------------------------------------
🟩 **Forbidden Actions**
-------------------------------------------------------

• DO NOT fabricate data—only use provided context
• DO NOT share sensitive customer details (phone, email)
• DO NOT perform math without valid inputs
• DO NOT expose technical details (tables, SQL, APIs)
• DO NOT mention your AI model, training, or limitations
• DO NOT be overly formal or robotic

-------------------------------------------------------
🟩 **Your Identity**
-------------------------------------------------------

You are **TrueDesk AI Assistant**, created by IdeaRigs.
You're here to make running a retail business easier and more insightful.
You understand the daily challenges of retail and want to help users succeed.

Be helpful, be human, be brilliant.`;
  }

  /**
   * Generate PDF report from report data
   */
  async generatePDFReport(
    tenantId: string,
    reportData: any,
    reportType: string,
    period?: string,
  ): Promise<Buffer> {
    const PDFDocument = require('pdfkit');

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header
        doc.fontSize(20).text('TrueDesk POS System', { align: 'center' });
        doc.fontSize(16).text(`${reportType} Report`, { align: 'center' });
        if (period) {
          doc.fontSize(12).text(period, { align: 'center' });
        }
        doc.moveDown();

        // Report Date
        doc.fontSize(10).text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, { align: 'right' });
        doc.moveDown();

        // Content based on report type
        if (reportData.salesReport || reportData.todaySales) {
          const sales = reportData.salesReport || reportData.todaySales;

          doc.fontSize(14).text('Sales Summary', { underline: true });
          doc.moveDown(0.5);

          doc.fontSize(11);
          doc.text(`Total Revenue: £${sales.totalRevenue?.toFixed(2) || '0.00'}`);
          doc.text(`Total Invoices: ${sales.totalInvoices || 0}`);

          if (sales.totalProfit !== undefined) {
            doc.text(`Total Profit: £${sales.totalProfit.toFixed(2)}`);
            doc.text(`Profit Margin: ${sales.profitMargin?.toFixed(2) || 0}%`);
          }

          doc.text(`Cash Payments: £${sales.cashPayments?.toFixed(2) || '0.00'} (${sales.cashTransactions || 0} transactions)`);
          doc.text(`Card Payments: £${sales.cardPayments?.toFixed(2) || '0.00'} (${sales.cardTransactions || 0} transactions)`);

          if (sales.averageTransaction) {
            doc.text(`Average Transaction: £${sales.averageTransaction.toFixed(2)}`);
          }

          doc.text(`Best Seller: ${sales.bestSeller || 'N/A'}`);
          doc.moveDown();

          // Top Products
          if (sales.topProducts && sales.topProducts.length > 0) {
            doc.fontSize(14).text('Top Products', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(10);

            sales.topProducts.forEach((product, index) => {
              doc.text(`${index + 1}. ${product.name} - £${product.revenue.toFixed(2)} (${product.quantity} units)`);
            });
            doc.moveDown();
          }
        }

        // Footer
        doc.fontSize(8).text(
          'Generated by TrueDesk AI Assistant | IdeaRigs',
          50,
          doc.page.height - 50,
          { align: 'center' }
        );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate CSV report from report data
   */
  async generateCSVReport(
    tenantId: string,
    reportData: any,
    reportType: string,
    period?: string,
  ): Promise<string> {
    let csvContent = '';

    // Header
    csvContent += `TrueDesk POS System\n`;
    csvContent += `${reportType} Report\n`;
    if (period) {
      csvContent += `Period: ${period}\n`;
    }
    csvContent += `Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n`;
    csvContent += `\n`;

    // Sales Report
    if (reportData.salesReport || reportData.todaySales) {
      const sales = reportData.salesReport || reportData.todaySales;

      csvContent += `Sales Summary\n`;
      csvContent += `Metric,Value\n`;
      csvContent += `Total Revenue,£${sales.totalRevenue?.toFixed(2) || '0.00'}\n`;
      csvContent += `Total Invoices,${sales.totalInvoices || 0}\n`;

      if (sales.totalProfit !== undefined) {
        csvContent += `Total Profit,£${sales.totalProfit.toFixed(2)}\n`;
        csvContent += `Profit Margin,${sales.profitMargin?.toFixed(2) || 0}%\n`;
      }

      csvContent += `Cash Payments,£${sales.cashPayments?.toFixed(2) || '0.00'}\n`;
      csvContent += `Cash Transactions,${sales.cashTransactions || 0}\n`;
      csvContent += `Card Payments,£${sales.cardPayments?.toFixed(2) || '0.00'}\n`;
      csvContent += `Card Transactions,${sales.cardTransactions || 0}\n`;

      if (sales.averageTransaction) {
        csvContent += `Average Transaction,£${sales.averageTransaction.toFixed(2)}\n`;
      }

      csvContent += `Best Seller,${sales.bestSeller || 'N/A'}\n`;
      csvContent += `\n`;

      // Top Products
      if (sales.topProducts && sales.topProducts.length > 0) {
        csvContent += `Top Products\n`;
        csvContent += `Rank,Product,Revenue,Quantity\n`;

        sales.topProducts.forEach((product, index) => {
          csvContent += `${index + 1},${product.name},£${product.revenue.toFixed(2)},${product.quantity}\n`;
        });
        csvContent += `\n`;
      }

      // Detailed Sales Data
      if (sales.salesData && sales.salesData.length > 0) {
        csvContent += `Detailed Transactions\n`;
        csvContent += `Sale Number,Date,Amount,Payment Method\n`;

        sales.salesData.forEach(sale => {
          csvContent += `${sale.saleNumber},${format(new Date(sale.date), 'dd/MM/yyyy HH:mm')},£${sale.amount.toFixed(2)},${sale.paymentMethod}\n`;
        });
      }
    }

    return csvContent;
  }
}
