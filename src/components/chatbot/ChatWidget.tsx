import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, FileText, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { chatbotService, ChatMessage, QuickActionType } from '@/services/chatbotService';
import { useToast } from '@/hooks/use-toast';

const QUICK_ACTIONS = [
  { label: "Today's Sales", action: QuickActionType.TODAY_SALES, icon: '💰' },
  { label: 'Stock Levels', action: QuickActionType.STOCK_LEVELS, icon: '📦' },
  { label: 'Shift Summary', action: QuickActionType.SHIFT_SUMMARY, icon: '👤' },
  { label: 'Low Stock', action: QuickActionType.LOW_STOCK, icon: '⚠️' },
];

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [currentReport, setCurrentReport] = useState<{
    reportData: any;
    reportType: string;
    reportPeriod?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
      conversationId: conversationId || '',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatbotService.sendMessage(messageToSend, conversationId);

      setMessages(prev => [...prev, response.message]);
      setConversationId(response.conversationId);

      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      }

      // Check if response has a report
      if (response.hasReport && response.reportData && response.reportType) {
        setCurrentReport({
          reportData: response.reportData,
          reportType: response.reportType,
          reportPeriod: response.reportPeriod,
        });
      } else {
        setCurrentReport(null);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: QuickActionType, label: string) => {
    setIsLoading(true);

    // Add user message for the action
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: label,
      timestamp: new Date(),
      conversationId: conversationId || '',
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const result = await chatbotService.executeQuickAction(action);

      // Format the result into a nice message
      const formattedMessage = formatQuickActionResponse(action, result);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: formattedMessage,
        timestamp: new Date(),
        conversationId: conversationId || '',
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to execute quick action',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!currentReport) return;

    try {
      await chatbotService.downloadPDF(
        currentReport.reportData,
        currentReport.reportType,
        currentReport.reportPeriod
      );
      toast({
        title: 'Success',
        description: 'PDF report downloaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download PDF',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadCSV = async () => {
    if (!currentReport) return;

    try {
      await chatbotService.downloadCSV(
        currentReport.reportData,
        currentReport.reportType,
        currentReport.reportPeriod
      );
      toast({
        title: 'Success',
        description: 'CSV report downloaded successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download CSV',
        variant: 'destructive',
      });
    }
  };

  const formatQuickActionResponse = (action: QuickActionType, data: any): string => {
    switch (action) {
      case QuickActionType.TODAY_SALES:
        return `**Today's Sales Summary**\n\n• Total Sales: **£${data.totalRevenue?.toLocaleString() || 0}**\n• Total Invoices: **${data.totalInvoices || 0}**\n• Cash Payments: **£${data.cashPayments?.toLocaleString() || 0}**\n• Card Transactions: **${data.cardTransactions || 0}**\n• Best Seller: **${data.bestSeller || 'N/A'}**`;

      case QuickActionType.STOCK_LEVELS:
        return `**Stock Levels Overview**\n\n• Total Products: **${data.totalProducts || 0}**\n• Low Stock Items: **${data.lowStockCount || 0}**\n\nNeed to see which items are low? Just ask!`;

      case QuickActionType.SHIFT_SUMMARY:
        if (data.message) return data.message;
        return `**Shift Summary**\n\n• Shift: **${data.shiftNumber || 'N/A'}**\n• Cashier: **${data.cashier || 'N/A'}**\n• Opening Float: **£${data.openingFloat || 0}**\n• Total Sales: **£${data.totalSales?.toLocaleString() || 0}**\n• Transactions: **${data.transactionCount || 0}**\n• Status: **${data.status || 'N/A'}**`;

      case QuickActionType.LOW_STOCK: {
        if (data.count === 0) return 'Great news! No low stock items at the moment.';
        const items = (data.products as Array<{ name: string; sku: string; stockQuantity: number }>)?.slice(0, 5).map((p) =>
          `• ${p.name} (SKU: ${p.sku}) - **${p.stockQuantity} left**`
        ).join('\n') || '';
        return `**Low Stock Alert**\n\n${data.count} items need attention:\n\n${items}${data.count > 5 ? `\n\n...and ${data.count - 5} more items` : ''}`;
      }

      default:
        return JSON.stringify(data, null, 2);
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
          aria-label="Open chat"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[400px] flex-col rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">TrueDesk Assistant</h3>
                <p className="text-xs opacity-90">by IdeaRigs</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1 hover:bg-white/20 transition-colors"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Actions */}
          {messages.length === 0 && (
            <div className="border-b p-4">
              <p className="text-sm text-gray-600 mb-3">Quick Actions:</p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.action}
                    onClick={() => handleQuickAction(action.action, action.label)}
                    disabled={isLoading}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 text-sm hover:bg-gray-50 hover:border-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{action.icon}</span>
                    <span className="text-left">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">Hello! How can I help you today?</p>
                <p className="text-xs mt-1">Ask me about sales, inventory, shifts, and more!</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content.split('\n').map((line, i) => {
                      // Bold text
                      if (line.includes('**')) {
                        const parts = line.split('**');
                        return (
                          <p key={i} className="mb-1">
                            {parts.map((part, j) =>
                              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                            )}
                          </p>
                        );
                      }
                      return <p key={i} className="mb-1">{line}</p>;
                    })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-white border border-gray-200 px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Download Report Buttons */}
          {currentReport && (
            <div className="border-t p-3 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Download Report:</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleDownloadPDF}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 bg-white hover:bg-blue-50 border-blue-200"
                  >
                    <Download className="h-3 w-3" />
                    PDF
                  </Button>
                  <Button
                    onClick={handleDownloadCSV}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 bg-white hover:bg-green-50 border-green-200"
                  >
                    <Download className="h-3 w-3" />
                    CSV
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="border-t p-2 bg-gray-50">
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(suggestion)}
                    disabled={isLoading}
                    className="text-xs rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t p-4 bg-white rounded-b-2xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1 rounded-full border-gray-300 focus:border-blue-500"
              />
              <Button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                size="icon"
                className="rounded-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </>
  );
};
