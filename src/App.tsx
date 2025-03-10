import React, { useState, useRef } from 'react';
import { Message, SqlQueryResult, JavaScriptExecutionResult, RedshiftCredentials } from './types';
import { useSettings } from './hooks/useSettings';
import { useChats } from './hooks/useChats';
import { sendChatRequest } from './services/openai';
import { executeSqlQuery } from './services/redshift';
import { executeJavaScript } from './services/jsExecutor';
import Header from './components/Header';
import MessageList from './components/MessageList';
import SettingsModal from './components/SettingsModal';
import ChatHistoryModal from './components/ChatHistoryModal';

function App() {
  const [settings, setSettings] = useSettings();
  const { 
    chats, 
    activeChat, 
    isLoaded,
    createChat, 
    deleteChat, 
    switchChat, 
    updateMessages,
    updateChatTitle,
    updateChatConnector
  } = useChats();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const formatSqlResultAsTable = (result: SqlQueryResult): string => {
    if (result.error) return `Error: ${result.error}`;
    if (result.rows.length === 0) return 'Query executed successfully. No results returned.';
    
    const columnWidths: Record<string, number> = {};
    result.columns.forEach(col => {
      columnWidths[col] = col.length;
      result.rows.forEach(row => {
        const cell = row[col]?.toString() || 'null';
        columnWidths[col] = Math.max(columnWidths[col], cell.length);
      });
    });
    
    const header = '| ' + result.columns.map(col => col.padEnd(columnWidths[col])).join(' | ') + ' |';
    const separator = '|' + result.columns.map(col => '-'.repeat(columnWidths[col] + 2)).join('|') + '|';
    const rows = result.rows.map(row =>
      '| ' + result.columns.map(col => (row[col]?.toString() || 'null').padEnd(columnWidths[col])).join(' | ') + ' |'
    );
    return [header, separator, ...rows].join('\n');
  };

  const stopChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      if (activeChat) {
        const updatedMessages = [...activeChat.messages, {
          role: 'system',
          content: 'Operation stopped by user.'
        }];
        updateMessages(updatedMessages);
      }
      
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    if (isLoading) {
      stopChat();
    }
    createChat();
    setIsChatHistoryOpen(false);
  };

  const handleWarehouseSelect = (id: string, credentials?: RedshiftCredentials) => {
    if (id === 'USER-1' && credentials) {
      // Update the stored credentials when selecting a user warehouse
      setSettings({ redshiftCredentials: credentials });
    }
    if (activeChat) {
      updateChatConnector(activeChat.id, id);
    } else {
      createChat(id);
    }
  };

  const sendMessage = async (content: string) => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    if (!activeChat) {
      createChat();
      return;
    }

    const userMessage: Message = { role: 'user', content };
    const updatedMessages = [...activeChat.messages, userMessage];
    updateMessages(updatedMessages);
    setIsLoading(true);

    try {
      if (signal.aborted) {
        throw new Error('Operation cancelled by user');
      }

      const assistantResponse = await sendChatRequest(
        updatedMessages, 
        settings.systemPrompt, 
        settings.openaiApiKey, 
        signal,
        activeChat.connectorId
      );
      
      if (signal.aborted) {
        throw new Error('Operation cancelled by user');
      }
      
      const messagesWithResponse = [...updatedMessages, assistantResponse];
      updateMessages(messagesWithResponse);
      
      if (assistantResponse.tool_calls && assistantResponse.tool_calls.length > 0) {
        await handleToolCalls(assistantResponse, messagesWithResponse, settings.openaiApiKey, signal);
      }
    } catch (error) {
      console.error('Error:', error);
      
      if (!signal.aborted && activeChat) {
        const errorMessage: Message = {
          role: 'system',
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
        updateMessages([...updatedMessages, errorMessage]);
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const handleToolCalls = async (
    assistantMessage: Message, 
    currentHistory: Message[], 
    apiKey: string | null,
    signal: AbortSignal
  ) => {
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0 || !activeChat) return;
    
    for (const toolCall of assistantMessage.tool_calls) {
      if (signal.aborted) {
        throw new Error('Operation cancelled by user');
      }
      
      if (toolCall.function.name === 'exec-sql') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const sqlQuery = args.code;
          console.log(`Executing SQL query: ${sqlQuery}`);
          
          const executingMessage: Message = {
            role: 'system',
            content: `Executing SQL query:\n\`\`\`sql\n${sqlQuery}\n\`\`\``
          };
          const messagesWithExecuting = [...currentHistory, executingMessage];
          updateMessages(messagesWithExecuting);
          
          if (signal.aborted) {
            throw new Error('Operation cancelled by user');
          }
          
          let credentials: RedshiftCredentials | { id: string } | null;
          if (activeChat.connectorId === 'USER-1') {
            credentials = settings.redshiftCredentials;
          } else {
            credentials = { id: activeChat.connectorId };
          }
          
          const result = await executeSqlQuery(credentials, sqlQuery, signal);
          
          if (signal.aborted) {
            throw new Error('Operation cancelled by user');
          }
          
          const resultContent = result.error 
            ? `Error: ${result.error}` 
            : formatSqlResultAsTable(result);
          
          const toolResponseMessage: Message = {
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'exec-sql',
            content: resultContent
          };
          
          const updatedMessages = currentHistory.filter(msg => msg !== executingMessage).concat(toolResponseMessage);
          updateMessages(updatedMessages);
          
          currentHistory = updatedMessages;
        } catch (error) {
          if (signal.aborted) {
            throw new Error('Operation cancelled by user');
          }
          
          console.error('Error executing SQL:', error);
          const errorToolResponse: Message = {
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'exec-sql',
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
          const updatedMessages = [...currentHistory, errorToolResponse];
          updateMessages(updatedMessages);
          currentHistory = updatedMessages;
        }
      } else if (toolCall.function.name === 'exec-js') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const jsCode = args.code;
          const jsData = args.data;
          console.log(`Executing JavaScript code: ${jsCode}`);
          
          const executingMessage: Message = {
            role: 'system',
            content: `Executing JavaScript code:\n\`\`\`javascript\n${jsCode}\n\`\`\``
          };
          const messagesWithExecuting = [...currentHistory, executingMessage];
          updateMessages(messagesWithExecuting);
          
          if (signal.aborted) {
            throw new Error('Operation cancelled by user');
          }
          
          let sqlResult = null;
          for (let i = currentHistory.length - 1; i >= 0; i--) {
            const msg = currentHistory[i];
            if (msg.role === 'tool' && msg.name === 'exec-sql') {
              try {
                if (!jsData && msg.content && !msg.content.startsWith('Error:')) {
                  sqlResult = msg.content;
                }
                break;
              } catch (e) {
                console.error('Error parsing SQL result:', e);
              }
            }
          }
          
          const result: JavaScriptExecutionResult = await executeJavaScript(jsCode, jsData || sqlResult);
          
          if (signal.aborted) {
            throw new Error('Operation cancelled by user');
          }
          
          let resultContent = '';
          if (result.error) {
            resultContent = `Error: ${result.error}`;
          } else {
            const visualizationsJson = result.visualizations 
              ? JSON.stringify({ visualizations: result.visualizations }) 
              : '';
            
            if (result.output) {
              resultContent = `Output:\n\`\`\`\n${result.output}\n\`\`\`\n\n${visualizationsJson}`;
            } else {
              resultContent = visualizationsJson;
            }
          }
          
          const toolResponseMessage: Message = {
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'exec-js',
            content: resultContent
          };
          
          const updatedMessages = currentHistory.filter(msg => msg !== executingMessage).concat(toolResponseMessage);
          updateMessages(updatedMessages);
          
          currentHistory = updatedMessages;
        } catch (error) {
          if (signal.aborted) {
            throw new Error('Operation cancelled by user');
          }
          
          console.error('Error executing JavaScript:', error);
          const errorToolResponse: Message = {
            role: 'tool',
            tool_call_id: toolCall.id,
            name: 'exec-js',
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
          const updatedMessages = [...currentHistory, errorToolResponse];
          updateMessages(updatedMessages);
          currentHistory = updatedMessages;
        }
      }
    }
    
    if (signal.aborted) {
      throw new Error('Operation cancelled by user');
    }
    
    try {
      const nextResponse = await sendChatRequest(currentHistory, settings.systemPrompt, apiKey, signal);
      
      if (signal.aborted) {
        throw new Error('Operation cancelled by user');
      }
      
      const updatedMessages = [...currentHistory, nextResponse];
      updateMessages(updatedMessages);
      
      if (nextResponse.tool_calls && nextResponse.tool_calls.length > 0) {
        await handleToolCalls(nextResponse, updatedMessages, apiKey, signal);
      }
    } catch (error) {
      if (signal.aborted) {
        throw new Error('Operation cancelled by user');
      }
      
      console.error('Error getting next response:', error);
      const errorMessage: Message = {
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      updateMessages([...currentHistory, errorMessage]);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onOpenChatHistory={() => setIsChatHistoryOpen(true)}
        onNewChat={handleNewChat}
      />
      <div className="flex flex-col flex-grow">
        <MessageList 
          messages={activeChat?.messages || []} 
          isLoading={isLoading}
          onSendMessage={sendMessage}
          userCredentials={settings.redshiftCredentials.host ? settings.redshiftCredentials : null}
          selectedWarehouseId={activeChat?.connectorId || 'SAMPLE-1'}
          onWarehouseSelect={handleWarehouseSelect}
          onStopChat={stopChat}
          showInput={activeChat?.messages.length > 0}
        />
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />
      <ChatHistoryModal
        isOpen={isChatHistoryOpen}
        onClose={() => setIsChatHistoryOpen(false)}
        chats={chats}
        activeChat={activeChat}
        onCreateChat={handleNewChat}
        onDeleteChat={deleteChat}
        onSwitchChat={(chatId) => {
          switchChat(chatId);
          setIsChatHistoryOpen(false);
        }}
        onUpdateChatTitle={updateChatTitle}
      />
    </div>
  );
}

export default App;