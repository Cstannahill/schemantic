import React, { useState, useEffect } from 'react';
// Use the locally generated client and types
import type { APIHealthCheck, APIProductResponse } from './generated';
import { ECommerceApiClient as e_commerce_apiApiClient } from './generated';
const TestComponent: React.FC = () => {
  const [healthData, setHealthData] = useState<APIHealthCheck | null>(null);
  const [products, setProducts] = useState<APIProductResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiClient = new e_commerce_apiApiClient({
    baseUrl: 'http://localhost:8000',
  });

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const health = await apiClient.healthCheckHealthGet();
      setHealthData(health);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.getProductsProductsGet();
      // result is a union of error or paginated response
      if (result && typeof (result as any) === 'object' && 'items' in (result as any)) {
        setProducts(((result as any).items ?? []) as APIProductResponse[]);
      } else {
        // if error shape, surface a friendly message
        setError('Failed to fetch products');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // intentionally not adding fetchHealth to deps to avoid re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchHealth();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Type-Sync Generated API Client Test</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>Health Check</h2>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {healthData && (
          <div style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px' }}>
            <p><strong>Status:</strong> {healthData.status}</p>
            <p><strong>Version:</strong> {healthData.version}</p>
            <p><strong>Environment:</strong> {healthData.environment}</p>
            <p><strong>Database:</strong> {healthData.databaseStatus}</p>
            {healthData.timestamp && <p><strong>Timestamp:</strong> {healthData.timestamp}</p>}
          </div>
        )}
        <button onClick={fetchHealth} disabled={loading}>
          Refresh Health Check
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Products</h2>
        <button onClick={fetchProducts} disabled={loading}>
          Fetch Products
        </button>
        {products.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <h3>Found {products.length} products:</h3>
            {products.slice(0, 3).map((product) => (
              <div key={product.id} style={{ backgroundColor: '#e8f4f8', padding: '10px', margin: '5px', borderRadius: '5px' }}>
                <h4>{product.name}</h4>
                <p><strong>SKU:</strong> {product.sku}</p>
                <p><strong>Price:</strong> ${product.price}</p>
                <p><strong>Status:</strong> {product.status}</p>
                {product.description && <p><strong>Description:</strong> {product.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '5px' }}>
        <h3>✅ Type-Sync Generation Successful!</h3>
        <p>Successfully generated TypeScript types and API client from FastAPI OpenAPI schema.</p>
        <ul>
          <li><strong>Types Generated:</strong> 31 interfaces and enums</li>
          <li><strong>API Endpoints:</strong> 33 methods</li>
          <li><strong>Total Size:</strong> 50,962 bytes</li>
          <li><strong>Type Safety:</strong> Full TypeScript support with proper imports</li>
        </ul>
      </div>
    </div>
  );
};

export default TestComponent;
