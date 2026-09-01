import { LightningElement, wire } from 'lwc';
import getProducts from '@salesforce/apex/StockReportController.getProducts';
import getStockBatches from '@salesforce/apex/StockReportController.getStockBatches';
import getStockTrend from '@salesforce/apex/StockReportController.getStockTrend';

const LOW_STOCK_THRESHOLD = 50;
const EXPIRING_SOON_DAYS = 30;

const STATUS_OPTIONS = [
    { label: 'Todos', value: 'all' },
    { label: 'Stock bajo', value: 'low' },
    { label: 'Por vencer', value: 'expiring' }
];

export default class StockReport extends LightningElement {
    searchTerm = '';
    statusFilter = 'all';

    allProducts = [];
    error;

    selectedProductId;
    selectedProduct;
    stockBatches = [];
    trendPoints = [];
    isLoadingDetail = false;

    statusOptions = STATUS_OPTIONS;

    @wire(getProducts, { searchTerm: '$searchTerm' })
    wiredProducts({ data, error }) {
        if (data) {
            this.allProducts = data.map((product) => this.decorateProduct(product));
            this.error = undefined;

            if (this.selectedProductId) {
                this.selectedProduct = this.allProducts.find(
                    (product) => product.productId === this.selectedProductId
                );
            }
        } else if (error) {
            this.allProducts = [];
            this.error = this.reduceError(error);
        }
    }

    decorateProduct(product) {
        const totalQuantity = product.totalQuantity || 0;
        const isLowStock = totalQuantity <= LOW_STOCK_THRESHOLD;
        const isExpiringSoon = this.isDateWithinDays(product.nextExpirationDate, EXPIRING_SOON_DAYS);

        return {
            ...product,
            totalQuantity,
            isLowStock,
            isExpiringSoon,
            formattedNextExpirationDate: product.nextExpirationDate || null,
            badgeClass: isLowStock ? 'slds-badge slds-theme_warning' : 'slds-badge slds-theme_success',
            badgeLabel: isLowStock ? 'Stock bajo' : 'Stock OK'
        };
    }

    isDateWithinDays(dateString, days) {
        if (!dateString) {
            return false;
        }
        const target = new Date(dateString);
        const now = new Date();
        const diffDays = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= days;
    }

    get filteredProducts() {
        return this.allProducts.filter((product) => {
            if (this.statusFilter === 'low') {
                return product.isLowStock;
            }
            if (this.statusFilter === 'expiring') {
                return product.isExpiringSoon;
            }
            return true;
        });
    }

    get hasProducts() {
        return this.filteredProducts.length > 0;
    }

    get hasNoProducts() {
        return !this.hasProducts;
    }

    get hasSelectedProduct() {
        return !!this.selectedProduct;
    }

    get resultsCountLabel() {
        const count = this.filteredProducts.length;
        return count === 1 ? '1 producto encontrado' : `${count} productos encontrados`;
    }

    get stockRows() {
        return this.stockBatches.map((batch) => ({
            ...batch,
            isExpiringSoon: this.isDateWithinDays(batch.expirationDate, EXPIRING_SOON_DAYS),
            rowClass: this.isDateWithinDays(batch.expirationDate, EXPIRING_SOON_DAYS)
                ? 'slds-text-color_error'
                : ''
        }));
    }

    get trendBars() {
        const maxQuantity = this.trendPoints.reduce(
            (max, point) => Math.max(max, point.quantity || 0),
            0
        );
        return this.trendPoints.map((point) => ({
            ...point,
            barStyle: `height: ${maxQuantity > 0 ? (point.quantity / maxQuantity) * 100 : 0}%;`
        }));
    }

    get hasTrendData() {
        return this.trendPoints.length > 0;
    }

    handleSearchChange(event) {
        this.searchTerm = event.target.value;
    }

    handleStatusFilterChange(event) {
        this.statusFilter = event.detail.value;
    }

    handleSelectProduct(event) {
        const productId = event.currentTarget.dataset.id;
        this.selectProduct(productId);
    }

    selectProduct(productId) {
        this.selectedProductId = productId;
        this.selectedProduct = this.allProducts.find((product) => product.productId === productId);
        this.loadProductDetail(productId);
    }

    loadProductDetail(productId) {
        this.isLoadingDetail = true;
        Promise.all([getStockBatches({ productId }), getStockTrend({ productId })])
            .then(([batches, trend]) => {
                this.stockBatches = batches;
                this.trendPoints = trend;
                this.error = undefined;
            })
            .catch((error) => {
                this.stockBatches = [];
                this.trendPoints = [];
                this.error = this.reduceError(error);
            })
            .finally(() => {
                this.isLoadingDetail = false;
            });
    }

    reduceError(error) {
        if (Array.isArray(error.body)) {
            return error.body.map((e) => e.message).join(', ');
        }
        if (error.body && typeof error.body.message === 'string') {
            return error.body.message;
        }
        return error.message || 'Ocurrió un error inesperado.';
    }
}
