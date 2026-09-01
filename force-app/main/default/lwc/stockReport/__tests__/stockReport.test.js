import { createElement } from 'lwc';
import { registerApexTestWireAdapter } from '@salesforce/sfdx-lwc-jest';
import StockReport from 'c/stockReport';
import getProducts from '@salesforce/apex/StockReportController.getProducts';
import getStockBatches from '@salesforce/apex/StockReportController.getStockBatches';
import getStockTrend from '@salesforce/apex/StockReportController.getStockTrend';

jest.mock(
    '@salesforce/apex/StockReportController.getStockBatches',
    () => ({ default: jest.fn() }),
    { virtual: true }
);
jest.mock(
    '@salesforce/apex/StockReportController.getStockTrend',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

const mockGetProductsAdapter = registerApexTestWireAdapter(getProducts);

const PRODUCTS = [
    {
        productId: '001000000000001',
        name: 'ROFINA 500MG',
        productCode: 'ROF-500',
        description: 'Analgésico',
        totalQuantity: 150,
        nextExpirationDate: '2030-01-15'
    },
    {
        productId: '001000000000002',
        name: 'TORTU FORTE',
        productCode: 'TOR-100',
        description: 'Antiinflamatorio',
        totalQuantity: 10,
        nextExpirationDate: '2030-02-15'
    }
];

const STOCK_BATCHES = [
    { batchId: 'a01000000000001', lotNumber: 'L001', expirationDate: '2030-01-15', quantity: 100 },
    { batchId: 'a01000000000002', lotNumber: 'L002', expirationDate: '2030-02-15', quantity: 50 }
];

const TREND_POINTS = [
    { label: '1/2030', quantity: 100 },
    { label: '2/2030', quantity: 50 }
];

describe('c-stock-report', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('renders the list of products returned by the wire adapter', () => {
        const element = createElement('c-stock-report', { is: StockReport });
        document.body.appendChild(element);

        mockGetProductsAdapter.emit(PRODUCTS);

        return Promise.resolve().then(() => {
            const items = element.shadowRoot.querySelectorAll('.product-list-item');
            expect(items.length).toBe(2);
        });
    });

    it('shows the empty state when there are no products', () => {
        const element = createElement('c-stock-report', { is: StockReport });
        document.body.appendChild(element);

        mockGetProductsAdapter.emit([]);

        return Promise.resolve().then(() => {
            const emptyState = element.shadowRoot.querySelector('.slds-align_absolute-center');
            expect(emptyState).not.toBeNull();
            expect(emptyState.textContent).toBe('No se encontraron productos.');
        });
    });

    it('loads product detail, stock batches and trend when a product is selected', () => {
        getStockBatches.mockResolvedValue(STOCK_BATCHES);
        getStockTrend.mockResolvedValue(TREND_POINTS);

        const element = createElement('c-stock-report', { is: StockReport });
        document.body.appendChild(element);

        mockGetProductsAdapter.emit(PRODUCTS);

        return Promise.resolve()
            .then(() => {
                const firstItem = element.shadowRoot.querySelector('.product-list-item');
                firstItem.dispatchEvent(new CustomEvent('click', { bubbles: true }));
                return Promise.resolve();
            })
            .then(() => Promise.resolve())
            .then(() => {
                expect(getStockBatches).toHaveBeenCalledWith({ productId: '001000000000001' });
                expect(getStockTrend).toHaveBeenCalledWith({ productId: '001000000000001' });

                const rows = element.shadowRoot.querySelectorAll('table tbody tr');
                expect(rows.length).toBe(2);

                const cardTitle = element.shadowRoot.querySelector('.slds-card__header-title span');
                expect(cardTitle.textContent).toBe('ROFINA 500MG');
            });
    });

    it('filters products by the low stock status filter', () => {
        const element = createElement('c-stock-report', { is: StockReport });
        document.body.appendChild(element);

        mockGetProductsAdapter.emit(PRODUCTS);

        return Promise.resolve().then(() => {
            const combobox = element.shadowRoot.querySelector('lightning-combobox');
            combobox.dispatchEvent(new CustomEvent('change', { detail: { value: 'low' } }));

            return Promise.resolve().then(() => {
                const items = element.shadowRoot.querySelectorAll('.product-list-item');
                expect(items.length).toBe(1);
            });
        });
    });
});
