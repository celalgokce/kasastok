using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using Kasastok.Infrastructure;
using Kasastok.Domain;
using Kasastok.DTOs;
using Kasastok.Services;

var builder = WebApplication.CreateBuilder(args);

// Timezone offset for Turkey (UTC+3)
const int timezoneOffsetHours = 3;

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: 'Bearer {token}'",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// DbContext
builder.Services.AddDbContext<KasastokContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// Services
builder.Services.AddSingleton<IJwtService, JwtService>();
builder.Services.AddSingleton<IPasswordService, PasswordService>();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:SecretKey"] ?? "KasastokSuperSecretKey2024ForJWTAuthentication!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "Kasastok",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "KasastokUsers",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(policy =>
    policy.AddPolicy("all", builder =>
        builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()
    )
);

var app = builder.Build();

// Ensure database is created and seed admin user
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<KasastokContext>();
    var passwordService = scope.ServiceProvider.GetRequiredService<IPasswordService>();
    
    db.Database.EnsureCreated();
    
    // Seed admin user if not exists
    if (!await db.Users.AnyAsync())
    {
        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "admin",
            PasswordHash = passwordService.HashPassword("admin123"),
            FullName = "Sistem Yöneticisi",
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(adminUser);
        await db.SaveChangesAsync();
        Console.WriteLine("✅ Admin kullanıcı oluşturuldu: admin / admin123");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("all");
app.UseAuthentication();
app.UseAuthorization();

// ==========================================
// AUTH ENDPOINTS
// ==========================================

// Login
app.MapPost("/api/auth/login", async (LoginRequest request, KasastokContext db, IJwtService jwtService, IPasswordService passwordService) =>
{
    if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        return Results.BadRequest(new { message = "Kullanıcı adı ve şifre gereklidir" });

    var user = await db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
    
    if (user == null || !passwordService.VerifyPassword(request.Password, user.PasswordHash))
        return Results.Unauthorized();

    if (!user.IsActive)
        return Results.BadRequest(new { message = "Hesabınız devre dışı bırakılmış" });

    // Update last login
    user.LastLoginAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    var token = jwtService.GenerateToken(user);
    var expiresAt = DateTime.UtcNow.AddHours(24);

    return Results.Ok(new LoginResponse
    {
        Token = token,
        ExpiresAt = expiresAt,
        User = new UserDto
        {
            Id = user.Id,
            Username = user.Username,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        }
    });
});

// Get current user
app.MapGet("/api/auth/me", async (HttpContext httpContext, KasastokContext db) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                   ?? httpContext.User.FindFirst("sub")?.Value;
    
    if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var user = await db.Users.FindAsync(userId);
    if (user == null)
        return Results.NotFound();

    return Results.Ok(new UserDto
    {
        Id = user.Id,
        Username = user.Username,
        FullName = user.FullName,
        Role = user.Role.ToString(),
        IsActive = user.IsActive,
        CreatedAt = user.CreatedAt,
        LastLoginAt = user.LastLoginAt
    });
}).RequireAuthorization();

// Change password
app.MapPost("/api/auth/change-password", async (ChangePasswordRequest request, HttpContext httpContext, KasastokContext db, IPasswordService passwordService) =>
{
    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                   ?? httpContext.User.FindFirst("sub")?.Value;
    
    if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var user = await db.Users.FindAsync(userId);
    if (user == null)
        return Results.NotFound();

    if (!passwordService.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        return Results.BadRequest(new { message = "Mevcut şifre yanlış" });

    user.PasswordHash = passwordService.HashPassword(request.NewPassword);
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "Şifre başarıyla değiştirildi" });
}).RequireAuthorization();

// ==========================================
// USER MANAGEMENT ENDPOINTS (Admin only)
// ==========================================

// Get all users
app.MapGet("/api/users", async (HttpContext httpContext, KasastokContext db) =>
{
    var roleClaim = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
    if (roleClaim != "Admin")
        return Results.Forbid();

    var users = await db.Users
        .OrderBy(u => u.Username)
        .Select(u => new UserDto
        {
            Id = u.Id,
            Username = u.Username,
            FullName = u.FullName,
            Role = u.Role.ToString(),
            IsActive = u.IsActive,
            CreatedAt = u.CreatedAt,
            LastLoginAt = u.LastLoginAt
        })
        .ToListAsync();

    return Results.Ok(users);
}).RequireAuthorization();

// Get user by id
app.MapGet("/api/users/{id}", async (Guid id, HttpContext httpContext, KasastokContext db) =>
{
    var roleClaim = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
    if (roleClaim != "Admin")
        return Results.Forbid();

    var user = await db.Users.FindAsync(id);
    if (user == null)
        return Results.NotFound();

    return Results.Ok(new UserDto
    {
        Id = user.Id,
        Username = user.Username,
        FullName = user.FullName,
        Role = user.Role.ToString(),
        IsActive = user.IsActive,
        CreatedAt = user.CreatedAt,
        LastLoginAt = user.LastLoginAt
    });
}).RequireAuthorization();

// Create user
app.MapPost("/api/users", async (RegisterRequest request, HttpContext httpContext, KasastokContext db, IPasswordService passwordService) =>
{
    var roleClaim = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
    if (roleClaim != "Admin")
        return Results.Forbid();

    if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        return Results.BadRequest(new { message = "Kullanıcı adı ve şifre gereklidir" });

    if (await db.Users.AnyAsync(u => u.Username == request.Username))
        return Results.BadRequest(new { message = "Bu kullanıcı adı zaten kullanılıyor" });

    var user = new User
    {
        Id = Guid.NewGuid(),
        Username = request.Username,
        PasswordHash = passwordService.HashPassword(request.Password),
        FullName = request.FullName,
        Role = (UserRole)request.Role,
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();

    return Results.Created($"/api/users/{user.Id}", new UserDto
    {
        Id = user.Id,
        Username = user.Username,
        FullName = user.FullName,
        Role = user.Role.ToString(),
        IsActive = user.IsActive,
        CreatedAt = user.CreatedAt,
        LastLoginAt = user.LastLoginAt
    });
}).RequireAuthorization();

// Update user
app.MapPut("/api/users/{id}", async (Guid id, UpdateUserRequest request, HttpContext httpContext, KasastokContext db, IPasswordService passwordService) =>
{
    var roleClaim = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
    if (roleClaim != "Admin")
        return Results.Forbid();

    var user = await db.Users.FindAsync(id);
    if (user == null)
        return Results.NotFound();

    if (!string.IsNullOrWhiteSpace(request.FullName))
        user.FullName = request.FullName;

    if (!string.IsNullOrWhiteSpace(request.Password))
        user.PasswordHash = passwordService.HashPassword(request.Password);

    if (request.Role.HasValue)
        user.Role = (UserRole)request.Role.Value;

    if (request.IsActive.HasValue)
        user.IsActive = request.IsActive.Value;

    await db.SaveChangesAsync();

    return Results.Ok(new UserDto
    {
        Id = user.Id,
        Username = user.Username,
        FullName = user.FullName,
        Role = user.Role.ToString(),
        IsActive = user.IsActive,
        CreatedAt = user.CreatedAt,
        LastLoginAt = user.LastLoginAt
    });
}).RequireAuthorization();

// Delete user
app.MapDelete("/api/users/{id}", async (Guid id, HttpContext httpContext, KasastokContext db) =>
{
    var roleClaim = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
    if (roleClaim != "Admin")
        return Results.Forbid();

    var userIdClaim = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                   ?? httpContext.User.FindFirst("sub")?.Value;
    
    if (userIdClaim == id.ToString())
        return Results.BadRequest(new { message = "Kendinizi silemezsiniz" });

    var user = await db.Users.FindAsync(id);
    if (user == null)
        return Results.NotFound();

    db.Users.Remove(user);
    await db.SaveChangesAsync();

    return Results.NoContent();
}).RequireAuthorization();

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
// SALES / POS ENDPOINTS
// ==========================================

// Satış tamamla (POS)
app.MapPost("/api/sales/complete", async (CompleteSaleRequest request, KasastokContext db) =>
{
    if (request.Items == null || request.Items.Count == 0)
        return Results.BadRequest(new { message = "Sepet boş olamaz" });

    using var transaction = await db.Database.BeginTransactionAsync();

    try
    {
        var sale = new Sale
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            PaymentType = (PaymentType)request.PaymentType,
            Notes = request.Notes,
            Items = new List<SaleItem>()
        };

        decimal totalAmount = 0;

        foreach (var item in request.Items)
        {
            var product = await db.Products.FindAsync(item.ProductId);
            if (product == null)
                return Results.BadRequest(new { message = $"Ürün bulunamadı: {item.ProductId}" });

            if (product.Stock < item.Quantity)
                return Results.BadRequest(new { message = $"Yetersiz stok: {product.Name}" });

            // Stok düş
            product.Stock -= item.Quantity;

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

            // Stok hareketi kaydet
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
        .Take(50)
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
            PaymentType = PaymentType.Cash,
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

    // Stok durumu
    var lowStockCount = await db.Products.CountAsync(p => p.Stock <= 5);
    var expiringCount = await db.Products.CountAsync(p => p.HasExpiration && p.ExpirationDate <= DateTime.UtcNow.AddDays(30));
    var totalStockValue = await db.Products.SumAsync(p => p.CostPrice * (decimal)p.Stock);

    return Results.Ok(new
    {
        today = new
        {
            salesCount = todaySalesCount,
            revenue = todayRevenue,
            profit = todayProfit,
            expenses = todayExpenses
        },
        month = new
        {
            salesCount = monthSalesCount,
            revenue = monthRevenue,
            profit = monthProfit,
            expenses = totalExpenses
        },
        cash = new
        {
            balance = cashBalance,
            totalIncome,
            totalExpenses
        },
        stock = new
        {
            lowStockCount,
            expiringCount,
            totalValue = totalStockValue
        }
    });
});

// En çok satılan ürünler
app.MapGet("/api/analytics/best-sellers", async (int days, KasastokContext db) =>
{
    var startDate = DateTime.UtcNow.AddDays(-days);

    // Önce verileri çek, sonra bellekte hesapla
    var saleItems = await db.SaleItems
        .Where(si => si.Sale!.CreatedAt >= startDate)
        .Select(si => new {
            si.ProductId,
            si.ProductName,
            si.Quantity,
            si.UnitPrice,
            si.CostPrice
        })
        .ToListAsync();

    var bestSellers = saleItems
        .GroupBy(si => new { si.ProductId, si.ProductName })
        .Select(g => new
        {
            productId = g.Key.ProductId,
            productName = g.Key.ProductName,
            totalQuantity = g.Sum(si => si.Quantity),
            totalRevenue = g.Sum(si => si.UnitPrice * (decimal)si.Quantity),
            totalProfit = g.Sum(si => (si.UnitPrice - si.CostPrice) * (decimal)si.Quantity)
        })
        .OrderByDescending(x => x.totalQuantity)
        .Take(10)
        .ToList();

    return Results.Ok(bestSellers);
});

// Satış trendi
app.MapGet("/api/analytics/sales-trend", async (int days, KasastokContext db) =>
{
    var startDate = DateTime.UtcNow.AddDays(-days);
    const int timezoneOffsetHours = 3;

    var sales = await db.Sales
        .Where(s => s.CreatedAt >= startDate)
        .Select(s => new {
            s.CreatedAt,
            s.Subtotal,
            Items = s.Items.Select(i => new { i.UnitPrice, i.CostPrice, i.Quantity })
        })
        .ToListAsync();

    var trend = sales
        .GroupBy(s => s.CreatedAt.AddHours(timezoneOffsetHours).Date)
        .Select(g => new
        {
            date = g.Key,
            salesCount = g.Count(),
            revenue = g.Sum(s => s.Subtotal),
            profit = g.SelectMany(s => s.Items).Sum(i => (i.UnitPrice - i.CostPrice) * (decimal)i.Quantity)
        })
        .OrderBy(x => x.date)
        .ToList();

    return Results.Ok(trend);
});

// Kategori bazlı satış dağılımı
app.MapGet("/api/analytics/category-breakdown", async (int days, KasastokContext db) =>
{
    var startDate = DateTime.UtcNow.AddDays(-days);

    var saleItems = await db.SaleItems
        .Where(si => si.Sale!.CreatedAt >= startDate)
        .Select(si => new {
            si.SaleId,
            si.Quantity,
            si.UnitPrice,
            si.CostPrice,
            Category = si.Product != null ? si.Product.Category : "Kategorisiz"
        })
        .ToListAsync();

    var breakdown = saleItems
        .GroupBy(si => si.Category ?? "Kategorisiz")
        .Select(g => new
        {
            category = g.Key,
            salesCount = g.Select(si => si.SaleId).Distinct().Count(),
            itemsSold = g.Sum(si => si.Quantity),
            totalRevenue = g.Sum(si => si.UnitPrice * (decimal)si.Quantity),
            totalProfit = g.Sum(si => (si.UnitPrice - si.CostPrice) * (decimal)si.Quantity)
        })
        .OrderByDescending(x => x.totalRevenue)
        .ToList();

    return Results.Ok(breakdown);
});

// Gelir-Gider trendi
app.MapGet("/api/analytics/cash-trend", async (int days, KasastokContext db) =>
{
    var startDate = DateTime.UtcNow.AddDays(-days);
    const int timezoneOffsetHours = 3;

    var ledgers = await db.CashLedgers
        .Where(c => c.CreatedAt >= startDate)
        .ToListAsync();

    var trend = ledgers
        .GroupBy(c => c.CreatedAt.AddHours(timezoneOffsetHours).Date)
        .Select(g => new
        {
            date = g.Key,
            income = g.Where(c => c.Type == TransactionType.Income).Sum(c => c.Amount),
            expense = g.Where(c => c.Type == TransactionType.Expense).Sum(c => c.Amount)
        })
        .OrderBy(x => x.date)
        .ToList();

    return Results.Ok(trend);
});

// Düşük stoklu ürünler
app.MapGet("/api/analytics/low-stock", async (int threshold, KasastokContext db) =>
{
    var lowStockProducts = await db.Products
        .Where(p => p.Stock <= threshold)
        .OrderBy(p => p.Stock)
        .Select(p => new
        {
            id = p.Id,
            name = p.Name,
            category = p.Category,
            stock = p.Stock,
            unit = p.Unit,
            costPrice = p.CostPrice,
            salePrice = p.SalePrice
        })
        .ToListAsync();

    return Results.Ok(lowStockProducts);
});

// SKT'si yaklaşan ürünler
app.MapGet("/api/analytics/expiring-products", async (int days, KasastokContext db) =>
{
    var expiryDate = DateTime.UtcNow.AddDays(days);

    var expiringProducts = await db.Products
        .Where(p => p.HasExpiration && p.ExpirationDate <= expiryDate)
        .OrderBy(p => p.ExpirationDate)
        .Select(p => new
        {
            id = p.Id,
            name = p.Name,
            category = p.Category,
            stock = p.Stock,
            expirationDate = p.ExpirationDate,
            daysUntilExpiry = (p.ExpirationDate!.Value - DateTime.UtcNow).Days
        })
        .ToListAsync();

    return Results.Ok(expiringProducts);
});

app.Run();
