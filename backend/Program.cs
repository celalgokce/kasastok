using Microsoft.EntityFrameworkCore;
using Kasastok.Infrastructure;
using Kasastok.Domain;
using Kasastok.DTOs;

var builder = WebApplication.CreateBuilder(args);

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

app.Run();