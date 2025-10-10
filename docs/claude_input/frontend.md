import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  useDataChannel, 
  useLocalParticipant,
  useRoomContext 
} from '@livekit/components-react';
import { DataPacket_Kind, RoomEvent } from 'livekit-client';

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'agent' | 'vision_insight' | 'system';
  metadata?: any;
}

interface EnhancedDataMessage {
  type: 'agent_message' | 'vision_insight' | 'greeting' | 'user_message';
  content: string;
  timestamp: number;
  metadata?: any;
}

const MeetingRoomChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const room = useRoomContext();
  const localParticipant = useLocalParticipant();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Enhanced data channel handler for agent messages
  const handleDataMessage = useCallback((payload: Uint8Array, participant?: any) => {
    try {
      const text = new TextDecoder().decode(payload);
      
      // Try to parse as JSON first (new format)
      let messageData: EnhancedDataMessage;
      let sender = 'System';
      let messageType: ChatMessage['type'] = 'system';
      let content = text;
      
      try {
        messageData = JSON.parse(text);
        
        // Determine sender and type based on message structure
        switch (messageData.type) {
          case 'agent_message':
            sender = 'AI Assistant';
            messageType = 'agent';
            content = messageData.content;
            break;
          
          case 'vision_insight':
            sender = 'AI Vision';
            messageType = 'vision_insight';
            content = `🔍 ${messageData.content}`;
            break;
          
          case 'greeting':
            sender = 'AI Assistant';
            messageType = 'system';
            content = messageData.content;
            break;
          
          case 'user_message':
            sender = participant?.identity || 'User';
            messageType = 'user';
            content = messageData.content;
            break;
          
          default:
            // Unknown message type
            sender = participant?.identity || 'Unknown';
            content = messageData.content || text;
        }
        
      } catch (e) {
        // Not JSON, treat as plain text (legacy support)
        sender = participant?.identity || 'AI Assistant';
        messageType = participant ? 'user' : 'agent';
      }
      
      // Create and add message
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender,
        content,
        timestamp: new Date(),
        type: messageType,
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Clear typing indicator when agent message arrives
      if (messageType === 'agent') {
        setIsAgentTyping(false);
      }
      
    } catch (error) {
      console.error('Failed to process data message:', error);
    }
  }, []);

  // Set up data channel subscription
  useDataChannel(handleDataMessage, { topic: undefined });

  // Also listen to room events for additional context
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant?: any, kind?: any, topic?: string) => {
      // Only process if not already handled by useDataChannel
      if (!topic) {
        handleDataMessage(payload, participant);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, handleDataMessage]);

  // Send message handler
  const sendMessage = async () => {
    if (!inputMessage.trim() || !localParticipant?.localParticipant) return;

    try {
      // Create message object
      const messageData: EnhancedDataMessage = {
        type: 'user_message',
        content: inputMessage.trim(),
        timestamp: Date.now(),
      };

      // Encode and send
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(messageData));
      
      await localParticipant.localParticipant.publishData(
        data, 
        { reliable: true }
      );

      // Add to local messages immediately
      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'You',
        content: inputMessage.trim(),
        timestamp: new Date(),
        type: 'user',
      };
      
      setMessages(prev => [...prev, newMessage]);
      setInputMessage('');
      
      // Show typing indicator for agent
      setIsAgentTyping(true);
      
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Handle enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Message rendering component
  const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isUser = message.type === 'user';
    const isVisionInsight = message.type === 'vision_insight';
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div
          className={`
            max-w-[70%] px-4 py-2 rounded-2xl
            ${isUser 
              ? 'bg-blue-600 text-white rounded-br-sm' 
              : isVisionInsight
                ? 'bg-purple-600 text-white rounded-bl-sm'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm'
            }
            shadow-lg transition-all duration-200 hover:shadow-xl
          `}
        >
          {!isUser && (
            <div className="text-xs opacity-75 mb-1 font-semibold">
              {message.sender}
            </div>
          )}
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
          <div className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'opacity-60'}`}>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-2xl">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          AI Assistant Chat
        </h2>
        <p className="text-sm opacity-90 mt-1">
          Voice responses and screen analysis will appear here
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>Start a conversation with voice or text</p>
              <p className="text-sm mt-2 opacity-75">
                Screen share to enable visual context
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            
            {/* Typing Indicator */}
            {isAgentTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-200 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" 
                         style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" 
                         style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" 
                         style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t dark:border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     placeholder-gray-500 dark:placeholder-gray-400"
            disabled={!localParticipant?.localParticipant}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || !localParticipant?.localParticipant}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 
                     text-white rounded-lg font-semibold
                     hover:from-blue-700 hover:to-purple-700 
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 hover:shadow-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
        
        {/* Connection Status */}
        {!localParticipant?.localParticipant && (
          <div className="mt-2 text-sm text-red-500">
            Connecting to room...
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingRoomChat;