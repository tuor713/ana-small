import React, { useState } from 'react';
import { RedshiftCredentials, SqlQueryResult } from '../../types';
import { testRedshiftConnection } from '../../services/redshift';
import { Database, Check, AlertCircle, Loader2 } from 'lucide-react';

interface RedshiftCredentialsSectionProps {
  credentials: RedshiftCredentials;
  onChange: (credentials: RedshiftCredentials) => void;
  disabled?: boolean;
}

const RedshiftCredentialsSection: React.FC<RedshiftCredentialsSectionProps> = ({ 
  credentials, 
  onChange,
  disabled = false
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<SqlQueryResult | null>(null);

  const updateField = (field: keyof RedshiftCredentials, value: string | number) => {
    onChange({
      ...credentials,
      [field]: field === 'port' ? Number(value) : value
    });
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Attempt real connection
      const result = await testRedshiftConnection(credentials);
      setTestResult(result);
    } catch (error) {
      console.error('Connection test failed:', error);
      setTestResult({
        columns: [],
        rows: [],
        error: error instanceof Error ? error.message : 'Connection test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Redshift Credentials</h3>
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-sm mb-1">Host</label>
          <input
            type="text"
            value={credentials.host}
            onChange={(e) => updateField('host', e.target.value)}
            placeholder="workgroup-name.account-id.region.redshift-serverless.amazonaws.com"
            className="w-full p-2 border border-black"
            autoComplete="off"
            spellCheck="false"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Port</label>
          <input
            type="number"
            value={credentials.port}
            onChange={(e) => updateField('port', e.target.value)}
            placeholder="5439"
            className="w-full p-2 border border-black"
            autoComplete="off"
            spellCheck="false"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Database</label>
          <input
            type="text"
            value={credentials.database}
            onChange={(e) => updateField('database', e.target.value)}
            placeholder="dev"
            className="w-full p-2 border border-black"
            autoComplete="off"
            spellCheck="false"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Schema</label>
          <input
            type="text"
            value={credentials.schema}
            onChange={(e) => updateField('schema', e.target.value)}
            placeholder="public"
            className="w-full p-2 border border-black"
            autoComplete="off"
            spellCheck="false"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Username</label>
          <input
            type="text"
            value={credentials.user}
            onChange={(e) => updateField('user', e.target.value)}
            placeholder="awsuser"
            className="w-full p-2 border border-black"
            autoComplete="off"
            spellCheck="false"
            disabled={disabled}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            value={credentials.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder="••••••••"
            className="w-full p-2 border border-black"
            autoComplete="off"
            spellCheck="false"
            disabled={disabled}
          />
        </div>
        
        <div className="mt-2">
          <button
            onClick={testConnection}
            disabled={isTesting || !credentials.host || !credentials.schema || disabled}
            className="px-4 py-2 border border-black hover:bg-gray-100 flex items-center disabled:bg-gray-100 disabled:border-gray-300 disabled:cursor-not-allowed"
          >
            {isTesting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Testing Connection...
              </>
            ) : (
              <>
                <Database size={16} className="mr-2" />
                Test Connection
              </>
            )}
          </button>
        </div>
        
        {testResult && (
          <div className={`mt-2 p-3 border ${testResult.error ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}`}>
            <div className="flex items-center mb-2">
              {testResult.error ? (
                <>
                  <AlertCircle size={16} className="text-red-500 mr-2" />
                  <span className="font-bold text-red-500">Connection Failed</span>
                </>
              ) : (
                <>
                  <Check size={16} className="text-green-500 mr-2" />
                  <span className="font-bold text-green-500">Connection Successful</span>
                </>
              )}
            </div>
            
            {testResult.error ? (
              <div className="text-red-500">{testResult.error}</div>
            ) : (
              <div className="overflow-x-auto max-h-40">
                <p className="mb-1">Tables in schema <code>{credentials.schema}</code>:</p>
                {testResult.rows.length === 0 ? (
                  <p className="italic">No tables found in this schema</p>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        {testResult.columns.map((col, i) => (
                          <th key={i} className="border border-black p-1 text-left">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {testResult.rows.map((row, i) => (
                        <tr key={i}>
                          {testResult.columns.map((col, j) => (
                            <td key={j} className="border border-black p-1">{row[col]?.toString() || 'null'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RedshiftCredentialsSection;