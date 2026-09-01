/**
 * Apex controller supporting the stockReport LWC.
 * Provides read-only SOQL access to Product2 records and their related
 * Stock_Batch__c records (lot / expiration / quantity information).
 */
public with sharing class StockReportController {
    private static final Integer MAX_RESULTS = 200;

    /**
     * Returns the list of active products, optionally filtered by a search
     * term matched against the product name or product code, along with the
     * aggregated stock quantity and the nearest expiration date for each one.
     *
     * @param searchTerm free text typed by the user in the search box
     * @return list of ProductSummary records ordered by product name
     */
    @AuraEnabled(cacheable=true)
    public static List<ProductSummary> getProducts(String searchTerm) {
        String term = searchTerm == null ? '' : searchTerm.trim();
        String likeTerm = '%' + term + '%';

        List<Product2> products = [
            SELECT Id, Name, ProductCode, Description
            FROM Product2
            WHERE IsActive = true
                AND (Name LIKE :likeTerm OR ProductCode LIKE :likeTerm)
            ORDER BY Name ASC
            LIMIT :MAX_RESULTS
        ];

        Map<Id, ProductSummary> summariesByProductId = new Map<Id, ProductSummary>();
        for (Product2 product : products) {
            summariesByProductId.put(product.Id, new ProductSummary(product));
        }

        if (summariesByProductId.isEmpty()) {
            return new List<ProductSummary>();
        }

        for (AggregateResult result : [
            SELECT Product__c prod, SUM(Quantity__c) totalQty, MIN(Expiration_Date__c) nextExp
            FROM Stock_Batch__c
            WHERE Product__c IN :summariesByProductId.keySet()
            GROUP BY Product__c
        ]) {
            Id productId = (Id) result.get('prod');
            ProductSummary summary = summariesByProductId.get(productId);
            if (summary != null) {
                Decimal totalQty = (Decimal) result.get('totalQty');
                summary.totalQuantity = totalQty == null ? 0 : totalQty;
                summary.nextExpirationDate = (Date) result.get('nextExp');
            }
        }

        return summariesByProductId.values();
    }

    /**
     * Returns the stock batches (lot, expiration date, quantity) for a
     * given product, ordered by the closest expiration date first.
     *
     * @param productId Id of the Product2 record
     * @return list of StockBatch records
     */
    @AuraEnabled(cacheable=true)
    public static List<StockBatch> getStockBatches(Id productId) {
        List<StockBatch> batches = new List<StockBatch>();
        if (productId == null) {
            return batches;
        }

        for (Stock_Batch__c record : [
            SELECT Id, Lot_Number__c, Expiration_Date__c, Quantity__c
            FROM Stock_Batch__c
            WHERE Product__c = :productId
            ORDER BY Expiration_Date__c ASC
        ]) {
            batches.add(new StockBatch(record));
        }

        return batches;
    }

    /**
     * Returns the historical stock quantity for a product grouped by month,
     * used to render a simple SLDS-only trend visualization (no charting
     * libraries required).
     *
     * @param productId Id of the Product2 record
     * @return list of TrendPoint records ordered chronologically
     */
    @AuraEnabled(cacheable=true)
    public static List<TrendPoint> getStockTrend(Id productId) {
        List<TrendPoint> trend = new List<TrendPoint>();
        if (productId == null) {
            return trend;
        }

        for (AggregateResult result : [
            SELECT CALENDAR_YEAR(Expiration_Date__c) yr, CALENDAR_MONTH(Expiration_Date__c) mo, SUM(Quantity__c) totalQty
            FROM Stock_Batch__c
            WHERE Product__c = :productId
            GROUP BY CALENDAR_YEAR(Expiration_Date__c), CALENDAR_MONTH(Expiration_Date__c)
            ORDER BY CALENDAR_YEAR(Expiration_Date__c), CALENDAR_MONTH(Expiration_Date__c)
        ]) {
            Integer year = (Integer) result.get('yr');
            Integer month = (Integer) result.get('mo');
            Decimal totalQty = (Decimal) result.get('totalQty');
            trend.add(new TrendPoint(year, month, totalQty == null ? 0 : totalQty));
        }

        return trend;
    }

    public class ProductSummary {
        @AuraEnabled
        public Id productId;
        @AuraEnabled
        public String name;
        @AuraEnabled
        public String productCode;
        @AuraEnabled
        public String description;
        @AuraEnabled
        public Decimal totalQuantity;
        @AuraEnabled
        public Date nextExpirationDate;

        public ProductSummary(Product2 product) {
            this.productId = product.Id;
            this.name = product.Name;
            this.productCode = product.ProductCode;
            this.description = product.Description;
            this.totalQuantity = 0;
            this.nextExpirationDate = null;
        }
    }

    public class StockBatch {
        @AuraEnabled
        public Id batchId;
        @AuraEnabled
        public String lotNumber;
        @AuraEnabled
        public Date expirationDate;
        @AuraEnabled
        public Decimal quantity;

        public StockBatch(Stock_Batch__c record) {
            this.batchId = record.Id;
            this.lotNumber = record.Lot_Number__c;
            this.expirationDate = record.Expiration_Date__c;
            this.quantity = record.Quantity__c;
        }
    }

    public class TrendPoint {
        @AuraEnabled
        public String label;
        @AuraEnabled
        public Decimal quantity;

        public TrendPoint(Integer year, Integer month, Decimal quantity) {
            this.label = String.valueOf(month) + '/' + String.valueOf(year);
            this.quantity = quantity;
        }
    }
}
