import React, { useState, useMemo } from 'react';
import { SampleWarehouse, RedshiftCredentials } from '../types';
import { SAMPLE_WAREHOUSES } from '../constants/sampleWarehouses';
import { SUGGESTED_QUERIES } from '../constants/suggestedQueries';
import { Database, ChevronDown, Send, Plus } from 'lucide-react';
import MessageInput from './MessageInput';
import RedshiftConnectorModal from './RedshiftConnectorModal';

interface EmptyStateSelectorProps {
  onQuerySelect: (content: string) => void;
  userCredentials: RedshiftCredentials | null;
  selectedWarehouseId: string;
  onWarehouseSelect: (id: string, credentials?: RedshiftCredentials) => void;
  isLoading: boolean;
  onStopChat: () => void;
}

const EmptyStateSelector: React.FC<EmptyStateSelectorProps> = ({
  onQuerySelect,
  userCredentials,
  selectedWarehouseId,
  onWarehouseSelect,
  isLoading,
  onStopChat,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isConnectorModalOpen, setIsConnectorModalOpen] = useState(false);
  
  const suggestedQueries = useMemo(() => {
    const warehouseQueries = SUGGESTED_QUERIES.filter(
      query => query.warehouseId === selectedWarehouseId
    );
    
    return [...warehouseQueries]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
  }, [selectedWarehouseId]);

  const selectedWarehouse = SAMPLE_WAREHOUSES.find(w => w.id === selectedWarehouseId);
  const isSampleWarehouse = selectedWarehouseId.startsWith('SAMPLE-');

  const handleAddConnector = (credentials: RedshiftCredentials) => {
    onWarehouseSelect('USER-1', credentials);
    setIsConnectorModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-4 pt-24 relative">
      <div className="w-full max-w-xl">
        <div className="mb-16">
          <h1 className="font-system text-sm text-gray-500 mb-2">
            Data Warehouse
          </h1>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between p-3 border border-black bg-white hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Database size={20} className="text-gray-700" />
                  <span className="font-system text-base font-normal text-black">
                    {selectedWarehouseId === 'USER-1' && userCredentials
                      ? userCredentials.name || 'My Data Warehouse'
                      : selectedWarehouse?.name}
                  </span>
                  {selectedWarehouseId !== 'USER-1' && (
                    <span className="font-system text-xs font-normal bg-blue-100 text-blue-800 px-2 py-0.5">Sample</span>
                  )}
                </div>
                <ChevronDown size={20} className={`text-gray-700 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 border border-black bg-white z-10 divide-y divide-black">
                  {SAMPLE_WAREHOUSES.map((warehouse) => (
                    <button
                      key={warehouse.id}
                      onClick={() => {
                        onWarehouseSelect(warehouse.id);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full p-4 text-left hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-system text-base font-normal text-black">{warehouse.name}</span>
                        <span className="font-system text-xs font-normal bg-blue-100 text-blue-800 px-2 py-0.5">Sample</span>
                      </div>
                      <div className="font-system text-sm font-normal text-gray-500">{warehouse.description}</div>
                    </button>
                  ))}
                  {userCredentials && (
                    <button
                      onClick={() => {
                        onWarehouseSelect('USER-1');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full p-4 text-left hover:bg-gray-100 transition-colors"
                    >
                      <div className="font-system text-base font-normal text-black mb-1">{userCredentials.name || 'My Data Warehouse'}</div>
                      <div className="font-system text-sm font-normal text-gray-500">{userCredentials.description || userCredentials.host}</div>
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setIsConnectorModalOpen(true)}
              className="p-3 border border-black hover:bg-gray-100 transition-colors flex items-center justify-center"
              title="Add Data Warehouse"
            >
              <Plus size={20} className="text-black" />
            </button>
          </div>
        </div>

        {isSampleWarehouse && suggestedQueries.length > 0 && (
          <div className="mb-16">
            <h2 className="font-system text-sm text-gray-500 mb-2">
              Suggested Analyses
            </h2>
            <div className="space-y-2">
              {suggestedQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => onQuerySelect(query.content)}
                  className="w-full text-left p-3 border border-black hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <div className="font-system text-base font-normal text-black mb-1">{query.description}</div>
                      <div className="font-system text-sm font-normal text-gray-500 line-clamp-2">{query.content}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <Send size={20} className="text-gray-400 group-hover:text-black transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-4xl">
        <MessageInput
          onSendMessage={onQuerySelect}
          isLoading={isLoading}
          onStopChat={onStopChat}
          variant="landing"
        />
      </div>

      <RedshiftConnectorModal
        isOpen={isConnectorModalOpen}
        onClose={() => setIsConnectorModalOpen(false)}
        onSave={handleAddConnector}
      />
    </div>
  );
};

export default EmptyStateSelector;