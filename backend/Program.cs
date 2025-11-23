using Microsoft.EntityFrameworkCore;
using Kasastok.Infrastructure;
using Kasastok.Domain;
using Swashbuckle.AspNetCore.SwaggerGen;

var builder = WebApplication.CreateBuilder(args);

// Swagger (.NET 8 uyumlu)
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

// PRODUCT CRUD
app.MapGet("/api/products", async (KasastokContext db) =>
    await db.Products.ToListAsync());

app.MapPost("/api/products", async (Product product, KasastokContext db) =>
{
    product.Id = Guid.NewGuid();
    db.Products.Add(product);
    await db.SaveChangesAsync();
    return product;
});

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

app.MapDelete("/api/products/{id}", async (Guid id, KasastokContext db) =>
{
    var product = await db.Products.FindAsync(id);
    if (product is null) return Results.NotFound();

    db.Products.Remove(product);
    await db.SaveChangesAsync();
    return Results.Ok();
});

app.Run();
