// threadChat.tsx
// Thread-based AI Chat interface with new API integration

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView,
  StatusBar, Animated, Dimensions, Alert, Keyboard
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, ScanLine, Search, PenTool } from 'lucide-react-native';
import { colors, typography, spacing, shadows } from '../styles';
import TabHeader from '../components/ui/TabHeader';
import useAuthStore from '../stores/authStore';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import ProductSearchModal from '../components/ProductSearchModal';
import {
  createThread,
  sendThreadMessage,
  confirmThreadItem,
  getChatHistoryByImageId,
  searchProductByUPC
} from '../utils/newApiService';

const { width } = Dimensions.get('window');

interface ThreadChatParams {
  chatType?: string;
  initialMessage?: string;
  imageId?: string;
}

interface Message {
  id: string;
  content: string;
  role: string;
  timestamp: string;
}

interface PendingItem {
  name: string;
  type: string;
  usage?: string;
  frequency?: string;
  concern?: string[];
}

interface RequestProductInput {
  message: string;
  options: string[];
  nextAction?: any;
}

// Helper function to format timestamps consistently
const formatTimestamp = (timestamp: string | Date | null): string => {
  console.log("🔵 formatTimestamp", timestamp);
  if (!timestamp) return '';
  
  try {
    let date: Date;
    
    // If timestamp is a string (UTC from API), parse it
    if (typeof timestamp === 'string') {
      // Ensure the timestamp is treated as UTC by adding Z if missing
      let utcTimestamp = timestamp;
      if (!timestamp.endsWith('Z') && !timestamp.includes('+')) {
        utcTimestamp = timestamp + 'Z';
      }
      date = new Date(utcTimestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return '';
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return '';
    }
    
    // Convert to local time and format as HH:MM
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
  } catch (error) {
    console.error('Error formatting timestamp:', error, timestamp);
    return '';
  }
};

const ThreadChatScreen = (): React.JSX.Element => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as ThreadChatParams || {};
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuthStore();

  // Extract parameters
  const chatType = params.chatType || 'snapshot_feedback';
  const initialMessage = params.initialMessage;
  const imageId = params.imageId;

  console.log("🔵 ThreadChatScreen - params:", params);

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [pendingItem, setPendingItem] = useState<PendingItem | null>(null);
  const [requestProductInput, setRequestProductInput] = useState<RequestProductInput | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState<boolean>(false);
  const [showProductSearch, setShowProductSearch] = useState<boolean>(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Initialize chat
  useEffect(() => {
    initializeChat();
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const initializeChat = async (): Promise<void> => {
    try {
      setIsInitializing(true);
      setError(null);
      console.log("🔵 initializeChat", chatType, imageId, initialMessage);
      
      // Special handling for snapshot_feedback type
      if (chatType === 'snapshot_feedback' && imageId) {
        await loadExistingChatHistory();
      } else if (initialMessage) {
        // Send initial message to create thread for other chat types
        await sendInitialMessage();
      }

      // Start fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      console.error('Error initializing chat:', error);
      setError('Failed to initialize chat');
    } finally {
      setIsInitializing(false);
    }
  };

  const loadExistingChatHistory = async (): Promise<void> => {
    try {
      console.log('🔵 Loading existing chat history for image_id:', imageId);
      
      const response = await getChatHistoryByImageId(imageId!);
      
      if ((response as any).success && (response as any).data.result) {
        const threadData = (response as any).data.result;
        setThreadId(threadData.id);
        
        // Format existing messages
        const existingMessages = threadData.messages || [];
        const formattedMessages: Message[] = existingMessages.map((msg: any, index: number) => ({
          id: `${msg.role}-${Date.now()}-${index}`,
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp || msg.created_at || new Date().toISOString()
        }));
        
        setMessages(formattedMessages);
        console.log('✅ Loaded existing chat history:', formattedMessages.length, 'messages');
      } else {
        // If no existing chat history, create a new thread
        console.log('🔵 No existing chat history found, creating new thread');
        await sendInitialMessage();
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // If loading fails, try to create a new thread
      await sendInitialMessage();
    }
  };

  const sendInitialMessage = async (): Promise<void> => {
    try {
      const messageData: any = {
        content: initialMessage || 'Analyze my score',
        role: 'user',
        thread_type: chatType
      };

      // Add image_id for snapshot_feedback type
      if (chatType === 'snapshot_feedback' && imageId) {
        messageData.image_id = imageId;
      }

      const response = await createThread(messageData);

      if ((response as any).success) {
        setThreadId((response as any).data.thread_id);
        
        // Only use the response messages array to display chat messages
        const responseMessages = (response as any).data.messages || [];
        const formattedMessages: Message[] = responseMessages.map((msg: any, index: number) => ({
          id: `${msg.role}-${Date.now()}-${index}`,
          content: msg.content,
          role: msg.role,
          timestamp: msg.timestamp || msg.created_at || new Date().toISOString()
        }));

        setMessages(formattedMessages);

        // Check for pending item
        if ((response as any).data.status.addItem) {
          setPendingItem((response as any).data.status.addItem);
        }

        // Check for requestProductInput
        if ((response as any).data.requestProductInput) {
          setRequestProductInput((response as any).data.requestProductInput);
        } else {
          setRequestProductInput(null);
        }
      }
    } catch (error) {
      console.error('Error sending initial message:', error);
      setError('Failed to send initial message');
    }
  };

  const sendMessage = async (): Promise<void> => {
    if (!inputText.trim() || !threadId) return;

    const messageToSend = inputText.trim();
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: messageToSend,
      role: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    // Ensure the input ref is also cleared
    if (inputRef.current) {
      inputRef.current.clear();
    }
    
    // Scroll to bottom after adding user message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    setIsLoading(true);

    try {
      const messageData: any = {
        content: messageToSend,
        role: 'user',
        thread_type: chatType
      };

      // Add image_id for snapshot_feedback type
      if (chatType === 'snapshot_feedback' && imageId) {
        messageData.image_id = imageId;
      }

      const response = await sendThreadMessage(threadId, messageData);

      if ((response as any).success) {
        // Add AI response (last message from the response)
        const aiMessages = (response as any).data.messages || [];
        const lastAiMessage = aiMessages[aiMessages.length - 1];
        
        if (lastAiMessage && lastAiMessage.role === 'assistant') {
          const aiMessage: Message = {
            id: `ai-${Date.now()}`,
            content: lastAiMessage.content,
            role: 'assistant',
            timestamp: lastAiMessage.timestamp
          };
          setMessages(prev => [...prev, aiMessage]);
          
          // Scroll to bottom after adding AI message
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }

        console.log("🔵 response of sendMessage", response.data);

        // Check for pending item
        if ((response as any).data.status.addItem) {
          setPendingItem((response as any).data.status.addItem);
        } else {
          setPendingItem(null);
        }

        // Check for requestProductInput
        if ((response as any).data.requestProductInput) {
          setRequestProductInput((response as any).data.requestProductInput);
        } else {
          setRequestProductInput(null);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmItem = async (confirmed: boolean): Promise<void> => {
    if (!threadId || !pendingItem) return;

    try {
      setIsLoading(true);

      if (confirmed) {
        // Confirm the item
        const response = await confirmThreadItem(threadId, pendingItem, false);
        
        if ((response as any).success) {
          // Add confirmation message
          const confirmMessage: Message = {
            id: `confirm-${Date.now()}`,
            content: 'Yes',
            role: 'user',
            timestamp: new Date().toISOString()
          };

          // Add AI response (last message from the response)
          const aiMessages = (response as any).data.messages || [];
          const lastAiMessage = aiMessages[aiMessages.length - 1];
          
          if (lastAiMessage && lastAiMessage.role === 'assistant') {
            const aiMessage: Message = {
              id: `ai-${Date.now()}`,
              content: lastAiMessage.content,
              role: 'assistant',
              timestamp: lastAiMessage.timestamp
            };
            setMessages(prev => [...prev, confirmMessage, aiMessage]);
          } else {
            setMessages(prev => [...prev, confirmMessage]);
          }
        }
      } else {
        // Send "no" message
        const response = await confirmThreadItem(threadId, pendingItem, true);

        console.log("🔵 response of no confirmThreadItem", response);

        if ((response as any).success) {
          const noMessage: Message = {
            id: `no-${Date.now()}`,
            content: 'No',
            role: 'user',
            timestamp: new Date().toISOString()
          };

          // Add AI response (last message from the response)
          const aiMessages = (response as any).data.messages || [];
          const lastAiMessage = aiMessages[aiMessages.length - 1];
          
          if (lastAiMessage && lastAiMessage.role === 'assistant') {
            const aiMessage: Message = {
              id: `ai-${Date.now()}`,
              content: lastAiMessage.content,
              role: 'assistant',
              timestamp: lastAiMessage.timestamp
            };
            setMessages(prev => [...prev, noMessage, aiMessage]);
          } else {
            setMessages(prev => [...prev, noMessage]);
          }
        }
      }

      setPendingItem(null);
    } catch (error) {
      console.error('Error handling item confirmation:', error);
      Alert.alert('Error', 'Failed to process confirmation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send UPC code silently (without showing in chat)
  const sendUPCCode = async (upcCode: string): Promise<void> => {
    if (!threadId || !upcCode) return;

    try {
      setIsLoading(true);

      const messageData: any = {
        content: upcCode,
        role: 'user',
        thread_type: chatType
      };

      // Add image_id for snapshot_feedback type
      if (chatType === 'snapshot_feedback' && imageId) {
        messageData.image_id = imageId;
      }

      const response = await sendThreadMessage(threadId, messageData);

      if ((response as any).success) {
        // Add AI response (last message from the response) to chat
        const aiMessages = (response as any).data.messages || [];
        const lastAiMessage = aiMessages[aiMessages.length - 1];
        
        if (lastAiMessage && lastAiMessage.role === 'assistant') {
          const aiMessage: Message = {
            id: `ai-${Date.now()}`,
            content: lastAiMessage.content,
            role: 'assistant',
            timestamp: lastAiMessage.timestamp
          };
          setMessages(prev => [...prev, aiMessage]);
          
          // Scroll to bottom after adding AI message
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }

        console.log("🔵 response of sendUPCCode", response.data);

        // Check for pending item or requestProductInput
        if ((response as any).data.status.addItem) {
          setPendingItem((response as any).data.status.addItem);
        } else {
          setPendingItem(null);
        }

        if ((response as any).data.requestProductInput) {
          setRequestProductInput((response as any).data.requestProductInput);
        } else {
          setRequestProductInput(null);
        }
      }
    } catch (error) {
      console.error('Error sending UPC code:', error);
      Alert.alert('Error', 'Failed to send product code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle barcode scan
  const handleBarcodeScan = async (productData: any): Promise<void> => {
    if (productData && productData.upc) {
      await sendUPCCode(productData.upc);
      setShowBarcodeScanner(false);
      setRequestProductInput(null);
    }
  };

  // Handle product search selection
  const handleProductSelect = async (product: any): Promise<void> => {
    try {
      console.log('🔍 Product selected from search:', product);

      // If product has UPC, use it directly
      if (product.upc) {
        await sendUPCCode(product.upc);
        setShowProductSearch(false);
        setRequestProductInput(null);
        return;
      }

      // If product doesn't have UPC, try to fetch full product details by searching by UPC
      // But first, we need to search by product name to get UPC
      // However, since we already searched by name, the product should have UPC
      // If it doesn't, we'll try to fetch it using searchProductByUPC with the product name
      // But that won't work - we need UPC to search by UPC
      
      // For now, if product doesn't have UPC, we'll send the product name
      // The backend should handle product name to UPC conversion or accept product name
      if (product.product_name) {
        console.log('⚠️ Product UPC not found, sending product name:', product.product_name);
        await sendUPCCode(product.product_name);
        setShowProductSearch(false);
        setRequestProductInput(null);
      } else {
        Alert.alert('Error', 'Product information is incomplete. Please try again.');
        setShowProductSearch(false);
      }
    } catch (error) {
      console.error('Error handling product select:', error);
      Alert.alert('Error', 'Failed to process product selection.');
      setShowProductSearch(false);
    }
  };

  // Handle manual entry
  const handleManualEntry = async (productName: string): Promise<void> => {
    // For manual entry, we'll send the product name
    // The backend should handle converting it to UPC or processing it
    if (productName && productName.trim()) {
      await sendUPCCode(productName.trim());
      setShowProductSearch(false);
      setRequestProductInput(null);
    }
  };

  const scrollToBottom = useCallback((): void => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const renderMessage = ({ item }: { item: Message }): React.JSX.Element => (
    <MessageBubble message={item} />
  );

  const MessageBubble = ({ message }: { message: Message }): React.JSX.Element => {
    const isUser = message.role === 'user';
    
    // Debug timestamp for both user and assistant messages
    console.log(`🔵 Message ${message.role} timestamp:`, {
      role: message.role,
      timestamp: message.timestamp,
      formatted: formatTimestamp(message.timestamp)
    });
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.aiMessageText
          ]}>
            {message.content}
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {formatTimestamp(message.timestamp)}
        </Text>
      </View>
    );
  };

  const PendingItemCard = (): React.JSX.Element | null => {
    if (!pendingItem) return null;

    console.log("🔵 PendingItemCard - pendingItem:", pendingItem);

    return (
      <View style={styles.pendingItemCard}>
        <Text style={styles.pendingItemTitle}>Confirm Item</Text>
        <View style={styles.pendingItemDetails}>
          <Text style={styles.pendingItemText}>
            <Text style={styles.pendingItemLabel}>Name:</Text> {pendingItem.name}
          </Text>
          <Text style={styles.pendingItemText}>
            <Text style={styles.pendingItemLabel}>Type:</Text> {pendingItem.type}
          </Text>
          {pendingItem.usage && (
            <Text style={styles.pendingItemText}>
              <Text style={styles.pendingItemLabel}>Usage:</Text> {pendingItem.usage}
            </Text>
          )}
          {pendingItem.frequency && (
            <Text style={styles.pendingItemText}>
              <Text style={styles.pendingItemLabel}>Frequency:</Text> {pendingItem.frequency}
            </Text>
          )}
          {pendingItem.concern && pendingItem.concern.length > 0 && (
            <Text style={styles.pendingItemText}>
              <Text style={styles.pendingItemLabel}>Concerns:</Text> {pendingItem.concern.join(', ')}
            </Text>
          )}
        </View>
        <View style={styles.pendingItemActions}>
          <TouchableOpacity
            style={[styles.pendingItemButton, styles.confirmButton]}
            onPress={() => handleConfirmItem(true)}
            disabled={isLoading}
          >
            <Text style={styles.confirmButtonText}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pendingItemButton, styles.declineButton]}
            onPress={() => handleConfirmItem(false)}
            disabled={isLoading}
          >
            <Text style={styles.declineButtonText}>No</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const ProductInputCard = (): React.JSX.Element | null => {
    if (!requestProductInput) return null;

    console.log("🔵 ProductInputCard - requestProductInput:", requestProductInput);

    return (
      <View style={styles.productInputCard}>
        <View style={styles.productInputHeader}>
          <Text style={styles.productInputTitle}>{requestProductInput.message || 'How would you like to add this product?'}</Text>
        </View>
        <View style={styles.productInputActions}>
          {requestProductInput.options && requestProductInput.options.includes('Scan Barcode') && (
            <TouchableOpacity
              style={[styles.productInputButton, styles.scanButton]}
              onPress={() => setShowBarcodeScanner(true)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <View style={styles.productInputButtonIcon}>
                <ScanLine size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.productInputButtonText}>Scan Barcode</Text>
            </TouchableOpacity>
          )}
          {requestProductInput.options && requestProductInput.options.includes('Search by Name') && (
            <TouchableOpacity
              style={[styles.productInputButton, styles.searchButton]}
              onPress={() => setShowProductSearch(true)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <View style={styles.productInputButtonIcon}>
                <Search size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.productInputButtonText}>Search by Name</Text>
            </TouchableOpacity>
          )}
          {requestProductInput.options && requestProductInput.options.includes('Enter Manually') && (
            <TouchableOpacity
              style={[styles.productInputButton, styles.manualButton]}
              onPress={() => {
                setShowProductSearch(true);
                // We'll handle manual entry through ProductSearchModal's save functionality
              }}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <View style={styles.productInputButtonIcon}>
                <PenTool size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.productInputButtonText}>Enter Manually</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing chat...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeChat}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation as any).goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={[
              styles.messagesContainer,
              { paddingBottom: keyboardHeight > 0 ? 20 : 0 }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            onLayout={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />

          {/* Pending Item Card */}
          <PendingItemCard />

          {/* Product Input Card */}
          <ProductInputCard />

          {/* Input Area */}
          {!pendingItem && !requestProductInput && (
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  placeholder="Type your message..."
                  placeholderTextColor={colors.textSecondary}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                  editable={!isLoading}
                  onFocus={() => {
                    // Scroll to bottom when input is focused
                    setTimeout(() => {
                      flatListRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                  onPress={sendMessage}
                  disabled={!inputText.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onProductScanned={handleBarcodeScan}
        onError={(message) => {
          Alert.alert('Error', message);
          setShowBarcodeScanner(false);
        }}
      />

      {/* Product Search Modal */}
      <ProductSearchModal
        visible={showProductSearch}
        onClose={() => setShowProductSearch(false)}
        onProductSelect={handleProductSelect}
        onError={(message) => {
          Alert.alert('Error', message);
        }}
        onSaveCustomProduct={handleManualEntry}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.md,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  pendingItemCard: {
    backgroundColor: '#FEF3C7',
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  pendingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: spacing.sm,
  },
  pendingItemDetails: {
    marginBottom: spacing.md,
  },
  pendingItemText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: spacing.xs,
  },
  pendingItemLabel: {
    fontWeight: '600',
  },
  pendingItemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pendingItemButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  confirmButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  declineButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  productInputCard: {
    backgroundColor: '#FFFFFF',
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    ...shadows.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productInputHeader: {
    marginBottom: spacing.md,
  },
  productInputTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22,
    textAlign: 'center',
  },
  productInputActions: {
    gap: spacing.md,
  },
  productInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    minHeight: 56,
    gap: spacing.sm,
  },
  productInputButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInputButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  scanButton: {
    backgroundColor: colors.primary,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButton: {
    backgroundColor: colors.primary,
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  manualButton: {
    backgroundColor: colors.primary,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default ThreadChatScreen;