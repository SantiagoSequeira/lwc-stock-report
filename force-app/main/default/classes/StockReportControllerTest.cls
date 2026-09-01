@IsTest
private class StockReportControllerTest {
    @TestSetup
    static void setup() {
        Product2 rofina = new Product2(Name = 'ROFINA 500MG', ProductCode = 'ROF-500', IsActive = true);
        Product2 tortu = new Product2(Name = 'TORTU FORTE', ProductCode = 'TOR-100', IsActive = true);
        Product2 inactive = new Product2(Name = 'DISCONTINUED', ProductCode = 'OLD-001', IsActive = false);
        insert new List<Product2>{ rofina, tortu, inactive };

        insert new List<Stock_Batch__c>{
            new Stock_Batch__c(
                Product__c = rofina.Id,
                Lot_Number__c = 'L001',
                Expiration_Date__c = Date.today().addMonths(1),
                Quantity__c = 100
            ),
            new Stock_Batch__c(
                Product__c = rofina.Id,
                Lot_Number__c = 'L002',
                Expiration_Date__c = Date.today().addMonths(2),
                Quantity__c = 50
            ),
            new Stock_Batch__c(
                Product__c = tortu.Id,
                Lot_Number__c = 'L010',
                Expiration_Date__c = Date.today().addMonths(3),
                Quantity__c = 25
            )
        };
    }

    @IsTest
    static void testGetProductsNoFilter() {
        Test.startTest();
        List<StockReportController.ProductSummary> results = StockReportController.getProducts('');
        Test.stopTest();

        System.assertEquals(2, results.size(), 'Only active products should be returned');
    }

    @IsTest
    static void testGetProductsWithSearchTerm() {
        Test.startTest();
        List<StockReportController.ProductSummary> results = StockReportController.getProducts('ROFINA');
        Test.stopTest();

        System.assertEquals(1, results.size(), 'Only the matching product should be returned');
        System.assertEquals('ROFINA 500MG', results[0].name);
        System.assertEquals(150, results[0].totalQuantity, 'Total quantity should aggregate all batches');
        System.assertNotEquals(null, results[0].nextExpirationDate);
    }

    @IsTest
    static void testGetProductsExcludesInactive() {
        Test.startTest();
        List<StockReportController.ProductSummary> results = StockReportController.getProducts('DISCONTINUED');
        Test.stopTest();

        System.assertEquals(0, results.size(), 'Inactive products should never be returned');
    }

    @IsTest
    static void testGetStockBatches() {
        Product2 rofina = [SELECT Id FROM Product2 WHERE Name = 'ROFINA 500MG' LIMIT 1];

        Test.startTest();
        List<StockReportController.StockBatch> batches = StockReportController.getStockBatches(rofina.Id);
        Test.stopTest();

        System.assertEquals(2, batches.size());
        System.assertEquals('L001', batches[0].lotNumber, 'Batches should be ordered by expiration date ascending');
    }

    @IsTest
    static void testGetStockBatchesNullProduct() {
        Test.startTest();
        List<StockReportController.StockBatch> batches = StockReportController.getStockBatches(null);
        Test.stopTest();

        System.assertEquals(0, batches.size());
    }

    @IsTest
    static void testGetStockTrend() {
        Product2 rofina = [SELECT Id FROM Product2 WHERE Name = 'ROFINA 500MG' LIMIT 1];

        Test.startTest();
        List<StockReportController.TrendPoint> trend = StockReportController.getStockTrend(rofina.Id);
        Test.stopTest();

        System.assertEquals(2, trend.size(), 'One entry per month with stock batches');
    }

    @IsTest
    static void testGetStockTrendNullProduct() {
        Test.startTest();
        List<StockReportController.TrendPoint> trend = StockReportController.getStockTrend(null);
        Test.stopTest();

        System.assertEquals(0, trend.size());
    }
}
