using Microsoft.EntityFrameworkCore;
using Kasastok.Infrastructure;
using Kasastok.Domain;
using Kasastok.DTOs;

var builder = WebApplication.CreateBuilder(args);

// Timezone offset for Turkey (UTC+3)
const int timezoneOffsetHours = 3;

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DbContext
builder.Services.AddDbContext<KasastokContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// CORS
builder.Services.AddCors(policy =>
    policy.AddPolicy("all", builder =>
        builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()
    )
);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("all");

// ==========================================
// PRODUCT ENDPOINTS
// ==========================================

// Tüm ürünleri listele
app.MapGet("/api/products", async (KasastokContext db) =>
    await db.Products.ToListAsync());

// Barkod ile ürün ara (POS için)
app.MapGet("/api/products/search", async (string? barcode, KasastokContext db) =>
{
    if (string.IsNullOrWhiteSpace(barcode))
        return Results.BadRequest("Barcode is required");

    var product = await db.Products.FirstOrDefaultAsync(p => p.Barcode == barcode);
    
    if (product is null)
        return Results.NotFound(new { message = "Ürün bulunamadı" });

    return Results.Ok(product);
});

// Yeni ürün ekle
app.MapPost("/api/products", async (Product product, KasastokContext db) =>
{
    product.Id = Guid.NewGuid();
    db.Products.Add(product);

    // Eğer ürün stokla birlikte ekleniyorsa, kasadan gider olarak düş
    if (product.Stock > 0)
    {
        var totalCost = product.CostPrice * (decimal)product.Stock;
        var cashLedger = new CashLedger
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            Amount = totalCost,
            Type = TransactionType.Expense,
            Category = "Stok Alımı",
            PaymentType = PaymentType.Cash,
            Description = $"{product.Name} - {product.Stock} {product.Unit} ilk stok",
            Reference = product.Id.ToString()
        };
        db.CashLedgers.Add(cashLedger);
    }

    await db.SaveChangesAsync();
    return Results.Created($"/api/products/{product.Id}", product);
});

// Ürün güncelle
app.MapPut("/api/products/{id}", async (Guid id, Product input, KasastokContext db) =>
{
    var product = await db.Products.FindAsync(id);
    if (product is null) return Results.NotFound();

    product.Name = input.Name;
    product.Category = input.Category;
    product.Barcode = input.Barcode;
    product.CostPrice = input.CostPrice;
    product.SalePrice = input.SalePrice;
    product.Unit = input.Unit;
    product.Stock = input.Stock;
    product.HasExpiration = input.HasExpiration;
    product.ExpirationDate = input.ExpirationDate;

    await db.SaveChangesAsync();
    return Results.Ok(product);
});

// Ürün sil
app.MapDelete("/api/products/{id}", async (Guid id, KasastokContext db) =>
{
    var product = await db.Products.FindAsync(id);
    if (product is null) return Results.NotFound();

    db.Products.Remove(product);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// ==========================================
// SALE ENDPOINTS (POS)
// ==========================================

// Satış tamamla (POS)
app.MapPost("/api/sales/complete", async (CompleteSaleRequest request, KasastokContext db) =>
{
    if (request.Items == null || request.Items.Count == 0)
        return Results.BadRequest(new { message = "Sepet boş olamaz" });

    // Transaction başlat
    using var transaction = await db.Database.BeginTransactionAsync();
    
    try
    {
        var sale = new Sale
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            PaymentType = (PaymentType)request.PaymentType,
            Notes = request.Notes
        };

        decimal totalAmount = 0;

        // Her ürün için işlem yap
        foreach (var item in request.Items)
        {
            var product = await db.Products.FindAsync(item.ProductId);
            if (product == null)
                return Results.BadRequest(new { message = $"Ürün bulunamadı: {item.ProductId}" });

            // Stok kontrolü
            if (product.Stock < item.Quantity)
                return Results.BadRequest(new { message = $"{product.Name} için yetersiz stok" });

            // Stok düş
            product.Stock -= item.Quantity;

            // SaleItem oluştur
            var saleItem = new SaleItem
            {
                Id = Guid.NewGuid(),
                SaleId = sale.Id,
                ProductId = product.Id,
                ProductName = product.Name,
                Quantity = item.Quantity,
                UnitPrice = product.SalePrice,
                CostPrice = product.CostPrice
            };

            sale.Items.Add(saleItem);
            totalAmount += saleItem.Subtotal;

            // StockMovement oluştur
            var movement = new StockMovement
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                Quantity = item.Quantity,
                UnitPrice = product.SalePrice,
                Type = MovementType.Sale,
                CreatedAt = DateTime.UtcNow
            };

            db.StockMovements.Add(movement);
        }

        sale.Subtotal = totalAmount;
        db.Sales.Add(sale);

        // Kasa giriş kaydı oluştur (Satış geliri)
        var cashLedger = new CashLedger
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            Amount = totalAmount,
            Type = TransactionType.Income,
            Category = "Satış",
            PaymentType = (PaymentType)request.PaymentType,
            Description = $"Satış - {sale.Items.Count} ürün",
            Reference = sale.Id.ToString()
        };
        db.CashLedgers.Add(cashLedger);

        await db.SaveChangesAsync();
        await transaction.CommitAsync();

        // Satış detaylarıyla birlikte döndür
        var result = new
        {
            saleId = sale.Id,
            subtotal = sale.Subtotal,
            paymentType = sale.PaymentType.ToString(),
            items = sale.Items.Select(i => new
            {
                productName = i.ProductName,
                quantity = i.Quantity,
                unitPrice = i.UnitPrice,
                subtotal = i.Subtotal,
                profit = i.Profit
            }).ToList(),
            createdAt = sale.CreatedAt
        };

        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync();
        return Results.Problem($"Satış tamamlanamadı: {ex.Message}");
    }
});

// Satışları listele
app.MapGet("/api/sales", async (KasastokContext db) =>
{
    var sales = await db.Sales
        .Include(s => s.Items)
        .OrderByDescending(s => s.CreatedAt)
        .Take(50) // Son 50 satış
        .ToListAsync();

    return Results.Ok(sales);
});

// Satış detayı
app.MapGet("/api/sales/{id}", async (Guid id, KasastokContext db) =>
{
    var sale = await db.Sales
        .Include(s => s.Items)
        .FirstOrDefaultAsync(s => s.Id == id);

    if (sale == null)
        return Results.NotFound();

    return Results.Ok(sale);
});

// ==========================================
// STOCK MOVEMENT ENDPOINTS
// ==========================================

// Stok hareketi ekle (manuel)
app.MapPost("/api/stock-movements", async (StockMovement movement, KasastokContext db) =>
{
    var product = await db.Products.FindAsync(movement.ProductId);
    if (product == null) return Results.NotFound();

    if (movement.Type == MovementType.Sale)
        product.Stock -= movement.Quantity;
    else if (movement.Type == MovementType.Purchase)
        product.Stock += movement.Quantity;

    movement.Id = Guid.NewGuid();
    movement.CreatedAt = DateTime.UtcNow;
    db.StockMovements.Add(movement);

    // Eğer alım (Purchase) ise kasadan gider olarak düş
    if (movement.Type == MovementType.Purchase)
    {
        var totalCost = movement.UnitPrice * (decimal)movement.Quantity;
        var cashLedger = new CashLedger
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            Amount = totalCost,
            Type = TransactionType.Expense,
            Category = "Stok Alımı",
            PaymentType = PaymentType.Cash, // Varsayılan olarak nakit
            Description = $"{product.Name} - {movement.Quantity} {product.Unit} alım",
            Reference = movement.Id.ToString()
        };
        db.CashLedgers.Add(cashLedger);
    }

    await db.SaveChangesAsync();

    return Results.Created($"/api/stock-movements/{movement.Id}", movement);
});

// Stok hareketlerini listele
app.MapGet("/api/stock-movements", async (KasastokContext db) =>
{
    var movements = await db.StockMovements
        .Include(m => m.Product)
        .OrderByDescending(m => m.CreatedAt)
        .Take(100)
        .ToListAsync();

    return Results.Ok(movements);
});

// ==========================================
// CASH LEDGER ENDPOINTS
// ==========================================

// Kasa hareketlerini listele
app.MapGet("/api/cash-ledgers", async (KasastokContext db) =>
{
    var ledgers = await db.CashLedgers
        .OrderByDescending(c => c.CreatedAt)
        .Take(100)
        .ToListAsync();

    return Results.Ok(ledgers);
});

// Belirli tarih aralığında kasa hareketlerini getir
app.MapGet("/api/cash-ledgers/filter", async (DateTime? startDate, DateTime? endDate, KasastokContext db) =>
{
    var query = db.CashLedgers.AsQueryable();

    if (startDate.HasValue)
        query = query.Where(c => c.CreatedAt >= startDate.Value);

    if (endDate.HasValue)
        query = query.Where(c => c.CreatedAt <= endDate.Value);

    var ledgers = await query
        .OrderByDescending(c => c.CreatedAt)
        .ToListAsync();

    return Results.Ok(ledgers);
});

// Kasa hareketi ekle
app.MapPost("/api/cash-ledgers", async (CashLedger ledger, KasastokContext db) =>
{
    ledger.Id = Guid.NewGuid();
    ledger.CreatedAt = DateTime.UtcNow;
    db.CashLedgers.Add(ledger);
    await db.SaveChangesAsync();
    return Results.Created($"/api/cash-ledgers/{ledger.Id}", ledger);
});

// Kasa hareketi güncelle
app.MapPut("/api/cash-ledgers/{id}", async (Guid id, CashLedger input, KasastokContext db) =>
{
    var ledger = await db.CashLedgers.FindAsync(id);
    if (ledger is null) return Results.NotFound();

    ledger.Amount = input.Amount;
    ledger.Type = input.Type;
    ledger.Category = input.Category;
    ledger.PaymentType = input.PaymentType;
    ledger.Description = input.Description;
    ledger.Reference = input.Reference;

    await db.SaveChangesAsync();
    return Results.Ok(ledger);
});

// Kasa hareketi sil
app.MapDelete("/api/cash-ledgers/{id}", async (Guid id, KasastokContext db) =>
{
    var ledger = await db.CashLedgers.FindAsync(id);
    if (ledger is null) return Results.NotFound();

    db.CashLedgers.Remove(ledger);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// ==========================================
// DASHBOARD ANALYTICS ENDPOINTS
// ==========================================

// Dashboard metrikleri
app.MapGet("/api/analytics/dashboard", async (KasastokContext db) =>
{
    // Calculate "today" in local time, then convert to UTC range
    var localNow = DateTime.UtcNow.AddHours(timezoneOffsetHours);
    var today = new DateTime(localNow.Year, localNow.Month, localNow.Day, 0, 0, 0, DateTimeKind.Utc).AddHours(-timezoneOffsetHours);
    var tomorrow = today.AddDays(1);
    var thisMonth = new DateTime(localNow.Year, localNow.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddHours(-timezoneOffsetHours);

    // Bugünkü satışlar
    var todaySales = await db.Sales
        .Where(s => s.CreatedAt >= today && s.CreatedAt < tomorrow)
        .Include(s => s.Items)
        .ToListAsync();

    var todaySalesCount = todaySales.Count;
    var todayRevenue = todaySales.Sum(s => s.Subtotal);
    var todayProfit = todaySales.SelectMany(s => s.Items).Sum(i => i.Profit);

    // Aylık satışlar
    var monthSales = await db.Sales
        .Where(s => s.CreatedAt >= thisMonth)
        .Include(s => s.Items)
        .ToListAsync();

    var monthSalesCount = monthSales.Count;
    var monthRevenue = monthSales.Sum(s => s.Subtotal);
    var monthProfit = monthSales.SelectMany(s => s.Items).Sum(i => i.Profit);

    // Kasa bakiyesi (gelir - gider)
    var totalIncome = await db.CashLedgers
        .Where(c => c.Type == TransactionType.Income)
        .SumAsync(c => c.Amount);

    var totalExpenses = await db.CashLedgers
        .Where(c => c.Type == TransactionType.Expense)
        .SumAsync(c => c.Amount);

    var cashBalance = totalIncome - totalExpenses;

    // Bugünkü giderler
    var todayExpenses = await db.CashLedgers
        .Where(c => c.Type == TransactionType.Expense && c.CreatedAt >= today && c.CreatedAt < tomorrow)
        .SumAsync(c => c.Amount);

    // Aylık giderler
    var monthExpenses = await db.CashLedgers
        .Where(c => c.Type == TransactionType.Expense && c.CreatedAt >= thisMonth)
        .SumAsync(c => c.Amount);

    // Stok metrikleri
    var lowStockProducts = await db.Products
        .Where(p => p.Stock < 5)
        .CountAsync();

    var expiringProducts = await db.Products
        .Where(p => p.HasExpiration && p.ExpirationDate.HasValue &&
               p.ExpirationDate.Value <= localNow.AddDays(30))
        .CountAsync();

    var totalStockValue = await db.Products
        .SumAsync(p => p.Stock * p.CostPrice);

    return Results.Ok(new
    {
        today = new
        {
            salesCount = todaySalesCount,
            revenue = todayRevenue,
            expenses = todayExpenses,
            profit = todayProfit
        },
        month = new
        {
            salesCount = monthSalesCount,
            revenue = monthRevenue,
            expenses = monthExpenses,
            profit = monthProfit
        },
        cash = new
        {
            balance = cashBalance,
            totalIncome = totalIncome,
            totalExpenses = totalExpenses
        },
        stock = new
        {
            lowStockCount = lowStockProducts,
            expiringCount = expiringProducts,
            totalValue = totalStockValue
        }
    });
});

// ==========================================
// REPORTS ANALYTICS ENDPOINTS
// ==========================================

// En çok satan ürünler
app.MapGet("/api/analytics/best-sellers", async (int? days, KasastokContext db) =>
{
    var daysToCheck = days ?? 30;
    var startDate = DateTime.UtcNow.AddDays(-daysToCheck);

    var bestSellers = await db.SaleItems
        .Where(si => si.Sale.CreatedAt >= startDate)
        .GroupBy(si => new { si.ProductId, si.ProductName })
        .Select(g => new
        {
            productId = g.Key.ProductId,
            productName = g.Key.ProductName,
            totalQuantity = g.Sum(si => si.Quantity),
            totalRevenue = g.Sum(si => si.UnitPrice * (decimal)si.Quantity),
            totalProfit = g.Sum(si => (si.UnitPrice - si.CostPrice) * (decimal)si.Quantity),
            salesCount = g.Count()
        })
        .OrderByDescending(x => x.totalQuantity)
        .Take(10)
        .ToListAsync();

    return Results.Ok(bestSellers);
});

// Kategoriye göre satış dağılımı
app.MapGet("/api/analytics/category-breakdown", async (int? days, KasastokContext db) =>
{
    var daysToCheck = days ?? 30;
    var startDate = DateTime.UtcNow.AddDays(-daysToCheck);

    var categoryBreakdown = await db.SaleItems
        .Where(si => si.Sale.CreatedAt >= startDate)
        .Join(db.Products, si => si.ProductId, p => p.Id, (si, p) => new { SaleItem = si, Product = p })
        .GroupBy(x => x.Product.Category)
        .Select(g => new
        {
            category = g.Key,
            totalRevenue = g.Sum(x => x.SaleItem.UnitPrice * (decimal)x.SaleItem.Quantity),
            totalProfit = g.Sum(x => (x.SaleItem.UnitPrice - x.SaleItem.CostPrice) * (decimal)x.SaleItem.Quantity),
            itemsSold = g.Sum(x => x.SaleItem.Quantity),
            salesCount = g.Count()
        })
        .OrderByDescending(x => x.totalRevenue)
        .ToListAsync();

    return Results.Ok(categoryBreakdown);
});

// Günlük satış trendi (son 30 gün)
app.MapGet("/api/analytics/sales-trend", async (int? days, KasastokContext db) =>
{
    var daysToCheck = days ?? 30;
    var startDate = DateTime.UtcNow.Date.AddDays(-daysToCheck);

    var salesTrend = await db.Sales
        .Where(s => s.CreatedAt >= startDate)
        .Include(s => s.Items)
        .GroupBy(s => s.CreatedAt.Date)
        .Select(g => new
        {
            date = g.Key,
            salesCount = g.Count(),
            revenue = g.Sum(s => s.Subtotal),
            profit = g.SelectMany(s => s.Items).Sum(i => i.Profit)
        })
        .OrderBy(x => x.date)
        .ToListAsync();

    return Results.Ok(salesTrend);
});

// Gelir-Gider trendi
app.MapGet("/api/analytics/cash-trend", async (int? days, KasastokContext db) =>
{
    var daysToCheck = days ?? 30;
    var startDate = DateTime.UtcNow.Date.AddDays(-daysToCheck);

    var cashTrend = await db.CashLedgers
        .Where(c => c.CreatedAt >= startDate)
        .GroupBy(c => c.CreatedAt.Date)
        .Select(g => new
        {
            date = g.Key,
            income = g.Where(c => c.Type == TransactionType.Income).Sum(c => c.Amount),
            expense = g.Where(c => c.Type == TransactionType.Expense).Sum(c => c.Amount),
            balance = g.Where(c => c.Type == TransactionType.Income).Sum(c => c.Amount) -
                      g.Where(c => c.Type == TransactionType.Expense).Sum(c => c.Amount)
        })
        .OrderBy(x => x.date)
        .ToListAsync();

    return Results.Ok(cashTrend);
});

// Stok durumu özeti
app.MapGet("/api/analytics/stock-status", async (KasastokContext db) =>
{
    var localNow = DateTime.UtcNow.AddHours(timezoneOffsetHours);
    var today = new DateTime(localNow.Year, localNow.Month, localNow.Day, 0, 0, 0, DateTimeKind.Utc).AddHours(-timezoneOffsetHours);

    var stockStatus = new
    {
        lowStock = await db.Products.Where(p => p.Stock < 5).ToListAsync(),
        outOfStock = await db.Products.Where(p => p.Stock == 0).ToListAsync(),
        expiringSoon = await db.Products
            .Where(p => p.HasExpiration && p.ExpirationDate.HasValue &&
                   p.ExpirationDate.Value <= today.AddDays(30) &&
                   p.ExpirationDate.Value >= today)
            .OrderBy(p => p.ExpirationDate)
            .ToListAsync(),
        expired = await db.Products
            .Where(p => p.HasExpiration && p.ExpirationDate.HasValue &&
                   p.ExpirationDate.Value < today)
            .ToListAsync()
    };

    return Results.Ok(stockStatus);
});

app.Run();